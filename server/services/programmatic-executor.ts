/**
 * Programmatic Node Executor
 * 
 * Executes nodes that implement the execute() method (programmatic style).
 * Provides the IExecuteFunctions context that typeflow nodes expect.
 */

import type {
  INodeType,
  IExecuteFunctions,
  IExecuteFunctionsHelpers,
  INodeExecutionData,
  IHttpRequestOptions,
  INode,
  IBinaryData,
  NodeParameterValue,
} from '@/types/typeflow-workflow';
import type { ExecutionItem } from '@/types/execution';
import { credentialService } from './credential-service';

export class ProgrammaticNodeExecutor {
  /**
   * Execute a programmatic-style node
   */
  async execute(
    nodeType: INodeType,
    inputItems: ExecutionItem[],
    nodeConfig: Record<string, unknown>,
    organizationId: string,
    workflowInfo: { id: string; name: string }
  ): Promise<ExecutionItem[]> {
    if (!nodeType.execute) {
      throw new Error(`Node ${nodeType.description.name} does not have an execute method`);
    }

    // Convert input items to typeflow format
    const typeflowInputData: INodeExecutionData[] = inputItems.map(item => ({
      json: item.json,
    }));

    // Build the execution context
    const executeFunctions = this.buildExecuteFunctions(
      nodeType,
      typeflowInputData,
      nodeConfig,
      organizationId,
      workflowInfo
    );

    try {
      // Call the node's execute method with the context bound
      const result = await nodeType.execute.call(executeFunctions);

      // Flatten the result (typeflow returns INodeExecutionData[][] for multiple outputs)
      const flatResult = result.flat();

      // Convert back to ExecutionItem format
      return flatResult.map(item => ({
        json: item.json,
      }));
    } catch (error: any) {
      throw new Error(`Node execution failed: ${error.message}`);
    }
  }

  /**
   * Build the IExecuteFunctions context for node execution
   */
  private buildExecuteFunctions(
    nodeType: INodeType,
    inputData: INodeExecutionData[],
    nodeConfig: Record<string, unknown>,
    organizationId: string,
    workflowInfo: { id: string; name: string }
  ): IExecuteFunctions {
    const helpers = this.buildHelpers(organizationId);

    const context: IExecuteFunctions = {
      getInputData: (inputIndex: number = 0) => {
        return inputData;
      },

      getNodeParameter: (
        parameterName: string,
        itemIndex: number,
        fallbackValue?: NodeParameterValue
      ): NodeParameterValue | Record<string, unknown> => {
        const value = nodeConfig[parameterName];
        if (value === undefined) {
          return fallbackValue as NodeParameterValue;
        }
        return value as NodeParameterValue | Record<string, unknown>;
      },

      getCredentials: async (type: string): Promise<Record<string, unknown>> => {
        const allCreds = await credentialService.getCredentials(organizationId);
        // Return credential config if available
        return ((allCreds as Record<string, unknown>)[type] || {}) as Record<string, unknown>;
      },

      helpers,

      getNode: (): INode => ({
        id: 'current-node',
        name: nodeType.description.defaults.name,
        type: nodeType.description.name,
        position: [0, 0],
        parameters: nodeConfig,
      }),

      getWorkflow: () => workflowInfo,

      getMode: () => 'manual',

      continueOnFail: () => false,
    };

    return context;
  }

  /**
   * Build the helpers object for node execution
   */
  private buildHelpers(organizationId: string): IExecuteFunctionsHelpers {
    return {
      request: async (options: IHttpRequestOptions): Promise<unknown> => {
        return this.executeRequest(options);
      },

      requestWithAuthentication: async (
        credentialsType: string,
        options: IHttpRequestOptions
      ): Promise<unknown> => {
        const creds = await credentialService.getCredentials(organizationId);
        // Apply credentials to request
        this.applyCredentialsToRequest(options, creds as Record<string, unknown>, credentialsType);
        return this.executeRequest(options);
      },

      httpRequest: async (options: IHttpRequestOptions): Promise<unknown> => {
        return this.executeRequest(options);
      },

      httpRequestWithAuthentication: async (
        credentialsType: string,
        options: IHttpRequestOptions
      ): Promise<unknown> => {
        const creds = await credentialService.getCredentials(organizationId);
        this.applyCredentialsToRequest(options, creds as Record<string, unknown>, credentialsType);
        return this.executeRequest(options);
      },

      prepareBinaryData: async (
        binaryData: Buffer,
        fileName?: string,
        mimeType?: string
      ): Promise<IBinaryData> => {
        return {
          data: {
            data: binaryData.toString('base64'),
            mimeType: mimeType || 'application/octet-stream',
            fileName,
          }
        };
      },

      getBinaryDataBuffer: async (
        itemIndex: number,
        propertyName: string
      ): Promise<Buffer> => {
        // TODO: Implement binary data retrieval
        return Buffer.from('');
      },
    };
  }

  /**
   * Apply credentials to request options
   */
  private applyCredentialsToRequest(
    options: IHttpRequestOptions,
    credentials: Record<string, unknown>,
    credentialType: string
  ): void {
    const cred = credentials[credentialType];
    if (!cred || typeof cred !== 'object') return;

    const credConfig = cred as Record<string, unknown>;

    // API Key authentication
    if (credConfig.apiKey) {
      options.qs = options.qs || {};
      options.qs['api_key'] = String(credConfig.apiKey);
    }

    // Bearer token authentication
    if (credConfig.token || credConfig.accessToken) {
      options.headers = options.headers || {};
      options.headers['Authorization'] = `Bearer ${credConfig.token || credConfig.accessToken}`;
    }

    // Basic auth
    if (credConfig.username && credConfig.password) {
      const auth = Buffer.from(`${credConfig.username}:${credConfig.password}`).toString('base64');
      options.headers = options.headers || {};
      options.headers['Authorization'] = `Basic ${auth}`;
    }
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest(options: IHttpRequestOptions): Promise<unknown> {
    const url = new URL(options.url || '', options.baseURL);

    // Apply query string
    if (options.qs) {
      for (const [key, value] of Object.entries(options.qs)) {
        url.searchParams.append(key, value);
      }
    }

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: options.headers,
    };

    // Add timeout
    if (options.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), options.timeout);
      fetchOptions.signal = controller.signal;
    }

    // Add body for appropriate methods
    if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method || '')) {
      if (options.json !== false) {
        fetchOptions.body = JSON.stringify(options.body);
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        };
      } else {
        fetchOptions.body = options.body as BodyInit;
      }
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok && !options.ignoreHttpStatusErrors) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Return full response if requested
    if (options.returnFullResponse) {
      return {
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }
}

// Singleton instance
export const programmaticExecutor = new ProgrammaticNodeExecutor();
