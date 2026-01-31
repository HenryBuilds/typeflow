import { router } from "./trpc";
import { organizationsRouter } from "./routers/organizations";
import { workflowsRouter } from "./routers/workflows";
import { workflowVersionsRouter } from "./routers/workflow-versions";
import { packagesRouter } from "./routers/packages";
import { executionsRouter } from "./routers/executions";
import { environmentsRouter } from "./routers/environments";
import { webhooksRouter } from "./routers/webhooks";
import { credentialsRouter } from "./routers/credentials";
import { authRouter } from "./routers/auth";
import { debugRouter } from "./routers/debug";
import { customNodesRouter } from "./routers/custom-nodes";
import { externalNodesRouter } from "./routers/external-nodes";

export const appRouter = router({
  auth: authRouter,
  organizations: organizationsRouter,
  workflows: workflowsRouter,
  workflowVersions: workflowVersionsRouter,
  packages: packagesRouter,
  executions: executionsRouter,
  environments: environmentsRouter,
  webhooks: webhooksRouter,
  credentials: credentialsRouter,
  debug: debugRouter,
  customNodes: customNodesRouter,
  externalNodes: externalNodesRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
