import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "@/db/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
          name: input.name,
          isActive: true,
        })
        .returning();

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValidPassword = await bcrypt.compare(
        input.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Account is inactive",
        });
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        token,
      };
    }),

  logout: publicProcedure.mutation(async () => {
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }),
});
