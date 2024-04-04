import { accountSteps } from './account';
import { userSteps } from './users';
import { clientSteps } from './clients';
import { roleSteps } from './roles';
import { serverSteps } from './servers';

const integrationSteps = [
  ...accountSteps,
  ...userSteps,
  ...clientSteps,
  ...roleSteps,
  ...serverSteps,
];

export { integrationSteps };
