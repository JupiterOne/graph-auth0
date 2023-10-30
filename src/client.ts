import { Client, ManagementClient } from 'auth0';

import { IntegrationConfig } from './config';
import { Auth0User, Auth0UsersIncludeTotal } from './types/users';
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

  public async recursiveUserIterateeProcessor(
    iteratee: ResourceIteratee<Auth0User>,
    depthLevel: number = 0,
    tailString: string = '',
    tooManyUsers: number = 1000, //never set this to less than 2 or infinite recursion occurs
    usersPerPage: number = 100, //defaults to 50, max is 100
  ) {
    // before starting, check for excessive recursion in case of error by code change
    // Since depthlevel 0 pulls 1000 users, and each recursion multiples that by 15,
    // depthlevel 3 can pull over 3 million users. Feel free to increase if needed.
    if (depthLevel > 3) {
      throw new Error(
        `Excessive recursion detected in client.ts, iterateUsers, recursiveUserIterateeProcessor, depthlevel=${depthLevel}`,
      );
    }
    //also, make sure that tooManyUsers > 1
    if (!(tooManyUsers > 1)) {
      throw new Error(
        `Function param tooManyUsers set too low, in client.ts, iterateUsers, recursiveUserIterateeProcessor, tooManyUsers=${tooManyUsers}`,
      );
    }

    //depthLevel should be the number of characters on the tail
    //in other words, tail string should be depthLevel characters long
    const tails: string[] = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      //'f', //apparently, 'f' is not a legitimate character in hex-code userids
    ];
    //will a query at the current depth level return 1000 users? If so, we need recursion
    const queryString = 'user_id:auth0|*' + tailString;
    const params = {
      per_page: usersPerPage,
      page: 0,
      q: queryString,
      include_totals: true,
    };

    // @HACK: typings mismatch the actual response
    const {
      data: reply,
      status,
      statusText,
    } = (await this.managementClient.users.getAll(
      params,
    )) as unknown as Auth0UsersIncludeTotal;
    this.logger.info({
      step: 'fetch-users-inside-if',
      status,
      statusText,
      'reply.start': reply.start,
      'reply.limit': reply.limit,
      'reply.length': reply.length,
      'reply.total': reply.total,
    });

    const total = reply.total;

    if (total < tooManyUsers) {
      // execute what you got and then go get the rest of the pages
      for (const user of reply.users) {
        await iteratee(user);
      }
      let pageNum = 1;
      let leftToGet = total - reply.length;
      while (leftToGet > 0) {
        const localParams = {
          per_page: usersPerPage,
          page: pageNum,
          q: queryString,
          include_totals: true,
        };
        const {
          data: response,
          status,
          statusText,
        } = (await this.managementClient.users.getAll(
          localParams,
        )) as unknown as Auth0UsersIncludeTotal;
        this.logger.info({
          step: 'fetch-users-inside-while',
          status,
          statusText,
          'reply.start': reply.start,
          'reply.limit': reply.limit,
          'reply.length': reply.length,
          'reply.total': reply.total,
        });
        for (const user of response.users) {
          await iteratee(user);
        }
        leftToGet = leftToGet - response.length;
        pageNum = pageNum + 1;
      }
    } else {
      // recurse
      for (const tail in tails) {
        const fulltail: string = tails[tail].concat(tailString);
        await this.recursiveUserIterateeProcessor(
          iteratee,
          depthLevel + 1,
          fulltail,
        );
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
