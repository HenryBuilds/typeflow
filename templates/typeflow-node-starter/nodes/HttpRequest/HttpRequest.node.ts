/**
 * HTTP Request Node (Declarative Style)
 * 
 * This demonstrates creating a node using the declarative/routing style,
 * where you define routing configuration instead of writing execute() code.
 * 
 * Best for: Simple API integrations with straightforward CRUD operations.
 * 
 * The workflow engine automatically handles:
 * - Making HTTP requests based on routing config
 * - Injecting credentials into requests
 * - Parsing responses
 */

import { INodeType, INodeTypeDescription } from '../../types/workflow-types';

export class HttpRequestNode implements INodeType {
  description: INodeTypeDescription = {
    // ==================== Basic Info ====================
    displayName: 'HTTP Request',
    name: 'httpRequest',
    icon: 'file:http.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["method"] + " " + $parameter["url"]}}',
    description: 'Make HTTP requests to any API',
    defaults: {
      name: 'HTTP Request',
    },
    
    // ==================== Connections ====================
    inputs: ['main'],
    outputs: ['main'],
    
    // ==================== Credentials (Optional) ====================
    credentials: [
      {
        name: 'httpBasicAuth',
        required: false,
        displayOptions: {
          show: { authentication: ['basicAuth'] },
        },
      },
      {
        name: 'httpHeaderAuth',
        required: false,
        displayOptions: {
          show: { authentication: ['headerAuth'] },
        },
      },
    ],
    
    // ==================== Properties ====================
    properties: [
      // Authentication
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Header Auth', value: 'headerAuth' },
        ],
        default: 'none',
      },
      
      // HTTP Method with routing
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'GET',
            value: 'GET',
            routing: { request: { method: 'GET' } },
          },
          {
            name: 'POST',
            value: 'POST',
            routing: { request: { method: 'POST' } },
          },
          {
            name: 'PUT',
            value: 'PUT',
            routing: { request: { method: 'PUT' } },
          },
          {
            name: 'PATCH',
            value: 'PATCH',
            routing: { request: { method: 'PATCH' } },
          },
          {
            name: 'DELETE',
            value: 'DELETE',
            routing: { request: { method: 'DELETE' } },
          },
        ],
        default: 'GET',
      },
      
      // URL
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://api.example.com/endpoint',
        description: 'The URL to make the request to',
        routing: {
          request: {
            url: '={{$parameter["url"]}}',
          },
        },
      },
      
      // Content Type Header
      {
        displayName: 'Content Type',
        name: 'contentType',
        type: 'options',
        displayOptions: {
          show: { method: ['POST', 'PUT', 'PATCH'] },
        },
        options: [
          { name: 'JSON', value: 'application/json' },
          { name: 'Form Data', value: 'application/x-www-form-urlencoded' },
          { name: 'Plain Text', value: 'text/plain' },
        ],
        default: 'application/json',
      },
      
      // Body (for POST, PUT, PATCH)
      {
        displayName: 'Body',
        name: 'body',
        type: 'json',
        displayOptions: {
          show: { method: ['POST', 'PUT', 'PATCH'] },
        },
        default: '{}',
        description: 'JSON body to send with the request',
        routing: {
          request: {
            body: '={{JSON.parse($parameter["body"])}}',
          },
        },
      },
      
      // Timeout
      {
        displayName: 'Timeout (ms)',
        name: 'timeout',
        type: 'number',
        default: 30000,
        description: 'Request timeout in milliseconds',
      },
    ],
    
    // ==================== TYPEFLOW-EXCLUSIVE ====================
    
    category: 'Network',
    tags: ['http', 'api', 'request', 'rest', 'web'],
    
    // Resilience - automatic retry on failure
    resilience: {
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
        maxDelay: 30000,
        retryOn: [429, 500, 502, 503, 504],
      },
      timeout: 30000,
    },
    
    // Rate limiting
    rateLimiting: {
      maxRequests: 100,
      windowSeconds: 60,
      scope: 'workflow',
      strategy: 'queue',
    },
    
    // Test cases
    testCases: [
      {
        name: 'Should make GET request',
        input: [{ json: {} }],
        parameters: { method: 'GET', url: 'https://api.example.com/users' },
      },
    ],
    
    documentation: {
      longDescription: `
## HTTP Request Node

Make HTTP requests to any REST API endpoint.

### Features
- All HTTP methods (GET, POST, PUT, PATCH, DELETE)
- JSON body support  
- Multiple authentication options
- Automatic retry on failure
- Rate limiting
      `,
    },
  };
}
