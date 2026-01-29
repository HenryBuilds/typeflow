import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// typeflow-style node property definition
export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface INodeProperty {
  displayName: string;
  name: string;
  type: "string" | "number" | "boolean" | "options" | "multiOptions" | "json" | "collection";
  default?: unknown;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: INodePropertyOptions[];
  typeOptions?: {
    multipleValues?: boolean;
    password?: boolean;
    rows?: number;
  };
}

export interface INodeCredentialDescription {
  name: string;
  required: boolean;
}

// typeflow-style node description
export interface INodeTypeDescription {
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  icon?: string;
  color?: string;
  inputs: string[];
  outputs: string[];
  credentials?: INodeCredentialDescription[];
  properties: INodeProperty[];
}

export const customNodes = pgTable(
  "custom_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    // typeflow-style description object (stored as JSON)
    description: jsonb("description").$type<INodeTypeDescription>().notNull(),

    // Execute method code (TypeScript)
    executeCode: text("execute_code").notNull(),

    // Optional type definitions for this node
    typeDefinitions: text("type_definitions"),

    // Publishing status
    isPublished: boolean("is_published").default(false).notNull(),

    // Versioning
    version: integer("version").default(1).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
  // Note: Uniqueness of node name per organization is enforced at the application level
);
