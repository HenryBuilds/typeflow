import { pgTable, text, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';

export const packages = pgTable('packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  version: text('version').notNull(),
  // Full package.json content for type definitions
  packageJson: jsonb('package_json').$type<Record<string, unknown>>().notNull(),
  // TypeScript type definitions (if available)
  typeDefinitions: text('type_definitions'),
  // Installation metadata
  installedAt: timestamp('installed_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  // Dependencies tree
  dependencies: jsonb('dependencies').$type<Record<string, string>>(),
  devDependencies: jsonb('dev_dependencies').$type<Record<string, string>>(),
});

