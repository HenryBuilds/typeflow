/**
 * Mock implementation of IExecuteFunctions for testing
 */

// We define the types inline to avoid import path issues
interface INodeExecutionData {
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
}

export interface MockExecuteFunctionsOptions {
  inputData?: INodeExecutionData[];
  parameters?: Record<string, unknown>;
}

export function createMockExecuteFunctions(options: MockExecuteFunctionsOptions = {}) {
  const inputData = options.inputData || [{ json: {} }];
  const parameters = options.parameters || {};

  return {
    getInputData: () => inputData,
    
    getNodeParameter: (paramName: string, itemIndex: number, fallback?: unknown) => {
      const value = parameters[paramName];
      if (value === undefined && fallback !== undefined) {
        return fallback;
      }
      return value;
    },
    
    getNode: () => ({
      name: 'TestNode',
      type: 'test',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    }),
    
    getWorkflow: () => ({
      id: 'test-workflow',
      name: 'Test Workflow',
      active: false,
      nodes: [],
      connections: {},
    }),
    
    getCredentials: async (type: string) => {
      return { apiKey: 'test-key' };
    },
    
    helpers: {
      returnJsonArray: (data: unknown[]) => data.map(item => ({ json: item })),
    },
  };
}
