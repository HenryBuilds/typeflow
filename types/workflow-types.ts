/**
 * typeflow-Compatible Node Type Interfaces
 * 
 * These interfaces are designed to be compatible with typeflow's node development
 * patterns, allowing developers to create custom nodes using the same approach.
 */

// ==================== Node Parameter Types ====================

export type NodeParameterValue = string | number | boolean | undefined | null;

export type NodePropertyTypes =
  | 'boolean'
  | 'collection'
  | 'color'
  | 'dateTime'
  | 'fixedCollection'
  | 'hidden'
  | 'json'
  | 'multiOptions'
  | 'notice'
  | 'number'
  | 'options'
  | 'resourceLocator'
  | 'resourceMapper'
  | 'string';

// ==================== Node Property Options ====================

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
  action?: string;
  routing?: INodePropertyRouting;
}

export interface IDisplayOptions {
  show?: { [key: string]: NodeParameterValue[] };
  hide?: { [key: string]: NodeParameterValue[] };
}

// ==================== Routing (Declarative Style) ====================

export interface INodePropertyRouting {
  request?: IHttpRequestOptionsSimplified;
  output?: INodePropertyRoutingOutput;
  operations?: INodePropertyRoutingOperations;
  send?: INodePropertyRoutingSend;
}

export interface IHttpRequestOptionsSimplified {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  qs?: Record<string, string>;
  body?: unknown;
  json?: boolean;
}

export interface INodePropertyRoutingOutput {
  postReceive?: INodePropertyRoutingOutputPostReceive[];
}

export interface INodePropertyRoutingOutputPostReceive {
  type: 'rootProperty' | 'set' | 'setKeyValue' | 'binaryData' | 'limit';
  properties: Record<string, unknown>;
}

export interface INodePropertyRoutingOperations {
  [key: string]: unknown;
}

export interface INodePropertyRoutingSend {
  type?: 'body' | 'query';
  property?: string;
  propertyInDotNotation?: boolean;
  value?: string;
  preSend?: unknown[];
}

// ==================== Node Properties ====================

export interface INodeTypeOptions {
  multipleValues?: boolean;
  password?: boolean;
  rows?: number;
  maxValue?: number;
  minValue?: number;
  numberStepSize?: number;
  alwaysOpenEditWindow?: boolean;
  editor?: string;
  loadOptionsMethod?: string;
  loadOptionsDependsOn?: string[];
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default: NodeParameterValue | Record<string, unknown> | unknown[];
  description?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  noDataExpression?: boolean;
  options?: INodePropertyOptions[];
  displayOptions?: IDisplayOptions;
  routing?: INodePropertyRouting;
  typeOptions?: INodeTypeOptions;
}

// ==================== Credentials ====================

export interface INodeCredentialDescription {
  name: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
}

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
  authenticate?: ICredentialAuthenticate;
  test?: ICredentialTestRequest;
}

export interface ICredentialAuthenticate {
  type: 'generic' | 'bearer';
  properties: {
    headers?: Record<string, string>;
    qs?: Record<string, string>;
    body?: Record<string, string>;
  };
}

export interface ICredentialTestRequest {
  request: IHttpRequestOptionsSimplified;
}

// ==================== HTTP Request Options ====================

export interface IHttpRequestOptions {
  baseURL?: string;
  url?: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  body?: unknown;
  qs?: Record<string, string>;
  json?: boolean;
  timeout?: number;
  returnFullResponse?: boolean;
  ignoreHttpStatusErrors?: boolean;
}

// ==================== Node Type Description ====================

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon?: string;
  iconColor?: string;
  group: string[];
  version: number | number[];
  subtitle?: string;
  description: string;
  defaults: {
    name: string;
    color?: string;
  };
  inputs: string[];
  outputs: string[];
  credentials?: INodeCredentialDescription[];
  properties: INodeProperties[];
  // Declarative-style request defaults
  requestDefaults?: IHttpRequestOptions;
  // For webhook/trigger nodes
  webhooks?: IWebhookDescription[];
  // Polling trigger
  polling?: boolean;
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string;
  path: string;
  responseMode?: 'onReceived' | 'lastNode';
}

// ==================== Execution Types ====================

export interface INodeExecutionData {
  json: Record<string, unknown>;
  binary?: IBinaryData;
  pairedItem?: IPairedItemData | IPairedItemData[];
}

export interface IBinaryData {
  [key: string]: {
    data: string;
    mimeType: string;
    fileName?: string;
    fileSize?: number;
  };
}

export interface IPairedItemData {
  item: number;
  input?: number;
}

// ==================== Execute Functions Context ====================

export interface IExecuteFunctions {
  // Input data
  getInputData(inputIndex?: number): INodeExecutionData[];
  
  // Parameters
  getNodeParameter(
    parameterName: string,
    itemIndex: number,
    fallbackValue?: NodeParameterValue
  ): NodeParameterValue | Record<string, unknown>;
  
  // Credentials
  getCredentials(type: string): Promise<Record<string, unknown>>;
  
  // HTTP helpers
  helpers: IExecuteFunctionsHelpers;
  
  // Workflow info
  getNode(): INode;
  getWorkflow(): { id: string; name: string };
  getMode(): 'manual' | 'trigger' | 'internal';
  
  // Continue on fail
  continueOnFail(): boolean;
}

export interface IExecuteFunctionsHelpers {
  request(options: IHttpRequestOptions): Promise<unknown>;
  requestWithAuthentication(
    credentialsType: string,
    options: IHttpRequestOptions
  ): Promise<unknown>;
  httpRequest(options: IHttpRequestOptions): Promise<unknown>;
  httpRequestWithAuthentication(
    credentialsType: string,
    options: IHttpRequestOptions
  ): Promise<unknown>;
  prepareBinaryData(
    binaryData: Buffer,
    fileName?: string,
    mimeType?: string
  ): Promise<IBinaryData>;
  getBinaryDataBuffer(
    itemIndex: number,
    propertyName: string
  ): Promise<Buffer>;
}

export interface INode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
}

// ==================== Main Node Type Interface ====================

export interface INodeType {
  description: INodeTypeDescription;
  
  // Programmatic style - implement execute method
  execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  
  // Trigger nodes
  trigger?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | undefined>;
  
  // Webhook nodes
  webhook?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | undefined>;
  
  // For polling triggers
  poll?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | undefined>;
  
  // Methods for loading dynamic options
  methods?: {
    loadOptions?: {
      [key: string]: (this: IExecuteFunctions) => Promise<INodePropertyOptions[]>;
    };
    credentialTest?: {
      [key: string]: (this: IExecuteFunctions, credentials: Record<string, unknown>) => Promise<{ status: 'OK' | 'Error'; message?: string }>;
    };
  };
}

// ==================== Node Package Manifest ====================

export interface INodePackageJson {
  name: string;
  version: string;
  description?: string;
  typeflow?: {
    nodesApiVersion?: number;
    credentials?: string[];
    nodes?: string[];
  };
}

// ==================== Node Registration ====================

export interface ILoadedNode {
  type: INodeType;
  sourcePath: string;
  packageName: string;
}

export interface ILoadedCredential {
  type: ICredentialType;
  sourcePath: string;
  packageName: string;
}
