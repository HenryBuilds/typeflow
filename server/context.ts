import type { db } from "@/db/db";
import type { Organization } from "@/db/schema";

export type Context = {
  db: typeof db;
  userId: string | null;
};

export type OrganizationContext = Context & {
  organization: Organization;
};
