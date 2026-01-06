/**
 * BEISPIEL: Wie protectedProcedure mit echter Authentifizierung funktionieren würde
 * 
 * Dies ist eine Beispiel-Datei, die zeigt, wie die Middleware-Kette funktioniert.
 * Die echte Implementierung ist in server/trpc.ts
 */

import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { db } from "@/db/db";
import { users, organizations, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const t = initTRPC.context<Context>().create();

/**
 * BEISPIEL 1: Protected Procedure mit echter Auth-Prüfung
 */
export const protectedProcedureExample = t.procedure.use(async ({ ctx, next }) => {
  // Schritt 1: Prüfe ob User eingeloggt ist
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  // Schritt 2: Lade User-Daten aus der Datenbank
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
  });

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }

  if (!user.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account is inactive",
    });
  }

  // Schritt 3: Erweitere Context mit User-Daten
  return next({
    ctx: {
      ...ctx,        // db, userId bleiben erhalten
      user,          // Neu: User-Objekt ist jetzt verfügbar
    },
  });
});

/**
 * BEISPIEL 2: Organization Procedure mit Membership-Prüfung
 */
export const organizationProcedureExample = protectedProcedureExample
  .input(
    z.object({
      organizationId: z.string().uuid(),
    })
  )
  .use(async ({ ctx, input, next }) => {
    // Schritt 1: Prüfe ob Organisation existiert
    const organization = await ctx.db.query.organizations.findFirst({
      where: eq(organizations.id, input.organizationId),
    });

    if (!organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // Schritt 2: Prüfe ob User Mitglied der Organisation ist
    const membership = await ctx.db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, ctx.userId!)
      ),
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    // Schritt 3: Erweitere Context mit Organisation und Membership
    return next({
      ctx: {
        ...ctx,           // db, userId, user bleiben erhalten
        organization,      // Neu: Organisation ist jetzt verfügbar
        membership,        // Neu: Membership-Info ist jetzt verfügbar
      },
    });
  });

/**
 * BEISPIEL 3: Verwendung in einem Router
 */
export const exampleRouter = t.router({
  // Public - jeder kann aufrufen
  publicEndpoint: t.procedure.query(() => {
    return { message: "This is public" };
  }),

  // Protected - nur eingeloggte User
  getUserProfile: protectedProcedureExample.query(async ({ ctx }) => {
    // ctx.user ist verfügbar (von protectedProcedureExample)
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),

  // Organization - User muss Mitglied sein
  getOrganizationWorkflows: organizationProcedureExample.query(async ({ ctx }) => {
    // ctx.organization ist verfügbar (von organizationProcedureExample)
    // ctx.membership ist verfügbar (mit role, etc.)
    // ctx.user ist verfügbar (von protectedProcedureExample)
    
    return {
      organization: ctx.organization,
      userRole: ctx.membership.role,
      // ... weitere Daten
    };
  }),
});

/**
 * VISUELLER FLOW:
 * 
 * Client ruft auf: trpc.example.getOrganizationWorkflows.useQuery({ organizationId: "123" })
 * 
 * 1. createContext() wird aufgerufen
 *    → { db, userId: "user-123" }
 * 
 * 2. protectedProcedureExample Middleware
 *    → Prüft: ctx.userId vorhanden? ✅
 *    → Lädt User aus DB
 *    → Prüft: User aktiv? ✅
 *    → Context: { db, userId, user }
 * 
 * 3. organizationProcedureExample Middleware
 *    → Validiert Input: { organizationId: "123" }
 *    → Lädt Organisation aus DB
 *    → Prüft: Organisation existiert? ✅
 *    → Lädt Membership aus DB
 *    → Prüft: User ist Mitglied? ✅
 *    → Context: { db, userId, user, organization, membership }
 * 
 * 4. Handler wird ausgeführt
 *    → Kann auf alle Context-Werte zugreifen
 *    → Gibt Ergebnis zurück
 */

