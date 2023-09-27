import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createClientEntity } from '../converters';
import { DATA_ACCOUNT_ENTITY } from './account';

export async function fetchClients({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateClients(async (client) => {
    const {
      //the following properties are all security related and should be redacted
      client_secret,
      jwt_configuration,
      signing_keys,
      encryption_key,
      //the following properties contain objects with unknown data
      //deleting for security purposes, though it's possible they might be wanted later
      addons,
      client_metadata,
      mobile,
      native_social_login,
      ...rest
    } = client;

    const clientEntity = await jobState.addEntity(
      createClientEntity(rest, accountEntity.webLink!),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: clientEntity,
      }),
    );
  });
}

export const clientSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-clients',
    name: 'Fetch Clients',
    entities: [
      {
        resourceName: 'Auth0 Client',
        _type: 'auth0_client',
        _class: 'Application',
      },
    ],
    relationships: [
      {
        _type: 'auth0_account_has_client',
        _class: RelationshipClass.HAS,
        sourceType: 'auth0_account',
        targetType: 'auth0_client',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchClients,
  },
];
