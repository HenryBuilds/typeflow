import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../../types/workflow-types';

export class MongoDb implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MongoDB',
    name: 'mongoDb',
    icon: 'file:mongodb.svg',
    group: ['input'],
    version: 1,
    description: 'Interact with MongoDB',
    defaults: {
      name: 'MongoDB',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'mongoDb',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Find',
            value: 'find',
          },
          {
            name: 'Insert',
            value: 'insert',
          },
        ],
        default: 'find',
      },
      {
        displayName: 'Collection',
        name: 'collection',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            operation: [
              'find',
            ],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    
    // --------------------------------------------------------------------
    // HIER SIND DIE CREDENTIALS
    // --------------------------------------------------------------------
    const credentials = await this.getCredentials('mongoDb');
    
    // const client = new MongoClient(credentials.connectionString as string);
    // await client.connect();
    
    for (let i = 0; i < items.length; i++) {
      // Mock execution
      returnData.push({
        json: {
          message: 'MongoDB Operation executed',
          connectedTo: credentials.connectionString, // Nur zur Demo
        },
      });
    }

    return [returnData];
  }
}
