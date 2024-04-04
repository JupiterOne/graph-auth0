import { RelationshipClass } from '@jupiterone/integration-sdk-core';
export const DATA_ACCOUNT_ENTITY = 'DATA_ACCOUNT_ENTITY';
export const ACCOUNT_ENTITY_TYPE = 'auth0_account';
export const Steps = {
  CLIENTS: 'fetch-clients',
  ACCOUNTS: 'fetch-account',
  USERS: 'fetch-users',
  ROLES: 'fetch-roles',
  BUILD_ROLE_RELATIONSHIPS: 'build-role-relationships',
  SERVERS: 'fetch-servers',
};

export const Auth0Entities = {
  AUTH0_CLIENT: {
    resourceName: 'Auth0 Client',
    _type: 'auth0_client',
    _class: 'Application',
  },
  AUTH0_ACCOUNT: {
    resourceName: 'Auth0 Account',
    _type: ACCOUNT_ENTITY_TYPE,
    _class: 'Account',
  },
  AUTH0_USER: {
    resourceName: 'Auth0 User',
    _type: 'auth0_user',
    _class: 'User',
  },
  AUTH0_ROLES: {
    disableClassMatch: true,
    resourceName: 'Auth0 Role',
    _type: 'auth0_role',
    _class: 'AccessRole',
  },
  AUTH0_SERVER: {
    resourceName: 'Auth0 Server',
    _type: 'auth0_server',
    _class: ['Host', 'Gateway'],
  },
};

export const Auth0Relationships = {
  ACCOUNT_HAS_CLIENT: {
    _type: 'auth0_account_has_client',
    _class: RelationshipClass.HAS,
    sourceType: 'auth0_account',
    targetType: 'auth0_client',
  },
  ACCOUNT_HAS_USER: {
    _type: 'auth0_account_has_user',
    _class: RelationshipClass.HAS,
    sourceType: 'auth0_account',
    targetType: 'auth0_user',
  },
  USER_ASSIGNED_ROLE: {
    _type: 'auth0_user_assigned_role',
    _class: RelationshipClass.ASSIGNED,
    sourceType: 'auth0_user',
    targetType: 'auth0_role',
  },
  ROLE_PROTECTS_SERVER: {
    _type: 'auth0_role_protects_server',
    _class: RelationshipClass.PROTECTS,
    sourceType: 'auth0_role',
    targetType: 'auth0_server',
  },
};
