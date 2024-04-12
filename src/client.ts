import {
  Client,
  GetMembers200ResponseOneOfInner,
  GetOrganizationMemberRoles200ResponseOneOfInner,
  ManagementClient,
  Permission,
  ResourceServer,
} from 'auth0';

import { IntegrationConfig } from './config';
import { Auth0User } from './types/users';
import {
  IntegrationLogger,
  IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';
import fetch from 'node-fetch';
import { retry } from '@lifeomic/attempt';
import { ApiResponse } from './types/clients';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;
const SLEEP_TIME = 10000;
const PER_PAGE = 100;
/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient {
  managementClient: ManagementClient;
  logger: IntegrationLogger;
  // retrieves a token automatically and applies it to subsequent requests
  // token expiration is configured on the auth0 site; default is 24 hours
  constructor(
    readonly config: IntegrationConfig,
    logger: IntegrationLogger,
  ) {
    this.managementClient = new ManagementClient({
      domain: config.domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      audience: config.audience,
      fetch: fetch,
    });
    this.logger = logger;
  }
  async testConnection() {
    await this.managementClient.users.getAll({
      per_page: 1,
      page: 1,
    });
  }
  /**
   * Iterates each user resource in the provider.
   * According to the docs you cant retrieve more that 1000 users using pagination
   * The solution inmplemented here, uses created_at field to paginate the responses by chunks
   * So that we hit the limit multiple times, but we reset the query
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<Auth0User>,
  ): Promise<void> {
    let seen = 0;
    let page = 0;
    let totalAmount = 0;
    let lastCreatedAt: string;
    const per_page = 100;
    const dateNow = new Date().toISOString();
    let query = `created_at:[${new Date(
      1900,
      1,
      1,
    ).toISOString()} TO ${dateNow}]`;
    do {
      totalAmount = 0;
      seen = 0;
      page = 0;
      do {
        const { data } = await this.executeAPIRequestWithRetries(
          'api/v2/users',
          () =>
            this.managementClient.users.getAll({
              include_totals: true,
              per_page: per_page,
              page: page++,
              q: query,
              sort: 'created_at:1',
            }),
        );
        totalAmount = data.total;
        seen += data.users.length;
        for (const user of data.users) {
          await iteratee(user);
        }
        if (!data || !data.users || data.users.length === 0) {
          return;
        }
        lastCreatedAt = new Date(
          data.users[data.length - 1].created_at as string,
        ).toISOString();
      } while (seen !== totalAmount);
      query = `created_at:[${lastCreatedAt} TO ${dateNow}]`;
    } while (totalAmount === 1000);
  }
  private sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  private executeAPIRequestWithRetries<T>(
    endpoint: string,
    requestFunc: (params) => Promise<T>,
    params?: any,
  ): Promise<T> {
    return retry(
      async () => {
        return await requestFunc(params);
      },
      {
        maxAttempts: 4,
        delay: 30_000,
        factor: 2,
        timeout: 180_000,
        handleError: async (err, attemptContext) => {
          const errorProps = {
            status: err.statusCode,
            statusText: err.error,
            endpoint: endpoint,
          };
          if (errorProps.status == 429) {
            this.logger.warn({ err }, '429 found.');
            // https://auth0.com/docs/troubleshoot/customer-support/operational-policies/rate-limit-policy
            // 10 seconds should be more than enough. We could also use the x-retry-after header
            await this.sleep(SLEEP_TIME);
            return;
          }
          if (errorProps.status >= 400 && errorProps.status < 500) {
            attemptContext.abort();
            this.logger.warn({ err }, 'Aborting wont retry.');
            throw new IntegrationProviderAPIError(errorProps);
          }
        },
      },
    );
  }
  /**
   * Iterates each client (ie. Application) resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateClients(
    iteratee: ResourceIteratee<Client>,
  ): Promise<void> {
    //see Users comments for API limitations, though they are unlikely to be a problem here
    await this.paginate({
      iteratee,
      url: '/api/v2/clients',
      requestFunc: (params) => this.managementClient.clients.getAll(params),
      params: {},
    });
  }

  public async iterateRoles(
    iteratee: ResourceIteratee<GetOrganizationMemberRoles200ResponseOneOfInner>,
  ): Promise<void> {
    await this.paginate({
      iteratee,
      url: '/api/v2/roles',
      requestFunc: (params) => this.managementClient.roles.getAll(params),
    });
  }

  public async iterateRoleUsers(
    roleId: string,
    iteratee: ResourceIteratee<GetMembers200ResponseOneOfInner>,
  ): Promise<void> {
    await this.paginateWithCheckpoint({
      iteratee,
      url: `/api/v2/role/${encodeURIComponent(roleId)}/users`,
      requestFunc: (params) => this.managementClient.roles.getUsers(params),
      params: { id: encodeURIComponent(roleId) },
      entityName: 'users',
    });
  }

  public async iterateServers(
    iteratee: ResourceIteratee<ResourceServer>,
  ): Promise<void> {
    await this.paginate({
      iteratee,
      url: '/api/v2/resource-servers',
      requestFunc: (params) =>
        this.managementClient.resourceServers.getAll(params),
    });
  }

  public async iterateRolePermissions(
    roleId: string,
    iteratee: ResourceIteratee<Permission>,
  ): Promise<void> {
    await this.paginate({
      iteratee,
      url: `/api/v2/role/${encodeURIComponent(roleId)}/permissions`,
      requestFunc: (params) =>
        this.managementClient.roles.getPermissions(params),
      params: { id: encodeURIComponent(roleId) },
    });
  }

  private async paginate<T, U>({
    iteratee,
    url,
    requestFunc,
    params,
  }: {
    iteratee: ResourceIteratee<T>;
    url: string;
    requestFunc: (params) => Promise<ApiResponse<U>>;
    params?: Record<string, any>;
  }) {
    const processRequest = async (currentPage: number) => {
      const { data } = await this.executeAPIRequestWithRetries(
        url,
        requestFunc,
        {
          ...(params && { ...params }),
          per_page: PER_PAGE,
          page: currentPage,
        },
      );
      const items = data as unknown as Array<T>;
      for (const item of items) {
        await iteratee(item);
      }
      return items;
    };

    let response: T[];
    let currentPage = 0;
    do {
      response = await processRequest(currentPage);
      currentPage++;
    } while (response.length > 0);
  }

  private async paginateWithCheckpoint<T, U>({
    iteratee,
    url,
    requestFunc,
    params,
    entityName,
  }: {
    iteratee: ResourceIteratee<T>;
    url: string;
    requestFunc: (params) => Promise<ApiResponse<U>>;
    params?: Record<string, any>;
    entityName: string;
  }) {
    const processRequest = async (next: string | undefined) => {
      const { data } = await this.executeAPIRequestWithRetries(
        url,
        requestFunc,
        {
          ...(params && { ...params }),
          take: PER_PAGE,
          from: next,
        },
      );
      const items = data[entityName] as unknown as Array<T>;
      for (const item of items) {
        await iteratee(item);
      }
      return data;
    };

    let response: any;
    do {
      response = await processRequest(response?.next);
    } while (response?.next);
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
