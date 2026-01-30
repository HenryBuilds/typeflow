import { db } from "@/db/db";
import { credentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptObject } from "@/lib/encryption";
import { Client as PgClient } from "pg";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import { createClient as createRedisClient } from "redis";
import { createLogger } from "@/lib/logger";

const log = createLogger('CredentialService');

// Type definitions for different credential configs
export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface MongoDBConfig {
  connectionString: string;
  database: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
}

export type CredentialConfig = PostgresConfig | MySQLConfig | MongoDBConfig | RedisConfig;

// Client wrapper classes
export class PostgresCredential {
  private client: PgClient;
  private connected = false;

  constructor(private config: PostgresConfig) {
    this.client = new PgClient({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async query(sql: string, params?: unknown[]) {
    await this.connect();
    return this.client.query(sql, params);
  }

  async disconnect() {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }
}

export class MySQLCredential {
  private connection: mysql.Connection | null = null;

  constructor(private config: MySQLConfig) {}

  async connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
      });
    }
  }

  async query(sql: string, params?: unknown[]) {
    await this.connect();
    return this.connection!.query(sql, params);
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}

export class MongoDBCredential {
  private client: MongoClient | null = null;
  private dbName: string;

  constructor(private config: MongoDBConfig) {
    this.dbName = config.database;
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(this.config.connectionString);
      await this.client.connect();
    }
  }

  async getDb() {
    await this.connect();
    return this.client!.db(this.dbName);
  }

  async collection(name: string) {
    const db = await this.getDb();
    return db.collection(name);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

export class RedisCredential {
  private client: ReturnType<typeof createRedisClient> | null = null;

  constructor(private config: RedisConfig) {}

  async connect() {
    if (!this.client) {
      this.client = createRedisClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
        },
        password: this.config.password,
        database: this.config.database,
      });
      await this.client.connect();
    }
  }

  async get(key: string) {
    await this.connect();
    return this.client!.get(key);
  }

  async set(key: string, value: string) {
    await this.connect();
    return this.client!.set(key, value);
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export type CredentialClient = PostgresCredential | MySQLCredential | MongoDBCredential | RedisCredential;

// Main service class
export class CredentialService {
  private clientCache: Map<string, CredentialClient> = new Map();

  async getCredentials(organizationId: string): Promise<Record<string, CredentialClient>> {
    const creds = await db.query.credentials.findMany({
      where: eq(credentials.organizationId, organizationId),
    });

    const credentialClients: Record<string, CredentialClient> = {};

    for (const cred of creds) {
      const cacheKey = `${organizationId}:${cred.id}`;
      
      // Check cache first
      if (this.clientCache.has(cacheKey)) {
        credentialClients[cred.name] = this.clientCache.get(cacheKey)!;
        continue;
      }

      // Decrypt and create client
      try {
        const config = decryptObject<CredentialConfig>(cred.config as string);
        const client = this.createClient(cred.type, config);
        
        this.clientCache.set(cacheKey, client);
        credentialClients[cred.name] = client;
      } catch (error) {
        log.error({ err: error, credential: cred.name }, 'Failed to initialize credential');
      }
    }

    return credentialClients;
  }

  private createClient(type: string, config: CredentialConfig): CredentialClient {
    switch (type) {
      case 'postgres':
        return new PostgresCredential(config as PostgresConfig);
      case 'mysql':
        return new MySQLCredential(config as MySQLConfig);
      case 'mongodb':
        return new MongoDBCredential(config as MongoDBConfig);
      case 'redis':
        return new RedisCredential(config as RedisConfig);
      default:
        throw new Error(`Unknown credential type: ${type}`);
    }
  }

  async disconnectAll() {
    for (const client of this.clientCache.values()) {
      try {
        await client.disconnect();
      } catch (error) {
        log.error({ err: error }, 'Error disconnecting client');
      }
    }
    this.clientCache.clear();
  }
}

export const credentialService = new CredentialService();
