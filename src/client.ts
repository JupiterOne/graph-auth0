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

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

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
        handleError: (err, attemptContext) => {
          const errorProps = {
            status: err.statusCode,
            statusText: err.error,
            endpoint: endpoint,
          };

          if (errorProps.status >= 400 && errorProps.status < 500) {
            attemptContext.abort();
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
    let appCount: number = 1;
    let pageNum: number = 0;
    while (appCount > 0) {
      const params = {
        per_page: 100,
        page: pageNum,
      };
      const { data } = await this.executeAPIRequestWithRetries(
        ' /api/v2/clients',
        (params) => this.managementClient.clients.getAll(params),
        params,
      );
      const clients = data as unknown as Array<Client>;
      appCount = clients.length;
      pageNum = pageNum + 1;
      for (const client of clients) {
        await iteratee(client);
      }
    }
  }

  public async iterateRoles(
    iteratee: ResourceIteratee<GetOrganizationMemberRoles200ResponseOneOfInner>,
  ): Promise<void> {
    let roleCount: number = 1;
    let pageNum: number = 0;
    while (roleCount > 0) {
      const params = {
        per_page: 100,
        page: pageNum,
      };
      const { data } = await this.executeAPIRequestWithRetries(
        ' /api/v2/roles',
        (params) => this.managementClient.roles.getAll(params),
        params,
      );
      const roles =
        data as unknown as Array<GetOrganizationMemberRoles200ResponseOneOfInner>;
      roleCount = roles.length;
      pageNum = pageNum + 1;
      for (const role of roles) {
        await iteratee(role);
      }
    }
  }

  public async iterateRoleUsers(
    roleId: string,
    iteratee: ResourceIteratee<GetMembers200ResponseOneOfInner>,
  ): Promise<void> {
    let userCount: number = 1;
    let pageNum: number = 0;
    while (userCount > 0) {
      const params = {
        per_page: 100,
        page: pageNum,
        id: roleId,
      };
      const { data } = await this.executeAPIRequestWithRetries(
        '/api/v2/role/users',
        (params) => this.managementClient.roles.getUsers(params),
        params,
      );
      const users = data as unknown as Array<GetMembers200ResponseOneOfInner>;
      userCount = users.length;
      pageNum = pageNum + 1;
      for (const user of users) {
        await iteratee(user);
      }
    }
  }

  public async iterateServers(
    iteratee: ResourceIteratee<ResourceServer>,
  ): Promise<void> {
    let resourceServerCount: number = 1;
    let pageNum: number = 0;
    while (resourceServerCount > 0) {
      const params = {
        per_page: 100,
        page: pageNum,
      };
      const { data } = await this.executeAPIRequestWithRetries(
        ' /api/v2/resource-servers',
        (params) => this.managementClient.resourceServers.getAll(params),
        params,
      );
      const resourceServers = data as unknown as Array<ResourceServer>;
      resourceServerCount = resourceServers.length;
      pageNum = pageNum + 1;
      for (const server of resourceServers) {
        await iteratee(server);
      }
    }
  }

  public async iterateRolePermissions(
    roleId: string,
    iteratee: ResourceIteratee<Permission>,
  ): Promise<void> {
    let permissionCount: number = 1;
    let pageNum: number = 0;
    while (permissionCount > 0) {
      const params = {
        per_page: 100,
        page: pageNum,
        id: roleId,
      };
      const { data } = await this.executeAPIRequestWithRetries(
        '/api/v2/role/permissions',
        (params) => this.managementClient.roles.getPermissions(params),
        params,
      );
      const permissions = data as unknown as Array<Permission>;
      permissionCount = permissions.length;
      pageNum = pageNum + 1;
      for (const permission of permissions) {
        await iteratee(permission);
      }
    }
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
