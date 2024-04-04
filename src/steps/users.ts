import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../config';
import { createUserEntity } from '../converters';
import {
  Auth0Entities,
  Auth0Relationships,
  DATA_ACCOUNT_ENTITY,
  Steps,
} from '../constants/constants';

export async function fetchUsers({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;
  try {
    await apiClient.iterateUsers(async (user) => {
      //unspecified content fields to delete for safety
      delete user.user_metadata;
      delete user.app_metadata;

      const userEntity = createUserEntity(user, accountEntity.webLink!);
      if (!jobState.hasKey(userEntity._key)) {
        await jobState.addEntity(userEntity);

        await jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.HAS,
            from: accountEntity,
            to: userEntity,
          }),
        );
      }
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

export const userSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.USERS,
    name: 'Fetch Users',
    entities: [Auth0Entities.AUTH0_USER],
    relationships: [Auth0Relationships.ACCOUNT_HAS_USER],
    dependsOn: [Steps.ACCOUNTS],
    executionHandler: fetchUsers,
  },
];
