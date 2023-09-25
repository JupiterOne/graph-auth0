export interface Auth0UserIdentity {
  connection: string;
  user_id: string;
  provider: string;
  isSocial: boolean;
}

//schema per https://auth0.com/docs/api/management/v2/#!/Users/get_users
export interface Auth0User {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  username?: string;
  phone_number?: string;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  identities?: Auth0UserIdentity[];
  app_metadata?: object;
  user_metadata?: object;
  picture?: string;
  name?: string;
  nickname?: string;
  multifactor?: string[]; //List of multi-factor authentication providers with which this user has enrolled.
  last_ip?: string;
  last_login?: string;
  logins_count?: number;
  blocked?: boolean;
  given_name?: string;
  family_name?: string;
}
