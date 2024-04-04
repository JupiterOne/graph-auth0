import {
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  IntegrationWarnEventName,
  RelationshipClass,
  createDirectRelationship,
} from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../config';
import { createAPIClient } from '../client';
import { createRoleEntity } from '../converters';
import {
  Auth0Entities,
  Auth0Relationships,
  DATA_ACCOUNT_ENTITY,
  Steps,
} from '../constants/constants';

export async function fetchRoles({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountEntity = (await jobState.getData(DATA_ACCOUNT_ENTITY)) as Entity;
  try {
    await apiClient.iterateRoles(async (role) => {
      const roleEntity = createRoleEntity(role, accountEntity.webLink!);
      await jobState.addEntity(roleEntity);
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

export async function buildRoleRelationships({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  try {
    await jobState.iterateEntities(
      { _type: Auth0Entities.AUTH0_ROLES._type },
      async (role) => {
        await apiClient.iterateRoleUsers(role._key, async (user) => {
          if (jobState.hasKey(user.user_id)) {
            await jobState.addRelationship(
              createDirectRelationship({
                fromKey: user.user_id,
                fromType: Auth0Entities.AUTH0_USER._type,
                toKey: role._key,
                toType: Auth0Entities.AUTH0_ROLES._type,
                _class: RelationshipClass.ASSIGNED,
              }),
            );
          }
        });
        await apiClient.iterateRolePermissions(
          role._key,
          async (permission) => {
            if (jobState.hasKey(permission.resource_server_identifier!)) {
              const relationship = createDirectRelationship({
                toKey: permission.resource_server_identifier!,
                toType: Auth0Entities.AUTH0_SERVER._type,
                fromKey: role._key,
                fromType: Auth0Entities.AUTH0_ROLES._type,
                _class: RelationshipClass.PROTECTS,
              });
              if (!jobState.hasKey(relationship._key)) {
                await jobState.addRelationship(relationship);
              }
            }
          },
        );
      },
    );
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

export const roleSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.ROLES,
    name: 'Fetch Roles',
    entities: [Auth0Entities.AUTH0_ROLES],
    relationships: [],
    dependsOn: [Steps.ACCOUNTS],
    executionHandler: fetchRoles,
  },
  {
    id: Steps.BUILD_ROLE_RELATIONSHIPS,
    name: 'Build Role Relationships',
    entities: [],
    relationships: [
      Auth0Relationships.USER_ASSIGNED_ROLE,
      Auth0Relationships.ROLE_PROTECTS_SERVER,
    ],
    dependsOn: [Steps.ROLES, Steps.USERS, Steps.SERVERS],
    executionHandler: buildRoleRelationships,
  },
];
