import { router } from "./trpc";
import { organizationsRouter } from "./routers/organizations";
import { workflowsRouter } from "./routers/workflows";
import { packagesRouter } from "./routers/packages";
import { executionsRouter } from "./routers/executions";
import { environmentsRouter } from "./routers/environments";
import { webhooksRouter } from "./routers/webhooks";

export const appRouter = router({
  organizations: organizationsRouter,
  workflows: workflowsRouter,
  packages: packagesRouter,
  executions: executionsRouter,
  environments: environmentsRouter,
  webhooks: webhooksRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
