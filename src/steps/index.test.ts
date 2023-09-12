import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import {
  createDirectRelationship,
  Entity,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { createUserEntity } from '../converters';
import { DATA_ACCOUNT_ENTITY } from './account';
import { IntegrationConfig } from '../config';
import { fetchUsers } from './users';
import { fetchAccountDetails } from './account';
import { integrationConfig } from '../../test/config';
import { fetchClients } from './clients';
import { setupAuth0Recording } from '../../test/recording';

const logger = {
  info: () => {
    // @noop
  },
};

let recording: Recording;

afterEach(async () => {
  await recording.stop();
});

test('should collect data', async () => {
  recording = setupAuth0Recording({
    directory: __dirname,
    name: 'steps',
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });

  // Simulates dependency graph execution.
  // See https://github.com/JupiterOne/sdk/issues/262.
  await fetchAccountDetails(context);
  await fetchUsers(context);
  await fetchClients(context);

  // Review snapshot, failure is a regression
  expect({
    numCollectedEntities: context.jobState.collectedEntities.length,
    numCollectedRelationships: context.jobState.collectedRelationships.length,
    collectedEntities: context.jobState.collectedEntities,
    collectedRelationships: context.jobState.collectedRelationships,
    encounteredTypes: context.jobState.encounteredTypes,
  }).toMatchSnapshot();

  const accounts = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Account'),
  );
  expect(accounts.length).toBeGreaterThan(0);
  expect(accounts).toMatchGraphObjectSchema({
    _class: ['Account'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'auth0_account' },
        name: { type: 'string' },
        displayName: { type: 'string' },
        webLink: { type: 'string', format: 'url' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['name', 'displayName', 'webLink'],
    },
  });

  const users = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('User'),
  );
  expect(users.length).toBeGreaterThan(0);
  expect(users).toMatchGraphObjectSchema({
    _class: ['User'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'auth0_user' },
        name: { type: 'string' },
        displayName: { type: 'string' },
        email: { type: 'string' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['name', 'displayName', 'email'],
    },
  });

  const appClients = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Application'),
  );
  expect(appClients.length).toBeGreaterThan(0);
  expect(appClients).toMatchGraphObjectSchema({
    _class: ['Application'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'auth0_client' },
        name: { type: 'string' },
        tenant: { type: 'string' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: [],
    },
  });
});

test('should throw error with excessive recursion', async () => {
  recording = setupAuth0Recording({
    directory: __dirname,
    name: 'userRecursionExcess',
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });

  //now simulate simple fetchUsers so we can send tweaked recursion settings
  const apiClient = createAPIClient(context.instance.config);
  const iteratee = (user) => {
    delete user.user_metadata;
  };
  await expect(
    apiClient.recursiveUserIterateeProcessor(logger, iteratee, 4),
  ).rejects.toThrow(Error);
  await expect(
    apiClient.recursiveUserIterateeProcessor(logger, iteratee, 0, '', 1, 100),
  ).rejects.toThrow(Error);
});

test('should get both users with recursion usersPerPage=1', async () => {
  //this tests the pagination function of the recursive user fetch.
  //by default, the provider API sets usersPerPage=50.
  //by default, our code sets it to the API max = 100.
  recording = setupAuth0Recording({
    directory: __dirname,
    name: 'userRecursionPagination',
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });
  await fetchAccountDetails(context);
  const apiClient = createAPIClient(context.instance.config);
  const accountEntity = (await context.jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as Entity;
  const iteratee = async (user) => {
    //unspecified content fields to delete for safety
    delete user.user_metadata;
    delete user.app_metadata;
    const userEntity = await context.jobState.addEntity(
      createUserEntity(user, accountEntity.webLink!),
    );
    await context.jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: userEntity,
      }),
    );
  };

  await apiClient.recursiveUserIterateeProcessor(
    logger,
    iteratee,
    0,
    '',
    1000,
    1,
  );
  const users = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('User'),
  );
  expect(users.length).toEqual(2);
});

test('should get both users with recursion tooManyUsers=2', async () => {
  //this tests the ability of the recursion to recurse when tooManyUsers is reached,
  //which indicates that the provider API is truncating results. Normally that is 1000.
  recording = setupAuth0Recording({
    directory: __dirname,
    name: 'userRecursionRecursion',
  });

  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });
  await fetchAccountDetails(context);
  const apiClient = createAPIClient(context.instance.config);
  const accountEntity = (await context.jobState.getData(
    DATA_ACCOUNT_ENTITY,
  )) as Entity;
  const iteratee = async (user) => {
    //unspecified content fields to delete for safety
    delete user.user_metadata;
    delete user.app_metadata;
    const userEntity = await context.jobState.addEntity(
      createUserEntity(user, accountEntity.webLink!),
    );
    await context.jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: userEntity,
      }),
    );
  };

  await apiClient.recursiveUserIterateeProcessor(
    logger,
    iteratee,
    0,
    '',
    2,
    100,
  );
  const users = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('User'),
  );
  expect(users.length).toEqual(2);
});
