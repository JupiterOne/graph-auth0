import { JwtPayload } from 'jwt-decode';

// Client refers to an application that Auth0 supports
// For the class that we use to talk to the management API, see managementClient.ts
//schema per https://auth0.com/docs/api/management/v2/#!/Clients/get_clients

export type Auth0JwtPayload = JwtPayload & { scope?: string };

export interface ClientsResponseJwtConfiguration {
  lifetime_in_seconds?: number;
  secret_encoded?: boolean;
  scopes?: object;
  alg?: string; //Algorithm used to sign JWTs. Can be HS256 or RS256.
}

export interface ClientsResponseEncryptionKey {
  pub?: string;
  cert?: string;
  subject?: string;
}

export interface ClientsResponseRefreshToken {
  rotation_type?: string; //one of rotating, non-rotating
  expiration_type?: string; //one of expiring, non-expiring
  leeway?: number; //Period in seconds where the previous refresh token can be exchanged without triggering breach detection
  token_lifetime?: number; //in seconds
  infinite_token_lifetime?: boolean; //takes precedence over token_lifetime
  idle_token_lifetime?: number;
  infinite_idle_token_lifetime?: boolean;
}

export interface Auth0Client {
  client_id: string;
  tenant?: string; //name of the tenant this client belongs to
  name?: string; //min 1 char, does not allow < or > in name
  description?: string; //max length: 140 characters
  global?: boolean; //Whether this is your global 'All Applications' client representing legacy tenant settings (true) or a regular client (false).
  client_secret?: string; //be sure to redact this is recordings and rawData
  app_type?: string; //Can be spa, native, non_interactive, or regular_web.
  logo_uri?: string;
  is_first_party?: boolean;
  oidc_conformant?: boolean;
  callbacks?: string[]; //Comma-separated list of URLs whitelisted for Auth0 to use as a callback to the client after authentication.
  allowed_origins?: string[];
  web_origins?: string[];
  client_aliases?: string[];
  allowed_clients?: string[];
  allowed_logout_urls?: string[];
  grant_types?: string[];
  jwt_configuration?: ClientsResponseJwtConfiguration; //probably should redact
  signing_keys?: object[]; //definitely redact from recordings and rawData
  encryption_key?: ClientsResponseEncryptionKey; //probably should redact
  sso?: boolean; //Applies only to SSO clients and determines whether Auth0 will handle Single Sign On (true) or whether the Identity Provider will (false).
  sso_disabled?: boolean; //defaults to true
  cross_origin_auth?: boolean; //whether client can make cross-origin auth requests
  cross_origin_loc?: string;
  custom_login_page_on?: boolean;
  custom_login_page?: string; //the content (HTML, CSS, JS) of any custom login page
  custom_login_page_preview?: string;
  form_template?: string; //used for WS-Federation
  addons?: object; //many subfields listed in schema, all of which provides more objects
  token_endpoint_auth_method?: string; //Can be none (public client without a client secret), client_secret_post (client uses HTTP POST parameters), or client_secret_basic (client uses HTTP Basic).
  client_metadata?: object; //unspecified object
  mobile?: object; //additional config for native mobile apps
  initiate_login_uri?: string; //must be https
  native_social_login?: object; //config for Native Social Login support
  refresh_token?: ClientsResponseRefreshToken; //should this be redacted? Could be valid for security analysis
  organization_usage?: string; //can be 'deny' (default), 'allow', or 'require'
  organization_require_behavior?: string; //Can be no_prompt (default) or pre_login_prompt.
}
