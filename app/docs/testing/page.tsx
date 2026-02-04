'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TestTube, Bug, Play, Pause, SkipForward, Menu, X, ChevronRight, Eye, Terminal, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', title: 'Overview', icon: TestTube },
  { id: 'manual-testing', title: 'Manual Testing', icon: Play },
  { id: 'breakpoints', title: 'Breakpoints', icon: Pause },
  { id: 'debug-panel', title: 'Debug Panel', icon: Eye },
  { id: 'step-execution', title: 'Step Execution', icon: SkipForward },
  { id: 'logs', title: 'Execution Logs', icon: Terminal },
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

export default function TestingDocsPage() {
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
              Testing Workflows
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Debug and test your workflows with breakpoints, step-by-step execution, and detailed logs.
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
                  <CardTitle className="text-foreground">Testing Features</CardTitle>
                  <CardDescription>Tools to help you build reliable workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Play className="h-6 w-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground">Manual Execution</h4>
                      <p className="text-sm text-muted-foreground">Run workflows with test data</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Pause className="h-6 w-6 text-chart-2 mb-2" />
                      <h4 className="font-medium text-foreground">Breakpoints</h4>
                      <p className="text-sm text-muted-foreground">Pause execution at any node</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Eye className="h-6 w-6 text-chart-4 mb-2" />
                      <h4 className="font-medium text-foreground">Data Inspection</h4>
                      <p className="text-sm text-muted-foreground">View data at each step</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Manual Testing */}
            <section id="manual-testing" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Manual Testing
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Running a Test Execution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Open your workflow in the editor</li>
                    <li>Click the <strong>Run</strong> button in the toolbar (or press <code className="bg-muted px-1 rounded">Ctrl+Enter</code>)</li>
                    <li>If using a Manual Trigger, enter test input data</li>
                    <li>Watch the execution progress through each node</li>
                    <li>View results in the output panel</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
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
            <section id="breakpoints" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Breakpoints
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Setting Breakpoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Breakpoints pause workflow execution before a node runs, allowing you to inspect data and debug issues.
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Toggle Breakpoint</h4>
                      <p className="text-sm text-muted-foreground">Right-click on a node → &quot;Toggle Breakpoint&quot; (or press <code className="bg-muted px-1 rounded">B</code>)</p>
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

              <Card className="bg-card/50">
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
            <section id="debug-panel" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Debug Panel
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Using the Debug Panel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Click the <strong>Eye</strong> icon in the toolbar to open the debug panel. It shows:
                  </p>
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
            <section id="step-execution" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
                Step Execution
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Running Node by Node</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Instead of running the entire workflow, you can execute nodes individually:
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Run Single Node</h4>
                      <p className="text-sm text-muted-foreground">Right-click on a node → &quot;Execute Node&quot;</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Run to Here</h4>
                      <p className="text-sm text-muted-foreground">Execute all nodes up to and including the selected node</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Step Over</h4>
                      <p className="text-sm text-muted-foreground">When paused, execute just the next node</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Logs */}
            <section id="logs" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">6</span>
                Execution Logs
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Log Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="font-medium text-foreground">DEBUG</span>
                      <span className="text-muted-foreground">Detailed execution information</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="font-medium text-foreground">INFO</span>
                      <span className="text-muted-foreground">General execution events</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="font-medium text-foreground">WARN</span>
                      <span className="text-muted-foreground">Potential issues</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="font-medium text-foreground">ERROR</span>
                      <span className="text-muted-foreground">Execution failures</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
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
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-primary/10 to-chart-2/10 border-primary/20">
              <CardContent className="py-12">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to debug?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Use breakpoints and step execution to build reliable workflows.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/">
                    <Button size="lg">
                      <Bug className="h-4 w-4 mr-2" />
                      Open Editor
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
