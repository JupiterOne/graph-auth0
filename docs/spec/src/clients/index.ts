import { RelationshipClass, StepSpec } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../../../src/config';

export const clientSpec: StepSpec<IntegrationConfig>[] = [
  {
    /**
     * ENDPOINT: https://{DOMAIN}.{REGION}.auth0.com/api/v2/clients
     * PATTERN: Fetch Entities
     */
    id: 'fetch-clients',
    name: 'Fetch Clients',
    entities: [
      {
        resourceName: 'Client',
        _type: 'auth0_client',
        _class: ['Application'],
      },
    ],
    relationships: [
      {
        _type: 'auth0_account_has_client',
        sourceType: 'auth0_account',
        _class: RelationshipClass.HAS,
        targetType: 'auth0_client',
      },
    ],
    dependsOn: ['fetch-account'],
    implemented: true,
  },
];
