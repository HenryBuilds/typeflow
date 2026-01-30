import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../../types/typeflow-workflow';

export class Postgres implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Postgres',
    name: 'postgres',
    icon: 'file:postgres.svg',
    group: ['input'],
    version: 1,
    description: 'Get data from Postgres database',
    defaults: {
      name: 'Postgres',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'postgres',
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
            name: 'Execute Query',
            value: 'executeQuery',
          },
        ],
        default: 'executeQuery',
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: [
              'executeQuery',
            ],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    if (operation === 'executeQuery') {
      // --------------------------------------------------------------------
      // HIER SIND DIE CREDENTIALS
      // --------------------------------------------------------------------
      // Die Credentials werden über this.getCredentials('name') geladen.
      // Der Name muss mit dem Namen in der 'credentials' Property der 
      // Node-Beschreibung übereinstimmen.
      const credentials = await this.getCredentials('postgres');

      // Beispiel: Verwendung der Credentials für eine Verbindung
      // const client = new Client({
      //   host: credentials.host as string,
      //   port: credentials.port as number,
      //   user: credentials.user as string,
      //   password: credentials.password as string,
      //   database: credentials.database as string,
      // });
      // await client.connect();

      for (let i = 0; i < items.length; i++) {
        const query = this.getNodeParameter('query', i) as string;
        
        // Mock execution
        returnData.push({
          json: {
            message: `Executed query: ${query}`,
            usingHost: credentials.host, // Nur zur Demo
            success: true,
          },
        });
      }
    }

    return [returnData];
  }
}
