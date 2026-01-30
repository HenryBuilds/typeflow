import {
  ICredentialType,
  INodeProperties,
} from '../types/workflow-types';

export class Postgres implements ICredentialType {
  name = 'postgres';
  displayName = 'Postgres';
  documentationUrl = 'https://www.postgresql.org/docs/';
  properties: INodeProperties[] = [
    {
      displayName: 'Host',
      name: 'host',
      type: 'string',
      default: 'localhost',
    },
    {
      displayName: 'Database',
      name: 'database',
      type: 'string',
      default: 'postgres',
    },
    {
      displayName: 'User',
      name: 'user',
      type: 'string',
      default: 'postgres',
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
    {
      displayName: 'Port',
      name: 'port',
      type: 'number',
      default: 5432,
    },
    {
      displayName: 'SSL',
      name: 'ssl',
      type: 'options',
      options: [
        {
          name: 'Disable',
          value: 'disable',
        },
        {
          name: 'Allow',
          value: 'allow',
        },
        {
          name: 'Require',
          value: 'require',
        },
        {
          name: 'Verify CA',
          value: 'verify-ca',
        },
        {
          name: 'Verify Full',
          value: 'verify-full',
        },
      ],
      default: 'disable',
    },
  ];
}
