import {
  createIntegrationEntity,
  Entity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { Entities } from '../constants';
import { Auth0User } from '../../types/users';

export function createUserKey(user: Auth0User) {
  return `${user.user_id}:${user.email}`;
}

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
        _key: createUserKey(user),
        _type: Entities.USER._type,
        _class: Entities.USER._class,
        name: user.name,
        username: user.username || '',
        active: !user.blocked,
        nickname: user.nickname,
        email: user.email,
        webLink: weblink,
        userId: user.user_id,
        emailVerified: user.email_verified,
        phoneNumber: user.phone_number,
        phoneVerified: user.phone_verified,
        createdOn: parseTimePropertyValue(user.created_at),
        updatedOn: parseTimePropertyValue(user.updated_at),
        identities: JSON.stringify(user.identities), //array of objects
        picture: user.picture, //url
        multifactor: user.multifactor, //string[]
        lastIp: user.last_ip,
        lastLogin: parseTimePropertyValue(user.last_login),
        loginsCount: user.logins_count,
        blocked: user.blocked,
        givenName: user.given_name,
        familyName: user.family_name,
      },
    },
  });
}
