/**
 * Declarative Node Executor
 * 
 * Executes nodes that use declarative style (routing configuration)
 * instead of programmatic execute() method.
 */

import type {
  INodeType,
  INodeProperties,
  IHttpRequestOptions,
  INodeExecutionData,
  INodePropertyRouting,
  NodeParameterValue,
} from '@/types/typeflow-workflow';
import type { ExecutionItem } from '@/types/execution';
import { createLogger } from '@/lib/logger';

const log = createLogger('DeclarativeExecutor');

export class DeclarativeNodeExecutor {
  /**
   * Execute a declarative-style node
   */
  async execute(
    nodeType: INodeType,
    inputItems: ExecutionItem[],
    parameters: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<ExecutionItem[]> {
    const description = nodeType.description;
    const requestDefaults = description.requestDefaults || {};

    const results: ExecutionItem[] = [];

    for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex++) {
      const item = inputItems[itemIndex];

      try {
        // Build request options from routing configurations
        const requestOptions = await this.buildRequestOptions(
          description.properties,
          parameters,
          requestDefaults,
          item,
          itemIndex
        );

        // Apply credential authentication
        if (description.credentials && description.credentials.length > 0) {
          this.applyCredentials(requestOptions, credentials, description.credentials[0].name);
        }

        // Execute the HTTP request
        const response = await this.executeRequest(requestOptions);

        // Process response
        results.push({
          json: typeof response === 'object' ? response as Record<string, unknown> : { data: response }
        });

      } catch (error: any) {
        results.push({
          json: {
            error: true,
            message: error.message,
            originalItem: item.json
          }
        });
      }
    }

    return results;
  }

  /**
   * Build HTTP request options from node properties and routing
   */
  private async buildRequestOptions(
    properties: INodeProperties[],
    parameters: Record<string, unknown>,
    defaults: IHttpRequestOptions,
    item: ExecutionItem,
    itemIndex: number
  ): Promise<IHttpRequestOptions> {
    const options: IHttpRequestOptions = {
      baseURL: defaults.baseURL,
      url: defaults.url || '',
      method: defaults.method || 'GET',
      headers: { ...defaults.headers },
      qs: { ...defaults.qs },
      json: defaults.json !== false,
    };

    // Process each property's routing configuration
    for (const property of properties) {
      const paramValue = parameters[property.name];
      
      if (property.routing && paramValue !== undefined) {
        this.applyRouting(options, property.routing, paramValue, item, itemIndex, parameters);
      }

      // Check for routing in options (for 'options' type properties)
      if (property.type === 'options' && property.options) {
        const selectedOption = property.options.find(opt => opt.value === paramValue);
        if (selectedOption?.routing) {
          this.applyRouting(options, selectedOption.routing, paramValue, item, itemIndex, parameters);
        }
      }
    }

    return options;
  }

  /**
   * Apply routing configuration to request options
   */
  private applyRouting(
    options: IHttpRequestOptions,
    routing: INodePropertyRouting,
    value: unknown,
    item: ExecutionItem,
    itemIndex: number,
    parameters: Record<string, unknown>
  ): void {
    if (!routing.request) return;

    const request = routing.request;

    // Apply method
    if (request.method) {
      options.method = request.method;
    }

    // Apply URL (with expression resolution)
    if (request.url) {
      options.url = this.resolveExpression(request.url, value, item, itemIndex, parameters);
    }

    // Apply headers
    if (request.headers) {
      for (const [key, headerValue] of Object.entries(request.headers)) {
        options.headers = options.headers || {};
        options.headers[key] = this.resolveExpression(headerValue, value, item, itemIndex, parameters);
      }
    }

    // Apply query string parameters
    if (request.qs) {
      for (const [key, qsValue] of Object.entries(request.qs)) {
        options.qs = options.qs || {};
        options.qs[key] = this.resolveExpression(qsValue, value, item, itemIndex, parameters);
      }
    }

    // Apply body
    if (request.body !== undefined) {
      options.body = this.resolveExpressionObject(request.body, value, item, itemIndex, parameters);
    }
  }

  /**
   * Resolve expressions in strings (e.g., "={{$value}}" or "={{$parameter['url']}}")
   */
  private resolveExpression(
    expression: string,
    value: unknown,
    item: ExecutionItem,
    itemIndex: number,
    parameters: Record<string, unknown>
  ): string {
    if (!expression.startsWith('=')) {
      return expression;
    }

    // Remove "=" prefix and "{{" "}}" wrappers
    let expr = expression.slice(1);
    if (expr.startsWith('{{') && expr.endsWith('}}')) {
      expr = expr.slice(2, -2);
    }

    // Create evaluation context
    const $value = value;
    const $json = item.json;
    const $itemIndex = itemIndex;
    const $parameter = parameters;

    try {
      // Safe evaluation using Function constructor
      const evalFunc = new Function('$value', '$json', '$itemIndex', '$parameter', `return ${expr}`);
      const result = evalFunc($value, $json, $itemIndex, $parameter);
      return String(result);
    } catch (error) {
      log.warn({ err: error, expression }, 'Expression evaluation failed');
      return expression;
    }
  }

  /**
   * Resolve expressions in objects recursively
   */
  private resolveExpressionObject(
    obj: unknown,
    value: unknown,
    item: ExecutionItem,
    itemIndex: number,
    parameters: Record<string, unknown>
  ): unknown {
    if (typeof obj === 'string') {
      return this.resolveExpression(obj, value, item, itemIndex, parameters);
    }

    if (Array.isArray(obj)) {
      return obj.map(el => this.resolveExpressionObject(el, value, item, itemIndex, parameters));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        result[key] = this.resolveExpressionObject(val, value, item, itemIndex, parameters);
      }
      return result;
    }

    return obj;
  }

  /**
   * Apply credential authentication to request
   */
  private applyCredentials(
    options: IHttpRequestOptions,
    credentials: Record<string, unknown>,
    credentialName: string
  ): void {
    const cred = credentials[credentialName];
    if (!cred || typeof cred !== 'object') return;

    const credConfig = cred as Record<string, unknown>;

    // Common patterns
    if (credConfig.apiKey) {
      options.qs = options.qs || {};
      options.qs['api_key'] = String(credConfig.apiKey);
    }

    if (credConfig.token) {
      options.headers = options.headers || {};
      options.headers['Authorization'] = `Bearer ${credConfig.token}`;
    }

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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
export const declarativeExecutor = new DeclarativeNodeExecutor();
