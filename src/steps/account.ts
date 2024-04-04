import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../config';
import { getAcctWeblink } from '../util/getAcctWeblink';
import {
  ACCOUNT_ENTITY_TYPE,
  Auth0Entities,
  DATA_ACCOUNT_ENTITY,
  Steps,
} from '../constants/constants';

export async function fetchAccountDetails({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const webLink = getAcctWeblink(instance.config.domain);
  const accountEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: {
          id: `Auth0 Account`,
          name: 'Auth0 Account',
        },
        assign: {
          _key: `auth0-account:${instance.id}`,
          _type: ACCOUNT_ENTITY_TYPE,
          _class: Auth0Entities.AUTH0_ACCOUNT._class,
          name: 'Auth0 Account',
          displayName: 'Auth0 Account',
          webLink: webLink,
        },
      },
    }),
  );

  await jobState.setData(DATA_ACCOUNT_ENTITY, accountEntity);
}

export const accountSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: Steps.ACCOUNTS,
    name: 'Fetch Account Details',
    entities: [Auth0Entities.AUTH0_ACCOUNT],
    relationships: [],
    dependsOn: [],
    executionHandler: fetchAccountDetails,
  },
];
