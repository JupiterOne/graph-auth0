import {
  IntegrationExecutionContext,
  IntegrationValidationError,
  IntegrationInstanceConfigFieldMap,
  IntegrationInstanceConfig,
} from '@jupiterone/integration-sdk-core';
import { createAPIClient } from './client';

/**
 * A type describing the configuration fields required to execute the
 * integration for a specific account in the data provider.
 *
 * When executing the integration in a development environment, these values may
 * be provided in a `.env` file with environment variables. For example:
 *
 * - `CLIENT_ID=123` becomes `instance.config.clientId = '123'`
 * - `CLIENT_SECRET=abc` becomes `instance.config.clientSecret = 'abc'`
 *
 * Environment variables are NOT used when the integration is executing in a
 * managed environment. For example, in JupiterOne, users configure
 * `instance.config` in a UI.
 */
export const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  clientId: {
    type: 'string',
  },
  clientSecret: {
    type: 'string',
    mask: true,
  },
  domain: {
    type: 'string',
  },
  audience: {
    type: 'string',
  },
};

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The provider API client ID used to authenticate requests.
   */
  clientId: string;

  /**
   * The provider API client secret used to authenticate requests.
   */
  clientSecret: string;

  /**
   * The provider API domain used to authenticate requests.
   */
  domain: string;

  /**
   * The audience (example: http://tenant.auth0.com/api/v2) used to authenticate requests
   */
  audience: string;
}

export async function validateInvocation(
  context: IntegrationExecutionContext<IntegrationConfig>,
) {
  const { config } = context.instance;

  if (
    !config.clientId ||
    !config.clientSecret ||
    !config.domain ||
    !config.audience
  ) {
    throw new IntegrationValidationError(
      'Config requires all of {clientId, clientSecret, domain, audience}',
    );
  }

  //checks for domain
  if (/https?:\/\//.test(config.domain)) {
    throw new IntegrationValidationError(
      'Config {domain} should not have https:// prepended',
    );
  }

  //checks for audience
  if (!/https?:\/\//.test(config.audience)) {
    throw new IntegrationValidationError(
      'Config {audience} must have https:// prepended',
    );
  }

  if (
    !config.audience.match(
      /^https:\/\/[A-Za-z0-9-]*[.][A-Za-z0-9-]*[.]auth0[.]com\/api\/v2\/$/,
    )
  ) {
    throw new IntegrationValidationError(
      'Problem with config {audience}. Should be a subdomain of auth0.com.',
    );
  }

  const finalChar = config.audience[config.audience.length - 1];
  if (!(finalChar === '/')) {
    throw new IntegrationValidationError(
      'Problem with config {audience}. Trailing slash required.',
    );
  }

  const apiClient = createAPIClient(config);
  await apiClient.verifyAuthentication();
}
