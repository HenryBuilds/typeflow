/**
 * External Nodes Router
 * 
 * TRPC router for listing external nodes loaded from packages.
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { nodeLoader } from "../services/node-loader";

export const externalNodesRouter = router({
  /**
   * List all available external nodes
   */
  list: publicProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
    }))
    .query(async () => {
      // Ensure nodes are loaded
      await nodeLoader.initialize();
      
      const nodes = nodeLoader.getAllNodeTypes();
      
      return nodes.map(node => ({
        name: node.description.name,
        displayName: node.description.displayName,
        description: node.description.description,
        icon: node.description.icon,
        group: node.description.group,
        version: node.description.version,
        inputs: node.description.inputs,
        outputs: node.description.outputs,
        properties: node.description.properties,
        isDeclarative: !node.execute,
        credentials: node.description.credentials,
      }));
    }),

  /**
   * Get a specific external node's full description
   */
  get: publicProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      name: z.string(),
    }))
    .query(async ({ input }) => {
      await nodeLoader.initialize();
      
      const node = nodeLoader.getNode(input.name);
      
      if (!node) {
        throw new Error(`External node '${input.name}' not found`);
      }
      
      return {
        description: node.description,
        hasExecute: !!node.execute,
        hasTrigger: !!node.trigger,
        hasWebhook: !!node.webhook,
      };
    }),

  /**
   * Reload external nodes (for development)
   */
  reload: publicProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
    }))
    .mutation(async () => {
      await nodeLoader.reload();
      
      return {
        success: true,
        loadedCount: nodeLoader.getAllNodeTypes().length,
      };
    }),

  /**
   * Get the custom nodes directory path
   */
  getCustomNodesPath: publicProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
    }))
    .query(() => {
      return {
        path: nodeLoader.getCustomNodesPath(),
      };
    }),
});
