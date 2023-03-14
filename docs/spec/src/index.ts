import { IntegrationSpecConfig } from '@jupiterone/integration-sdk-core';
import { IntegrationConfig } from '../../../src/config';
import { accountSpec } from './account';
import { clientSpec } from './clients';
import { userSpec } from './users';

export const invocationConfig: IntegrationSpecConfig<IntegrationConfig> = {
  integrationSteps: [...accountSpec, ...clientSpec, ...userSpec],
};
