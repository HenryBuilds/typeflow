import {
  ICredentialType,
  INodeProperties,
} from '../types/typeflow-workflow';

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
