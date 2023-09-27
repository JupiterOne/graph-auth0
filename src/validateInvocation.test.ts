import { createMockExecutionContext } from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig, validateInvocation } from './config';

it('requires valid config', () => {
  try {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {} as IntegrationConfig,
    });

    validateInvocation(executionContext);
  } catch (err) {
    expect(err.message).toEqual(
      'Config requires all of {clientId, clientSecret, domain, audience}',
    );
  }
});
