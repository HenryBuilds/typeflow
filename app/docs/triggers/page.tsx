'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Webhook, Clock, Play, Menu, X, ChevronRight, Globe, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', title: 'Overview', icon: Zap },
  { id: 'webhooks', title: 'Webhooks', icon: Webhook },
  { id: 'manual', title: 'Manual Trigger', icon: Play },
  { id: 'schedule', title: 'Schedule Trigger', icon: Clock },
  { id: 'security', title: 'Webhook Security', icon: Shield },
];

function SideNav({ activeSection }: { activeSection: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 lg:hidden shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <aside className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 z-40 flex flex-col",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
            On This Page
          </div>
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <section.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{section.title}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </a>
            );
          })}
          
          <div className="mt-8 pt-4 border-t border-border">
            <Link
              href="/docs"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              ← All Documentation
            </Link>
          </div>
        </nav>
      </aside>

      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

export default function TriggersDocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SideNav activeSection={activeSection} />

      <main className="lg:pl-64">
        <div className="container mx-auto px-6 py-12 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Triggers & Webhooks
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start workflows automatically with webhooks, schedules, and manual triggers.
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-16">
            {/* Overview */}
            <section id="overview" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                Overview
              </h2>
              
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Trigger Types</CardTitle>
                  <CardDescription>Choose how your workflow starts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Webhook className="h-6 w-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground">Webhook</h4>
                      <p className="text-sm text-muted-foreground">Trigger via HTTP request from external services</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Clock className="h-6 w-6 text-chart-4 mb-2" />
                      <h4 className="font-medium text-foreground">Schedule</h4>
                      <p className="text-sm text-muted-foreground">Run on a cron schedule (hourly, daily, etc.)</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Play className="h-6 w-6 text-chart-1 mb-2" />
                      <h4 className="font-medium text-foreground">Manual</h4>
                      <p className="text-sm text-muted-foreground">Run manually from the UI or API</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Webhooks */}
            <section id="webhooks" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Webhooks
              </h2>

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
  -d '{"name": "John", "email": "john@example.com"}'`} />
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Webhook Response</CardTitle>
                  <CardDescription>Return data to the caller</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`// Default: Returns 200 OK when workflow starts

// Custom response with "Respond to Webhook" node:
{
  "status": "received",
  "id": "{{ $execution.id }}",
  "processed": true
}

// Response modes:
- Immediately: Respond before workflow completes
- Last Node: Respond with final node output
- Using Respond Node: Full control over response`} />
                </CardContent>
              </Card>
            </section>

            {/* Manual Trigger */}
            <section id="manual" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Manual Trigger
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Running Workflows Manually</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Use the Manual Trigger node to run workflows on-demand from the UI or via API.
                  </p>
                  <div className="space-y-3">
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
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Schedule */}
            <section id="schedule" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Schedule Trigger
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Cron Expressions</CardTitle>
                  <CardDescription>Run workflows on a schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`# Cron format: minute hour day month weekday

# Examples:
*/5 * * * *     # Every 5 minutes
0 * * * *       # Every hour
0 9 * * *       # Daily at 9 AM
0 9 * * 1       # Every Monday at 9 AM
0 0 1 * *       # First day of every month`} />
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

            {/* Security */}
            <section id="security" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
                Webhook Security
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Authentication Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Header Authentication</h4>
                      <p className="text-sm text-muted-foreground">Require a specific header value (e.g., API key)</p>
                      <CodeBlock 
                        className="mt-2"
                        code={`X-API-Key: your-secret-key`} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Basic Authentication</h4>
                      <p className="text-sm text-muted-foreground">Username and password in Authorization header</p>
                      <CodeBlock 
                        className="mt-2"
                        code={`Authorization: Basic base64(user:pass)`} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">HMAC Signature</h4>
                      <p className="text-sm text-muted-foreground">Verify request signature (GitHub, Stripe style)</p>
                      <CodeBlock 
                        className="mt-2"
                        code={`X-Hub-Signature-256: sha256=...`} />
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
                  <CodeBlock code={`# Allow only specific IPs
allowedIPs:
  - 192.168.1.0/24
  - 10.0.0.1

# Allow GitHub webhook IPs
allowedIPs:
  - 140.82.112.0/20  # GitHub hooks`} />
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-primary/10 to-chart-4/10 border-primary/20">
              <CardContent className="py-12">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to automate?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Set up your first webhook and start receiving data.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/">
                    <Button size="lg">
                      <Webhook className="h-4 w-4 mr-2" />
                      Create Webhook
                    </Button>
                  </Link>
                  <Link href="/docs">
                    <Button size="lg" variant="outline">
                      View All Docs
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
