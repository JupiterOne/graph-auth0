import { RelationshipClass, StepSpec } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../../../src/config';

export const userSpec: StepSpec<IntegrationConfig>[] = [
  {
    /**
     * ENDPOINT: https://{DOMAIN}.{REGION}.auth0.com/api/v2/users
     * PATTERN: Fetch Entities
     */
    id: 'fetch-users',
    name: 'Fetch Users',
    entities: [
      {
        resourceName: 'User',
        _type: 'auth0_user',
        _class: ['User'],
      },
    ],
    relationships: [
      {
        _type: 'auth0_account_has_user',
        sourceType: 'auth0_account',
        _class: RelationshipClass.HAS,
        targetType: 'auth0_user',
      },
    ],
    dependsOn: ['fetch-account'],
    implemented: true,
  },
];
