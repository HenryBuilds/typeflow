import {
  ICredentialType,
  INodeProperties,
} from '../types/workflow-types';

export class MongoDb implements ICredentialType {
  name = 'mongoDb';
  displayName = 'MongoDB';
  documentationUrl = 'https://docs.mongodb.com/';
  properties: INodeProperties[] = [
    {
      displayName: 'Connection String',
      name: 'connectionString',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: 'mongodb://localhost:27017',
    },
  ];
}
