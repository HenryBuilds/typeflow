/**
 * Database Executor Module
 * Handles execution of database nodes: PostgreSQL, MySQL, MongoDB, Redis
 */

import { nodes } from "@/db/schema";
import { credentialService, PostgresCredential, MySQLCredential, MongoDBCredential, RedisCredential } from "./credential-service";
import type { ExecutionItem } from "@/types/execution";

// Helper to interpolate expressions like {{ $json.field }} in strings
export function interpolateExpressions(template: string, inputItems: ExecutionItem[]): string {
  if (!template) return template;
  
  const item = inputItems[0]?.json || {};
  
  return template.replace(/\{\{\s*\$json\.([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
    const parts = path.split('.');
    let value: unknown = item;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return match; // Keep original if path doesn't exist
      }
    }
    return String(value ?? '');
  });
}

// PostgreSQL node execution
export async function executePostgresNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  organizationId: string
): Promise<ExecutionItem[]> {
  const config = node.config as {
    credentialId?: string;
    operation?: string;
    query?: string;
    table?: string;
  };

  if (!config.credentialId) {
    throw new Error("No credential configured for PostgreSQL node");
  }

  const creds = await credentialService.getCredentials(organizationId);
  const pgClient = Object.values(creds).find(c => c instanceof PostgresCredential) as PostgresCredential | undefined;
  
  if (!pgClient) {
    throw new Error("PostgreSQL credential not found");
  }

  try {
    const query = interpolateExpressions(config.query || '', inputItems);
    const result = await pgClient.query(query);
    
    if (Array.isArray(result.rows)) {
      return result.rows.map((row: Record<string, unknown>) => ({ json: row }));
    }
    
    return [{ json: { rowCount: result.rowCount, success: true } }];
  } finally {
    await pgClient.disconnect();
  }
}

// MySQL node execution
export async function executeMySQLNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  organizationId: string
): Promise<ExecutionItem[]> {
  const config = node.config as {
    credentialId?: string;
    operation?: string;
    query?: string;
    table?: string;
  };

  if (!config.credentialId) {
    throw new Error("No credential configured for MySQL node");
  }

  const creds = await credentialService.getCredentials(organizationId);
  const mysqlClient = Object.values(creds).find(c => c instanceof MySQLCredential) as MySQLCredential | undefined;
  
  if (!mysqlClient) {
    throw new Error("MySQL credential not found");
  }

  try {
    const query = interpolateExpressions(config.query || '', inputItems);
    const [rows] = await mysqlClient.query(query) as [unknown[], unknown];
    
    if (Array.isArray(rows)) {
      return rows.map((row) => ({ json: row as Record<string, unknown> }));
    }
    
    return [{ json: { result: rows, success: true } }];
  } finally {
    await mysqlClient.disconnect();
  }
}

// MongoDB node execution
export async function executeMongoDBNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  organizationId: string
): Promise<ExecutionItem[]> {
  const config = node.config as {
    credentialId?: string;
    operation?: string;
    collection?: string;
    query?: string;
  };

  if (!config.credentialId) {
    throw new Error("No credential configured for MongoDB node");
  }

  const creds = await credentialService.getCredentials(organizationId);
  const mongoClient = Object.values(creds).find(c => c instanceof MongoDBCredential) as MongoDBCredential | undefined;
  
  if (!mongoClient) {
    throw new Error("MongoDB credential not found");
  }

  try {
    const collection = await mongoClient.collection(config.collection || 'default');
    const queryStr = interpolateExpressions(config.query || '{}', inputItems);
    const query = JSON.parse(queryStr);
    
    let result: unknown;
    switch (config.operation) {
      case 'find':
        result = await collection.find(query).toArray();
        break;
      case 'findOne':
        result = await collection.findOne(query);
        break;
      case 'insertOne':
        result = await collection.insertOne(query);
        break;
      case 'insertMany':
        result = await collection.insertMany(Array.isArray(query) ? query : [query]);
        break;
      case 'updateOne':
        result = await collection.updateOne(query.filter || {}, query.update || {});
        break;
      case 'updateMany':
        result = await collection.updateMany(query.filter || {}, query.update || {});
        break;
      case 'deleteOne':
        result = await collection.deleteOne(query);
        break;
      case 'deleteMany':
        result = await collection.deleteMany(query);
        break;
      case 'aggregate':
        result = await collection.aggregate(Array.isArray(query) ? query : [query]).toArray();
        break;
      default:
        result = await collection.find(query).toArray();
    }
    
    if (Array.isArray(result)) {
      return result.map(doc => ({ json: doc as Record<string, unknown> }));
    }
    
    return [{ json: result as Record<string, unknown> }];
  } finally {
    await mongoClient.disconnect();
  }
}

// Redis node execution
export async function executeRedisNode(
  node: typeof nodes.$inferSelect,
  inputItems: ExecutionItem[],
  organizationId: string
): Promise<ExecutionItem[]> {
  const config = node.config as {
    credentialId?: string;
    operation?: string;
    key?: string;
    value?: string;
    field?: string;
  };

  if (!config.credentialId) {
    throw new Error("No credential configured for Redis node");
  }

  const creds = await credentialService.getCredentials(organizationId);
  const redisClient = Object.values(creds).find(c => c instanceof RedisCredential) as RedisCredential | undefined;
  
  if (!redisClient) {
    throw new Error("Redis credential not found");
  }

  try {
    const key = interpolateExpressions(config.key || '', inputItems);
    const value = interpolateExpressions(config.value || '', inputItems);
    
    let result: unknown;
    switch (config.operation) {
      case 'get':
        result = await redisClient.get(key);
        break;
      case 'set':
        result = await redisClient.set(key, value);
        break;
      default:
        result = await redisClient.get(key);
    }
    
    return [{ json: { key, result } }];
  } finally {
    await redisClient.disconnect();
  }
}
