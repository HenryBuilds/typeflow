'use client';

import { DocsPageLayout, SectionHeading, Prose, type DocSection } from '../components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';

const sections: DocSection[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'webhooks', title: 'Webhooks' },
  { id: 'manual', title: 'Manual Trigger' },
  { id: 'schedule', title: 'Schedule Trigger' },
  { id: 'security', title: 'Webhook Security' },
];

export default function TriggersDocsPage() {
  return (
    <DocsPageLayout
      title="Triggers & Webhooks"
      subtitle="Start workflows automatically with webhooks, schedules, and manual triggers."
      sections={sections}
    >
      {/* Overview */}
      <section id="overview">
        <SectionHeading id="overview">Overview</SectionHeading>
        <Prose>
          <p>
            Every workflow starts with a trigger — the event that kicks off
            execution. Typeflow supports three trigger types:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Webhook</strong> — trigger via HTTP request from external
              services (GitHub, Stripe, custom apps, etc.).
            </li>
            <li>
              <strong>Schedule</strong> — run on a cron schedule (every 5
              minutes, hourly, daily, weekly, or any custom expression).
            </li>
            <li>
              <strong>Manual</strong> — run on-demand from the UI or via API
              call.
            </li>
          </ul>
          <p>
            You can only have one trigger per workflow. Choose the type that
            matches how you want execution to start, then configure its
            settings in the trigger node.
          </p>
        </Prose>
      </section>

      {/* Webhooks */}
      <section id="webhooks">
        <SectionHeading id="webhooks">Webhooks</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Creating a Webhook</CardTitle>
            <CardDescription>Receive data from external services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Add a <strong>Webhook</strong> trigger node to your workflow</li>
              <li>Configure the webhook path (e.g., <code className="bg-muted px-1 rounded">/my-webhook</code>)</li>
              <li>Choose HTTP method (GET, POST, PUT, DELETE)</li>
              <li>Activate the workflow to enable the webhook</li>
            </ol>
            <CodeBlock
              language="bash"
              code={`# Your webhook URL will be:
https://your-domain.com/api/webhooks/{webhook-id}

# Send data to trigger the workflow:
curl -X POST https://your-domain.com/api/webhooks/abc123 \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John", "email": "john@example.com"}'`}
            />
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Webhook Response</CardTitle>
            <CardDescription>Return data to the caller</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`// Default: Returns 200 OK when workflow starts

// Custom response with "Respond to Webhook" node:
{
  "status": "received",
  "id": "{{ $execution.id }}",
  "processed": true
}

// Response modes:
- Immediately: Respond before workflow completes
- Last Node: Respond with final node output
- Using Respond Node: Full control over response`}
            />
          </CardContent>
        </Card>
      </section>

      {/* Manual Trigger */}
      <section id="manual">
        <SectionHeading id="manual">Manual Trigger</SectionHeading>

        <Prose>
          <p>
            Use the Manual Trigger node to run workflows on-demand from the
            UI or via API. There are three ways to execute manually:
          </p>
        </Prose>

        <Card className="bg-card/50 mt-4">
          <CardContent className="pt-6 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">From UI</h4>
              <p className="text-sm text-muted-foreground">Click the &quot;Run&quot; button in the workflow editor</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">Via API</h4>
              <p className="text-sm text-muted-foreground">POST to <code className="bg-muted px-1 rounded">/api/workflows/{'{id}'}/execute</code></p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">With Input Data</h4>
              <p className="text-sm text-muted-foreground">Pass custom data to the workflow trigger</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Schedule Trigger */}
      <section id="schedule">
        <SectionHeading id="schedule">Schedule Trigger</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Cron Expressions</CardTitle>
            <CardDescription>Run workflows on a schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`# Cron format: minute hour day month weekday

# Examples:
*/5 * * * *     # Every 5 minutes
0 * * * *       # Every hour
0 9 * * *       # Daily at 9 AM
0 9 * * 1       # Every Monday at 9 AM
0 0 1 * *       # First day of every month`}
            />
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Schedule Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Timezone</span>
                <span className="text-muted-foreground">Set execution timezone (default: UTC)</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Retry on Failure</span>
                <span className="text-muted-foreground">Automatically retry failed executions</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Skip if Running</span>
                <span className="text-muted-foreground">Don&apos;t start if previous still running</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Webhook Security */}
      <section id="security">
        <SectionHeading id="security">Webhook Security</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Authentication Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Header Authentication</h4>
                <p className="text-sm text-muted-foreground">Require a specific header value (e.g., API key)</p>
                <CodeBlock className="mt-2" code={`X-API-Key: your-secret-key`} />
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Basic Authentication</h4>
                <p className="text-sm text-muted-foreground">Username and password in Authorization header</p>
                <CodeBlock className="mt-2" code={`Authorization: Basic base64(user:pass)`} />
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">HMAC Signature</h4>
                <p className="text-sm text-muted-foreground">Verify request signature (GitHub, Stripe style)</p>
                <CodeBlock className="mt-2" code={`X-Hub-Signature-256: sha256=...`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">IP Allowlist</CardTitle>
            <CardDescription>Restrict webhook access by IP</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={`# Allow only specific IPs
allowedIPs:
  - 192.168.1.0/24
  - 10.0.0.1

# Allow GitHub webhook IPs
allowedIPs:
  - 140.82.112.0/20  # GitHub hooks`}
            />
          </CardContent>
        </Card>
      </section>
    </DocsPageLayout>
  );
}
