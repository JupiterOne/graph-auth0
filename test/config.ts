import * as dotenv from 'dotenv';
import * as path from 'path';
import { IntegrationConfig } from '../src/config';
import { StepTestConfig } from '@jupiterone/integration-sdk-testing';
import { invocationConfig } from '../src';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}

const DEFAULT_CLIENT_ID = 'dummy-acme-client-id';
const DEFAULT_CLIENT_SECRET = 'dummy-acme-client-secret';
const DEFAULT_DOMAIN = 'dev-123456777777.us.auth0.com';
const DEFAULT_AUDIENCE = 'https://dev-123456777777.us.auth0.com/api/v2/';

export const integrationConfig: IntegrationConfig = {
  clientId: process.env.CLIENT_ID || DEFAULT_CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET || DEFAULT_CLIENT_SECRET,
  domain: process.env.DOMAIN || DEFAULT_DOMAIN,
  audience: process.env.AUDIENCE || DEFAULT_AUDIENCE,
};

export function getStepTestConfigForStep(
  stepId: string,
): StepTestConfig<any, IntegrationConfig> {
  return {
    stepId,
    instanceConfig: integrationConfig,
    invocationConfig: {
      ...invocationConfig,
    } as any,
  };
}
