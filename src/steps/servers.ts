import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';
import { createAPIClient } from '../client';
import {
  Auth0Entities,
  DATA_ACCOUNT_ENTITY,
  Steps,
} from '../constants/constants';
import { createResourceServer } from '../converters';

export async function fetchServers({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;
  try {
    await apiClient.iterateServers(async (server) => {
      const serverEntity = createResourceServer(server, accountEntity.webLink!);
      await jobState.addEntity(serverEntity);
    });
  } catch (err) {
    if (err.status === 403) {
      logger.publishWarnEvent({
        name: IntegrationWarnEventName.MissingPermission,
        description: `Received authorization error when attempting to call ${err.endpoint}: ${err.statusText}. Please make sure your API key has enough privilegdes to perform this action.`,
      });
      return;
    }

    throw err;
  }
}

export const serverSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.SERVERS,
    name: 'Fetch Servers',
    entities: [Auth0Entities.AUTH0_SERVER],
    relationships: [],
    dependsOn: [Steps.ACCOUNTS],
    executionHandler: fetchServers,
  },
];
