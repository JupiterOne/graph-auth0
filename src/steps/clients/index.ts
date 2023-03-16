import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../../client';
import { IntegrationConfig } from '../../config';
import { createClientEntity } from './converter';
import { DATA_ACCOUNT_ENTITY } from '../account';
import { Entities, IntegrationSteps, Relationships } from '../constants';

export async function fetchClients({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateClients(async (client) => {
    //the following properties are all security related and should be redacted
    delete client.client_secret;
    delete client.jwt_configuration;
    delete client.signing_keys;
    delete client.encryption_key;
    //the following properties contain objects with unknown data
    //deleting for security purposes, though it's possible they might be wanted later
    delete client.addons;
    delete client.client_metadata;
    delete client.mobile;
    delete client.native_social_login;
    //see schema in types/clients.ts for more on what these fields mean

    const clientEntity = await jobState.addEntity(
      createClientEntity(client, accountEntity.webLink!),
    );

    if (accountEntity && clientEntity) {
      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: clientEntity,
        }),
      );
    }
  });
}

export const clientSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: IntegrationSteps.CLIENTS,
    name: 'Fetch Clients',
    entities: [Entities.CLIENT],
    relationships: [Relationships.ACCOUNT_HAS_CLIENT],
    dependsOn: [IntegrationSteps.ACCOUNT],
    executionHandler: fetchClients,
  },
];
