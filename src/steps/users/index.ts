import {
  createDirectRelationship,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../../client';
import { IntegrationConfig } from '../../config';
import { createUserEntity } from './converter';
import { DATA_ACCOUNT_ENTITY } from '../account';
import { Entities, IntegrationSteps, Relationships } from '../constants';

export async function fetchUsers({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;

  await apiClient.iterateUsers(async (user) => {
    //unspecified content fields to delete for safety
    delete user.user_metadata;
    delete user.app_metadata;

    const userEntity = await jobState.addEntity(
      createUserEntity(user, accountEntity.webLink!),
    );

    if (accountEntity && userEntity) {
      await jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: userEntity,
        }),
      );
    }
  });
}

export const userSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: IntegrationSteps.USERS,
    name: 'Fetch Users',
    entities: [Entities.USER],
    relationships: [Relationships.ACCOUNT_HAS_USER],
    dependsOn: [IntegrationSteps.ACCOUNT],
    executionHandler: fetchUsers,
  },
];
