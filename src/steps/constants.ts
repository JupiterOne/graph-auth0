import {
  RelationshipClass,
  StepEntityMetadata,
  StepRelationshipMetadata,
} from '@jupiterone/integration-sdk-core';

export enum IntegrationSteps {
  ACCOUNT = 'fetch-account',
  CLIENTS = 'fetch-clients',
  USERS = 'fetch-users',
}

export const Entities: Record<
  'ACCOUNT' | 'CLIENT' | 'USER',
  StepEntityMetadata
> = {
  ACCOUNT: {
    resourceName: 'Account',
    _type: 'auth0_account',
    _class: ['Account'],
  },
  CLIENT: {
    resourceName: 'Client',
    _type: 'auth0_client',
    _class: ['Application'],
    schema: {
      properties: {
        name: { type: 'string' },
        webLink: { type: 'string' },
        clientId: { type: 'string' },
        tenant: { type: 'string' },
        description: { type: 'string' },
        global: { type: 'boolean' },
        appType: { type: 'string' },
        logoUri: { type: 'string' },
        isFirstParty: { type: 'boolean' },
        oidcConformant: { type: 'boolean' },
        callbacks: { type: 'array', items: { type: 'string' } },
        allowedOrigins: { type: 'array', items: { type: 'string' } },
        webOrigins: { type: 'array', items: { type: 'string' } },
        clientAliases: { type: 'array', items: { type: 'string' } },
        allowedClients: { type: 'array', items: { type: 'string' } },
        allowedLogoutUrls: { type: 'array', items: { type: 'string' } },
        grantTypes: { type: 'array', items: { type: 'string' } },
        sso: { type: 'boolean' },
        ssoDisabled: { type: 'boolean' },
        crossOriginAuth: { type: 'boolean' },
        crossOriginLoc: { type: 'string' },
        customLoginPageOn: { type: 'boolean' },
        customLoginPage: { type: 'string' },
        customLoginPagePreview: { type: 'string' },
        formTemplate: { type: 'string' },
        tokenEndpointAuthMethod: { type: 'string' },
        initiateLoginUri: { type: 'string' },
        organizationUsage: { type: 'string' },
        organizationRequireBehavior: { type: 'string' },
        tokenExpirationType: { type: 'string' },
        tokenTokenLifetime: { type: 'number' },
        tokenInfiniteTokenLifetime: { type: 'boolean' },
        tokenIdleTokenLifetime: { type: 'number' },
        tokenInfiniteIdleTokenLifetime: { type: 'boolean' },
      },
    },
  },
  USER: {
    resourceName: 'User',
    _type: 'auth0_user',
    _class: ['User'],
    schema: {
      properties: {
        name: { type: 'string' },
        username: { type: 'string' },
        active: { type: 'boolean' },
        nickname: { type: 'string' },
        email: { type: 'string' },
        webLink: { type: 'string' },
        userId: { type: 'string' },
        emailVerified: { type: 'boolean' },
        phoneNumber: { type: 'string' },
        phoneVerified: { type: 'boolean' },
        createdAt: { type: 'number' },
        updatedAt: { type: 'number' },
        identities: { type: 'string' },
        picture: { type: 'string' },
        multifactor: { type: 'array', items: { type: 'string' } },
        lastIp: { type: 'string' },
        lastLogin: { type: 'number' },
        loginsCount: { type: 'number' },
        blocked: { type: 'boolean' },
        givenName: { type: 'string' },
        familyName: { type: 'string' },
      },
      required: ['username', 'active'],
    },
  },
};

export const Relationships: Record<
  'ACCOUNT_HAS_CLIENT' | 'ACCOUNT_HAS_USER',
  StepRelationshipMetadata
> = {
  ACCOUNT_HAS_CLIENT: {
    _type: 'auth0_account_has_client',
    sourceType: 'auth0_account',
    _class: RelationshipClass.HAS,
    targetType: 'auth0_client',
  },
  ACCOUNT_HAS_USER: {
    _type: 'auth0_account_has_user',
    sourceType: 'auth0_account',
    _class: RelationshipClass.HAS,
    targetType: 'auth0_user',
  },
};
