'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { DocsPageLayout, SectionHeading, Prose, type DocSection } from '../components';

const sections: DocSection[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'manual-testing', title: 'Manual Testing' },
  { id: 'breakpoints', title: 'Breakpoints' },
  { id: 'debug-panel', title: 'Debug Panel' },
  { id: 'step-execution', title: 'Step Execution' },
  { id: 'logs', title: 'Execution Logs' },
];

export default function TestingDocsPage() {
  return (
    <DocsPageLayout
      title="Testing Workflows"
      subtitle="Debug and test your workflows with breakpoints, step-by-step execution, and detailed logs."
      sections={sections}
    >
      {/* Overview */}
      <section id="overview">
        <SectionHeading id="overview">Overview</SectionHeading>
        <Prose>
          <p>
            Typeflow provides several tools to help you build and debug reliable workflows:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Manual Execution</strong> — Run workflows with test data</li>
            <li><strong>Breakpoints</strong> — Pause execution at any node</li>
            <li><strong>Data Inspection</strong> — View data at each step</li>
          </ul>
          <p>
            These features work together to give you full visibility into how your
            workflows process data, making it easy to catch bugs before they reach
            production.
          </p>
        </Prose>
      </section>

      {/* Manual Testing */}
      <section id="manual-testing">
        <SectionHeading id="manual-testing">Manual Testing</SectionHeading>
        <Prose>
          <p>To run a test execution:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your workflow in the editor</li>
            <li>Click the <strong>Run</strong> button in the toolbar (or press <code className="bg-muted px-1 rounded">Ctrl+Enter</code>)</li>
            <li>If using a Manual Trigger, enter test input data</li>
            <li>Watch the execution progress through each node</li>
            <li>View results in the output panel</li>
          </ol>
        </Prose>

        <Card className="bg-card/50 mt-4">
          <CardHeader>
            <CardTitle className="text-foreground">Test Data</CardTitle>
            <CardDescription>Provide sample input for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="json"
              code={`// Manual Trigger test data
{
  "users": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ],
  "action": "notify"
}`} />
          </CardContent>
        </Card>
      </section>

      {/* Breakpoints */}
      <section id="breakpoints">
        <SectionHeading id="breakpoints">Breakpoints</SectionHeading>
        <Prose>
          <p>
            Breakpoints pause workflow execution before a node runs, allowing you to
            inspect data and debug issues.
          </p>
        </Prose>

        <Card className="bg-card/50 mt-4">
          <CardHeader>
            <CardTitle className="text-foreground">Setting Breakpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Toggle Breakpoint</h4>
                <p className="text-sm text-muted-foreground">Right-click on a node &rarr; &quot;Toggle Breakpoint&quot; (or press <code className="bg-muted px-1 rounded">B</code>)</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Visual Indicator</h4>
                <p className="text-sm text-muted-foreground">Nodes with breakpoints show a red dot in the corner</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Continue Execution</h4>
                <p className="text-sm text-muted-foreground">Click &quot;Continue&quot; or press <code className="bg-muted px-1 rounded">F5</code> to resume</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 mt-4">
          <CardHeader>
            <CardTitle className="text-foreground">Conditional Breakpoints</CardTitle>
            <CardDescription>Break only when a condition is met</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// Right-click → "Edit Breakpoint Condition"

// Break when item count is high
$input.all().length > 100

// Break on specific value
$json.status === "error"

// Break on null values
$json.userId === null`} />
          </CardContent>
        </Card>
      </section>

      {/* Debug Panel */}
      <section id="debug-panel">
        <SectionHeading id="debug-panel">Debug Panel</SectionHeading>
        <Prose>
          <p>
            Open the debug panel from the toolbar to inspect execution state. It shows:
          </p>
        </Prose>

        <Card className="bg-card/50 mt-4">
          <CardContent className="pt-6">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Execution Status</span>
                <span className="text-muted-foreground">Running, Paused, Completed, Failed</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Node Outputs</span>
                <span className="text-muted-foreground">Data produced by each node</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Execution Time</span>
                <span className="text-muted-foreground">Duration for each node</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Item Count</span>
                <span className="text-muted-foreground">Number of items processed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Step Execution */}
      <section id="step-execution">
        <SectionHeading id="step-execution">Step Execution</SectionHeading>
        <Prose>
          <p>
            Instead of running the entire workflow, you can execute nodes individually:
          </p>
        </Prose>

        <Card className="bg-card/50 mt-4">
          <CardContent className="pt-6 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">Run Single Node</h4>
              <p className="text-sm text-muted-foreground">Right-click on a node &rarr; &quot;Execute Node&quot;</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">Run to Here</h4>
              <p className="text-sm text-muted-foreground">Execute all nodes up to and including the selected node</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">Step Over</h4>
              <p className="text-sm text-muted-foreground">When paused, execute just the next node</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Logs */}
      <section id="logs">
        <SectionHeading id="logs">Execution Logs</SectionHeading>
        <Prose>
          <p>
            Workflow executions produce logs at different severity levels. Use the
            execution log panel to filter and inspect them.
          </p>
        </Prose>

        <Card className="bg-card/50 mt-4">
          <CardHeader>
            <CardTitle className="text-foreground">Log Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                <span className="font-medium text-foreground">DEBUG</span>
                <span className="text-muted-foreground">Detailed execution information</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span className="font-medium text-foreground">INFO</span>
                <span className="text-muted-foreground">General execution events</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span>
                <span className="font-medium text-foreground">WARN</span>
                <span className="text-muted-foreground">Potential issues</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span className="font-medium text-foreground">ERROR</span>
                <span className="text-muted-foreground">Execution failures</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 mt-4">
          <CardHeader>
            <CardTitle className="text-foreground">Custom Logging</CardTitle>
            <CardDescription>Add your own log messages in Code nodes</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="typescript"
              code={`// In a Code node
console.log('Processing item:', $json.id);
console.warn('Large dataset:', items.length);

// Logs appear in the execution log panel
// and are stored for debugging later`} />
          </CardContent>
        </Card>
      </section>
    </DocsPageLayout>
  );
}
