import { router } from "./trpc";
import { organizationsRouter } from "./routers/organizations";
import { workflowsRouter } from "./routers/workflows";
import { packagesRouter } from "./routers/packages";
import { executionsRouter } from "./routers/executions";
import { environmentsRouter } from "./routers/environments";
import { webhooksRouter } from "./routers/webhooks";
import { credentialsRouter } from "./routers/credentials";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  auth: authRouter,
  organizations: organizationsRouter,
  workflows: workflowsRouter,
  packages: packagesRouter,
  executions: executionsRouter,
  environments: environmentsRouter,
  webhooks: webhooksRouter,
  credentials: credentialsRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
