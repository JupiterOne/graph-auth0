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
  },
  USER: {
    resourceName: 'User',
    _type: 'auth0_user',
    _class: ['User'],
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
