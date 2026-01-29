/**
 * Typeflow Node Types
 * 
 * These are Typeflow's type definitions for node development.
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
  displayName?: string;
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
  postReceive?: unknown[];
}

// ==================== Node Properties ====================

export interface INodeTypeOptions {
  multipleValues?: boolean;
  password?: boolean;
  rows?: number;
  maxValue?: number;
  minValue?: number;
  numberStepSize?: number;
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
  authenticate?: IAuthenticateGeneric;
}

export interface IAuthenticateGeneric {
  type: 'generic' | 'bearer';
  properties: {
    headers?: Record<string, string>;
    qs?: Record<string, string>;
    body?: Record<string, string>;
  };
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
  requestDefaults?: IHttpRequestOptions;
  
  // ========== TYPEFLOW-EXCLUSIVE FEATURES ==========
  
  /**
   * Category for organizing nodes in the palette
   * E.g., 'Data Transformation', 'API Integration', 'AI/ML', 'Utilities'
   */
  category?: string;
  
  /**
   * Searchable tags for finding nodes
   */
  tags?: string[];
  
  /**
   * TypeScript/Zod schema for input data validation
   * Provides type-safe data flow between nodes
   */
  inputSchema?: IDataSchema;
  
  /**
   * TypeScript/Zod schema for output data
   * Enables autocomplete in downstream nodes
   */
  outputSchema?: IDataSchema;
  
  /**
   * Built-in test cases for the node
   * Run with `typeflow test` CLI command
   */
  testCases?: INodeTestCase[];
  
  /**
   * Extended documentation with examples
   */
  documentation?: INodeDocumentation;
  
  /**
   * AI hints for intelligent node suggestions
   * Helps Typeflow's AI understand when to suggest this node
   */
  aiHints?: {
    /** Natural language description of what this node does */
    capabilities?: string[];
    /** Example prompts that would trigger this node */
    examplePrompts?: string[];
    /** Related concepts for semantic search */
    keywords?: string[];
  };
  
  // ========== ADVANCED FEATURES ==========
  
  /**
   * Streaming configuration for real-time data processing
   * Perfect for AI responses, live feeds, large file processing
   */
  streaming?: {
    /** Enable streaming output (SSE-style) */
    enabled: boolean;
    /** Emit partial results as they become available */
    emitPartial?: boolean;
    /** Buffer size before emitting (for batching) */
    bufferSize?: number;
  };
  
  /**
   * Retry & Circuit Breaker configuration
   * Built-in resilience for unreliable APIs
   */
  resilience?: {
    retry?: {
      /** Max retry attempts */
      maxAttempts: number;
      /** Backoff strategy */
      backoff: 'fixed' | 'exponential' | 'linear';
      /** Initial delay in ms */
      initialDelay: number;
      /** Max delay in ms */
      maxDelay?: number;
      /** HTTP status codes that trigger retry */
      retryOn?: number[];
    };
    circuitBreaker?: {
      /** Failure threshold before opening circuit */
      failureThreshold: number;
      /** Time in ms before attempting to close circuit */
      resetTimeout: number;
    };
    /** Timeout in ms for the entire operation */
    timeout?: number;
  };
  
  /**
   * Caching configuration to avoid redundant API calls
   * Dramatically speeds up development & reduces costs
   */
  caching?: {
    /** Enable result caching */
    enabled: boolean;
    /** TTL in seconds */
    ttl: number;
    /** Cache key template (supports expressions) */
    keyTemplate?: string;
    /** Cache scope */
    scope: 'node' | 'workflow' | 'organization' | 'global';
    /** Invalidate cache on these events */
    invalidateOn?: string[];
  };
  
  /**
   * Parallel processing configuration
   * Process multiple items concurrently with control
   */
  parallelProcessing?: {
    /** Enable parallel execution */
    enabled: boolean;
    /** Max concurrent operations */
    concurrency: number;
    /** Batch items into groups */
    batchSize?: number;
    /** Strategy for handling errors in parallel execution */
    errorStrategy: 'fail-fast' | 'continue' | 'collect-errors';
  };
  
  /**
   * Cost estimation for API operations
   * Preview costs before executing expensive workflows
   */
  costEstimation?: {
    /** Cost per execution in credits/cents */
    perExecution?: number;
    /** Cost per item processed */
    perItem?: number;
    /** Dynamic cost calculation expression */
    formula?: string;
    /** Cost category for reporting */
    category?: 'api' | 'compute' | 'storage' | 'ai';
    /** Warning threshold */
    warningThreshold?: number;
  };
  
  /**
   * Lifecycle hooks for advanced control
   * Run custom logic before/after execution
   */
  hooks?: {
    /** Run before execution starts */
    beforeExecute?: string;
    /** Run after successful execution */
    afterExecute?: string;
    /** Run on error (can modify error or recover) */
    onError?: string;
    /** Run for each item (streaming mode) */
    onItem?: string;
    /** Validate parameters before execution */
    validateParams?: string;
  };
  
  /**
   * Rate limiting to prevent API abuse
   */
  rateLimiting?: {
    /** Max requests per window */
    maxRequests: number;
    /** Window size in seconds */
    windowSeconds: number;
    /** Scope for rate limiting */
    scope: 'node' | 'workflow' | 'organization' | 'global';
    /** Strategy when limit is reached */
    strategy: 'queue' | 'drop' | 'error';
  };
  
  /**
   * Secrets references for secure credential usage
   * Reference secrets by name without exposing values
   */
  secretRefs?: {
    /** Secret name to reference */
    name: string;
    /** Where to inject the secret */
    injectAs: 'header' | 'query' | 'body' | 'env';
    /** Key name for injection */
    key: string;
  }[];
  
  /**
   * Live preview configuration
   * Show real-time data preview while configuring
   */
  livePreview?: {
    /** Enable live preview */
    enabled: boolean;
    /** Debounce time in ms before triggering preview */
    debounce?: number;
    /** Max items to show in preview */
    maxItems?: number;
    /** Fields to highlight changes */
    highlightFields?: string[];
  };
  
  /**
   * Performance tracking configuration
   * Built-in metrics and observability
   */
  telemetry?: {
    /** Track execution time */
    trackDuration: boolean;
    /** Track memory usage */
    trackMemory?: boolean;
    /** Track item count */
    trackItems?: boolean;
    /** Custom metrics to track */
    customMetrics?: {
      name: string;
      type: 'counter' | 'gauge' | 'histogram';
      expression: string;
    }[];
    /** Emit events for external systems */
    emitEvents?: boolean;
  };
  
  /**
   * Conditional outputs - route data to different outputs based on conditions
   * More powerful than simple if/else
   */
  conditionalOutputs?: {
    /** Output name */
    name: string;
    /** Condition expression */
    condition: string;
    /** Description for the UI */
    description?: string;
  }[];
  
  /**
   * Transformation presets - common transformations users can apply
   */
  transformPresets?: {
    /** Preset name */
    name: string;
    /** Description */
    description: string;
    /** Preset configuration */
    config: Record<string, unknown>;
  }[];
  
  /**
   * Auto-fix suggestions when errors occur
   */
  errorRecovery?: {
    /** Error pattern to match */
    pattern: string;
    /** Suggested fix */
    suggestion: string;
    /** Auto-apply the fix */
    autoFix?: boolean;
    /** Code to execute for recovery */
    recoveryCode?: string;
  }[];
}

// ==================== Typeflow-Exclusive Types ====================

/**
 * Schema definition for type-safe data flow
 */
export interface IDataSchema {
  /** TypeScript type as a string (for display/documentation) */
  typescript?: string;
  /** JSON Schema for runtime validation */
  jsonSchema?: Record<string, unknown>;
  /** Example data matching this schema */
  example?: unknown;
}

/**
 * Test case for automated node testing
 */
export interface INodeTestCase {
  /** Test case name */
  name: string;
  /** Test description */
  description?: string;
  /** Input data for the test */
  input: INodeExecutionData[];
  /** Node parameters to use */
  parameters: Record<string, unknown>;
  /** Expected output (for assertion) */
  expectedOutput?: INodeExecutionData[];
  /** If true, expect this test to throw an error */
  shouldThrow?: boolean;
}

/**
 * Extended documentation for the node
 */
export interface INodeDocumentation {
  /** Detailed description with markdown support */
  longDescription?: string;
  /** Usage examples with code */
  examples?: INodeExample[];
  /** Links to external resources */
  externalLinks?: { title: string; url: string }[];
  /** Video tutorial URL */
  videoUrl?: string;
  /** Changelog for this node */
  changelog?: { version: string; changes: string[] }[];
}

/**
 * Example usage of a node
 */
export interface INodeExample {
  /** Example title */
  title: string;
  /** Description of what this example demonstrates */
  description?: string;
  /** Input data */
  input?: unknown;
  /** Parameters used */
  parameters?: Record<string, unknown>;
  /** Expected output */
  output?: unknown;
}

// ==================== Execution Types ====================

export interface INodeExecutionData {
  json: Record<string, unknown>;
  binary?: IBinaryData;
}

export interface IBinaryData {
  [key: string]: {
    data: string;
    mimeType: string;
    fileName?: string;
  };
}

// ==================== Execute Functions Context ====================

export interface IExecuteFunctions {
  getInputData(inputIndex?: number): INodeExecutionData[];
  getNodeParameter(
    parameterName: string,
    itemIndex: number,
    fallbackValue?: NodeParameterValue
  ): NodeParameterValue | Record<string, unknown>;
  getCredentials(type: string): Promise<Record<string, unknown>>;
  helpers: IExecuteFunctionsHelpers;
  getNode(): INode;
  getWorkflow(): { id: string; name: string };
  getMode(): 'manual' | 'trigger' | 'internal';
  continueOnFail(): boolean;
}

export interface IExecuteFunctionsHelpers {
  request(options: IHttpRequestOptions): Promise<unknown>;
  httpRequest(options: IHttpRequestOptions): Promise<unknown>;
  prepareBinaryData(
    binaryData: Buffer,
    fileName?: string,
    mimeType?: string
  ): Promise<IBinaryData>;
}

export interface INode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

// ==================== Main Node Type Interface ====================

export interface INodeType {
  description: INodeTypeDescription;
  execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  trigger?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | undefined>;
  webhook?(this: IExecuteFunctions): Promise<INodeExecutionData[][] | undefined>;
}
