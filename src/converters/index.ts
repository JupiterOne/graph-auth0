import {
  createIntegrationEntity,
  Entity,
} from '@jupiterone/integration-sdk-core';
import { Auth0User, KeyValue } from '../types/users';
import {
  Client,
  GetOrganizationMemberRoles200ResponseOneOfInner,
  ResourceServer,
} from 'auth0';
import { Auth0Entities } from '../constants/constants';

export function createUserEntity(
  user: Auth0User,
  accountWeblink: string,
): Entity {
  //weblink uses the user_id, but user_id has the pipe '|' in it,
  //and the SDK doesn't like it for validating URI format, so converting
  //%7C is '|'
  const weblink =
    accountWeblink + 'users/auth0%7C' + user.user_id?.substring(6);
  return createIntegrationEntity({
    entityData: {
      source: user,
      assign: {
        _key: `${user.user_id}`,
        _type: Auth0Entities.AUTH0_USER._type,
        _class: Auth0Entities.AUTH0_USER._class,
        name: user.name,
        displayName: user.name,
        username: user.username || '',
        nickname: user.nickname,
        email: user.email,
        webLink: weblink,
        userId: user.user_id,
        emailVerified: user.email_verified,
        phoneNumber: user.phone_number,
        phoneVerified: user.phone_verified,
        createdAt: propertyToString(user.created_at),
        updatedAt: propertyToString(user.updated_at),
        identities: JSON.stringify(user.identities), //array of objects
        picture: user.picture, //url
        multifactor: user.multifactor, //string[]
        lastIp: user.last_ip,
        lastLogin: propertyToString(user.last_login),
        loginsCount: user.logins_count,
        blocked: user.blocked,
        givenName: user.given_name,
        familyName: user.family_name,
      },
    },
  });
}
function propertyToString(
  property: string | KeyValue | undefined,
): string | undefined {
  if (property) {
    if (typeof property === 'string') {
      return property;
    }
    return JSON.stringify(property);
  }
  return property;
}
export function createClientEntity(
  client: Omit<
    Client,
    | 'client_secret'
    | 'jwt_configuration'
    | 'signing_keys'
    | 'encryption_key'
    | 'addons'
    | 'client_metadata'
    | 'mobile'
    | 'native_social_login'
  >,
  accountWeblink: string,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: client,
      assign: {
        _key: `${client.client_id}`,
        _type: Auth0Entities.AUTH0_CLIENT._type,
        _class: Auth0Entities.AUTH0_CLIENT._class,
        name: client.name,
        displayName: client.name,
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

export function createRoleEntity(
  role: GetOrganizationMemberRoles200ResponseOneOfInner,
  accountWeblink: string,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: role,
      assign: {
        _key: `${role.id}`,
        _type: Auth0Entities.AUTH0_ROLES._type,
        _class: Auth0Entities.AUTH0_ROLES._class,
        id: role.id,
        name: role.name,
        description: role.description,
        webLink: accountWeblink + 'roles/' + role.id + '/settings',
      },
    },
  });
}

export function createResourceServer(
  server: ResourceServer,
  accountWeblink: string,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: server,
      assign: {
        _key: `${server.identifier}`,
        _type: Auth0Entities.AUTH0_SERVER._type,
        _class: Auth0Entities.AUTH0_SERVER._class,
        id: server.id,
        name: server.name,
        hostname: server.identifier,
        category: ['network'],
        function: ['api-gateway'],
        public: false,
        offlineAccess: server.allow_offline_access,
        webLink: accountWeblink + 'apis/' + server.id + '/settings',
      },
    },
  });
}
