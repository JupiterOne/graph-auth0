export interface Auth0UserIdentity {
  connection: string;
  user_id: string;
  provider: string;
  isSocial: boolean;
}
export type KeyValue = {
  [key: string]: any;
};
//schema per https://auth0.com/docs/api/management/v2/#!/Users/get_users
export interface Auth0User {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  username?: string;
  phone_number?: string;
  phone_verified?: boolean;
  created_at?: string | KeyValue;
  updated_at?: string | KeyValue;
  identities?: Auth0UserIdentity[];
  app_metadata?: object;
  user_metadata?: object;
  picture?: string;
  name?: string;
  nickname?: string;
  multifactor?: string[]; //List of multi-factor authentication providers with which this user has enrolled.
  last_ip?: string;
  last_login?: string | KeyValue;
  logins_count?: number;
  blocked?: boolean;
  given_name?: string;
  family_name?: string;
}

export interface Auth0UsersIncludeTotal {
  status: number;
  statusText: string;
  data: {
    start: number; //start of page
    limit: number; //per_page limit in query
    length: number; //number of users returned in this page
    users: Auth0User[];
    total: number; //total users returned by this query across all pages
  };
}
