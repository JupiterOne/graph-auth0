const ManagementClient = require('auth0').ManagementClient;
import jwtDecode from 'jwt-decode';

import {
  IntegrationProviderAuthenticationError,
  IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from './config';
import { Auth0ManagementClient } from './types/managementClient';
import { Auth0User, Auth0UsersIncludeTotal } from './types/users';
import { Auth0Client, Auth0JwtPayload } from './types/clients';
import { getAcctWeblink } from './util/getAcctWeblink';

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
  managementClient: Auth0ManagementClient;
  //retrieves a token automatically and applies it to subsequent requests
  //token expiration is configured on the auth0 site; default is 24 hours
  constructor(readonly config: IntegrationConfig) {
    this.managementClient = new ManagementClient({
      domain: config.domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      audience: config.audience,
    });
  }

  public async verifyAuthentication(): Promise<void> {
    //lightweight authen check
    let token: string = '';
    try {
      token = await this.managementClient.getAccessToken();
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: this.config.domain,
        status: err.status,
        statusText: err.statusText,
      });
    }
    this.verifyScopes(jwtDecode<Auth0JwtPayload>(token)?.scope || '');
  }

  private verifyScopes(scopeString: string = '') {
    const missingScopes: string[] = [];
    if (!/read:users/.test(scopeString)) {
      missingScopes.push('read:users');
    }
    if (!/read:clients/.test(scopeString)) {
      missingScopes.push('read:clients');
    }
    if (missingScopes.length > 0) {
      throw new IntegrationProviderAuthenticationError({
        cause: undefined,
        endpoint: `${this.config.audience}clients`,
        status: 'Insufficient scope for token',
        statusText: `Required scopes ${missingScopes} not set. Set via the down arrow button on the right at ${getAcctWeblink(
          this.config.domain,
        )}applications/${this.config.clientId}/apis`,
      });
    }
  }

  /**
   * Iterates each user resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<Auth0User>,
  ): Promise<void> {
    //Auth0 sets the per_page max at 100 (default is 50)
    //Also, they set an absolute max of 1000 users from any given query
    //When we ask for .getUsers() in the management client, it is hitting the API
    //with an unfiltered query against /api/v2/users, and that returns a max of 1000
    //(10 pages of 100 users each). Even though we're only asking for a specific page
    //of 100 users in a given call of .getUsers(), the API is selecting a max of 1000
    //users to draw that result from, which could lead to inconsistent results if there
    //are more than 1000 users in the system

    //Therefore, if there are more than 1000 users to ingest, we'll have to filter the
    //searches somehow.
    //
    //The recursive routine below tries to pull all users. If that is
    //greater than 999, we assume that we're hitting the limit, so the routine starts
    //pulling users by the last character of their user_id field (which can be 0-9 or a-d).
    //
    //If any of those still has greater than 999 users, it recurses again, subdividing the
    //group by the last 2 letters of the user_id field. In this way, it subdivides by a
    //factor of 16.
    //
    //The subdividing happens based on the last character of user_id because this is the
    //character that changes the most in a large batch of users, and is statistically
    //likely to form a fairly balanced subdivision.

    //We can filter on any user attribute. The specific best choice probably depends on
    //the use case. Filter query documentation is here:
    //https://auth0.com/docs/users/user-search/user-search-query-syntax
    // Client params syntax is here:
    //https://auth0.github.io/node-auth0/module-management.ManagementClient.html#getUsers

    await this.recursiveUserIterateeProcessor(iteratee);
  }

  /**
   * Iterates each client (ie. Application) resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateClients(
    iteratee: ResourceIteratee<Auth0Client>,
  ): Promise<void> {
    //see Users comments for API limitations, though they are unlikely to be a problem here
    let appCount: number = 1;
    let pageNum: number = 0;

    let clients: Auth0Client[];

    while (appCount > 0) {
      const params = {
        per_page: 100,
        page: pageNum,
      };

      try {
        clients = await this.managementClient.getClients(params);
      } catch (err) {
        throw new IntegrationProviderAPIError({
          endpoint: '[getClients]: ' + err?.requestInfo?.url,
          status: err?.statusCode,
          statusText: err?.message,
        });
      }

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
    //before starting, check for excessive recursion in case of error by code change
    //Since depthlevel 0 pulls 1000 users, and each recursion multiples that by 15,
    //depthlevel 3 can pull over 3 million users. Feel free to increase if needed.
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
    let reply: Auth0UsersIncludeTotal;
    try {
      reply = await this.managementClient.getUsers(params);
    } catch (err) {
      throw new IntegrationProviderAPIError({
        endpoint: '[getUsers]: ' + err?.requestInfo?.url,
        status: err?.statusCode,
        statusText: err?.message,
      });
    }
    const total = reply.total;
    if (total < tooManyUsers) {
      //execute what you got and then go get the rest of the pages
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
        const response: Auth0UsersIncludeTotal =
          await this.managementClient.getUsers(localParams);
        for (const user of response.users) {
          await iteratee(user);
        }
        leftToGet = leftToGet - response.length;
        pageNum = pageNum + 1;
      }
    } else {
      //recurse
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

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}
