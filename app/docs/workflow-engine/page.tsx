'use client';

import { DocsPageLayout, SectionHeading, Prose, type DocSection } from '../components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';

const sections: DocSection[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'execution-model', title: 'Execution Model' },
  { id: 'data-flow', title: 'Data Flow' },
  { id: 'branching', title: 'Branching & Merging' },
  { id: 'loops', title: 'Loops & Iterations' },
  { id: 'error-handling', title: 'Error Handling' },
];

export default function WorkflowEngineDocsPage() {
  return (
    <DocsPageLayout
      title="Workflow Engine"
      subtitle="How Typeflow executes workflows, handles data flow, and manages complex execution patterns."
      sections={sections}
    >
      {/* Overview */}
      <section id="overview" className="scroll-mt-8">
        <SectionHeading id="overview">Overview</SectionHeading>
        <Prose>
          <p>
            Typeflow&apos;s workflow engine is a directed acyclic graph (DAG) executor that
            processes nodes in topological order. Each node receives input data, performs its
            operation, and passes output to connected nodes.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Node-based</strong> &mdash; each operation
              is a discrete node with inputs and outputs.
            </li>
            <li>
              <strong className="text-foreground">Type-safe</strong> &mdash; data types are
              validated between node connections.
            </li>
            <li>
              <strong className="text-foreground">Stateful</strong> &mdash; execution state
              persists for debugging and replay.
            </li>
          </ul>
        </Prose>
      </section>

      {/* Execution Model */}
      <section id="execution-model" className="scroll-mt-8">
        <SectionHeading id="execution-model">Execution Model</SectionHeading>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-foreground">Sequential Execution</CardTitle>
            <CardDescription>Nodes execute in dependency order</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// Execution order is determined by connections
// Node A → Node B → Node C

1. Trigger fires (webhook, schedule, manual)
2. Engine resolves execution order
3. Each node receives input from predecessors
4. Output is stored and passed to successors
5. Workflow completes when all paths finish`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Parallel Execution</CardTitle>
            <CardDescription>Independent branches run concurrently</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// Branches without dependencies execute in parallel
//
//       → Node B →
// Node A            → Node D
//       → Node C →

// Node B and Node C run simultaneously
// Node D waits for both to complete`} />
          </CardContent>
        </Card>
      </section>

      {/* Data Flow */}
      <section id="data-flow" className="scroll-mt-8">
        <SectionHeading id="data-flow">Data Flow</SectionHeading>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-foreground">Input Data Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="typescript"
              showLineNumbers
              code={`// Each node receives an array of items
interface NodeExecutionData {
  json: Record<string, unknown>;  // Main data payload
  binary?: Record<string, Buffer>; // File attachments
  pairedItem?: { item: number };   // Item tracking
}

// Access previous node data with expressions
"{{ $json.fieldName }}"           // Current item
"{{ $node['NodeName'].json }}"    // Specific node
"{{ $input.all() }}"              // All input items`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Expression Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-0.5">
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <code className="text-primary">$json</code>
                <span className="text-muted-foreground">Current item&apos;s JSON data</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <code className="text-primary">$input</code>
                <span className="text-muted-foreground">All input items from previous node</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <code className="text-primary">$node[&apos;Name&apos;]</code>
                <span className="text-muted-foreground">Access specific node output</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <code className="text-primary">$workflow</code>
                <span className="text-muted-foreground">Workflow metadata</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-muted/50">
                <code className="text-primary">$execution</code>
                <span className="text-muted-foreground">Current execution context</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Branching */}
      <section id="branching" className="scroll-mt-8">
        <SectionHeading id="branching">Branching &amp; Merging</SectionHeading>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-foreground">IF/Switch Nodes</CardTitle>
            <CardDescription>Route data based on conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// IF node routes items to different outputs
Output 0 (true):  Items matching condition
Output 1 (false): Items not matching condition

// Switch node for multiple routes
Output 0: value === "option1"
Output 1: value === "option2"
Output 2: fallback (default)`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Merge Node</CardTitle>
            <CardDescription>Combine multiple branches</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// Merge modes:
- Append:     Combine all items from all inputs
- Combine:    Match items by position or key
- Wait:       Wait for all branches before continuing
- Multiplex:  Create combinations of items`} />
          </CardContent>
        </Card>
      </section>

      {/* Loops */}
      <section id="loops" className="scroll-mt-8">
        <SectionHeading id="loops">Loops &amp; Iterations</SectionHeading>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Processing Multiple Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Prose>
              <p>
                By default, nodes process all input items. Each item flows through the node
                sequentially.
              </p>
            </Prose>
            <CodeBlock
              language="typescript"
              code={`// Input: 3 items
[{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]

// Code node with expression
"Hello, {{ $json.name }}!"

// Output: 3 items
["Hello, Alice!", "Hello, Bob!", "Hello, Charlie!"]`} />
            <Prose>
              <p>
                Use the <strong className="text-foreground">Split Out</strong> node to expand
                arrays into individual items, and{' '}
                <strong className="text-foreground">Aggregate</strong> to collect items back
                into an array.
              </p>
            </Prose>
          </CardContent>
        </Card>
      </section>

      {/* Error Handling */}
      <section id="error-handling" className="scroll-mt-8">
        <SectionHeading id="error-handling">Error Handling</SectionHeading>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-foreground">Error Handling Strategies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded bg-muted/50">
                <p className="font-medium text-foreground">Stop on Error (Default)</p>
                <p className="text-muted-foreground">
                  Workflow stops immediately when any node fails.
                </p>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <p className="font-medium text-foreground">Continue on Error</p>
                <p className="text-muted-foreground">
                  Skip failed items and continue with remaining.
                </p>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <p className="font-medium text-foreground">Retry on Failure</p>
                <p className="text-muted-foreground">
                  Automatically retry failed operations with backoff.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Error Output</CardTitle>
            <CardDescription>Route errors to a separate path</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// Enable "Error Output" on any node
// Failed items route to Output 1 instead of stopping

//              → Success path (Output 0)
// HTTP Request
//              → Error path (Output 1)
//                ↓
//              Slack notification / Retry logic`} />
          </CardContent>
        </Card>
      </section>
    </DocsPageLayout>
  );
}
