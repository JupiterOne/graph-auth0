import {
  createIntegrationEntity,
  Entity,
} from '@jupiterone/integration-sdk-core';
import { Entities } from '../constants';
import { Auth0Client } from '../../types/clients';

export function createClientEntity(
  client: Auth0Client,
  accountWeblink: string,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: client,
      assign: {
        _key: client.client_id,
        _type: Entities.CLIENT._type,
        _class: Entities.CLIENT._class,
        name: client.name,
        webLink:
          accountWeblink + 'applications/' + client.client_id + '/settings',
        clientId: client.client_id,
        tenant: client.tenant,
        description: client.description,
        global: client.global,
        appType: client.app_type,
        logoUri: client.logo_uri,
        isFirstParty: client.is_first_party,
        oidcConformant: client.oidc_conformant,
        callbacks: client.callbacks,
        allowedOrigins: client.allowed_origins,
        webOrigins: client.web_origins,
        clientAliases: client.client_aliases,
        allowedClients: client.allowed_clients,
        allowedLogoutUrls: client.allowed_logout_urls,
        grantTypes: client.grant_types,
        sso: client.sso,
        ssoDisabled: client.sso_disabled,
        crossOriginAuth: client.cross_origin_auth,
        crossOriginLoc: client.cross_origin_loc,
        customLoginPageOn: client.custom_login_page_on,
        customLoginPage: client.custom_login_page,
        customLoginPagePreview: client.custom_login_page_preview,
        formTemplate: client.form_template,
        tokenEndpointAuthMethod: client.token_endpoint_auth_method,
        initiateLoginUri: client.initiate_login_uri,
        organizationUsage: client.organization_usage,
        organizationRequireBehavior: client.organization_require_behavior,
        //the following fields are arguably security information useful to attackers
        //but also useful for security posture analysis
        tokenExpirationType: client.refresh_token?.expiration_type,
        tokenTokenLifetime: client.refresh_token?.token_lifetime,
        tokenInfiniteTokenLifetime:
          client.refresh_token?.infinite_token_lifetime,
        tokenIdleTokenLifetime: client.refresh_token?.idle_token_lifetime,
        tokenInfiniteIdleTokenLifetime:
          client.refresh_token?.infinite_idle_token_lifetime,
      },
    },
  });
}
