import {
  Recording,
  createMockExecutionContext,
} from '@jupiterone/integration-sdk-testing';
import { IntegrationConfig, validateInvocation } from './config';
import { setupAuth0Recording } from '../test/recording';
import { integrationConfig } from '../test/config';
let recording: Recording;

afterEach(async () => {
  if (recording) {
    await recording.stop();
  }
});

it('requires valid config', async () => {
  try {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: {} as IntegrationConfig,
    });

    await validateInvocation(executionContext);
  } catch (err) {
    expect(err.message).toEqual(
      'Config requires all of {clientId, clientSecret, domain, audience}',
    );
  }
});
it('throw if Unauthorized', async () => {
  recording = setupAuth0Recording({
    directory: __dirname,
    name: 'validateInvocation1',
    options: {
      recordFailedRequests: true,
    },
  });
  try {
    const executionContext = createMockExecutionContext<IntegrationConfig>({
      instanceConfig: integrationConfig,
    });

    await validateInvocation(executionContext);
  } catch (err) {
    expect(err.message).toEqual('Unauthorized');
  }
});
