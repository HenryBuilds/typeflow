'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, Zap, GitBranch, Database, Repeat, Menu, X, ChevronRight, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', title: 'Overview', icon: Layers },
  { id: 'execution-model', title: 'Execution Model', icon: Play },
  { id: 'data-flow', title: 'Data Flow', icon: ArrowRight },
  { id: 'branching', title: 'Branching & Merging', icon: GitBranch },
  { id: 'loops', title: 'Loops & Iterations', icon: Repeat },
  { id: 'error-handling', title: 'Error Handling', icon: Zap },
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
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
              Quick Links
            </div>
            <div className="space-y-1">
              <Link
                href="/docs"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                ← All Documentation
              </Link>
            </div>
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

export default function WorkflowEngineDocsPage() {
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
              Workflow Engine
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Understanding how Typeflow executes workflows, handles data flow, and manages complex execution patterns.
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
              
              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">How Typeflow Works</CardTitle>
                  <CardDescription>The engine that powers your automations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Typeflow&apos;s workflow engine is a directed acyclic graph (DAG) executor that processes nodes in topological order. 
                    Each node receives input data, performs its operation, and passes output to connected nodes.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Layers className="h-6 w-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground">Node-Based</h4>
                      <p className="text-sm text-muted-foreground">Each operation is a discrete node with inputs and outputs</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Zap className="h-6 w-6 text-chart-4 mb-2" />
                      <h4 className="font-medium text-foreground">Type-Safe</h4>
                      <p className="text-sm text-muted-foreground">Data types are validated between node connections</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Database className="h-6 w-6 text-chart-1 mb-2" />
                      <h4 className="font-medium text-foreground">Stateful</h4>
                      <p className="text-sm text-muted-foreground">Execution state persists for debugging and replay</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Execution Model */}
            <section id="execution-model" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Execution Model
              </h2>

              <Card className="bg-card/50 mb-6">
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

              <Card className="bg-card/50">
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
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Data Flow
              </h2>

              <Card className="bg-card/50 mb-6">
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

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Expression Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <code className="text-primary">$json</code>
                      <span className="text-muted-foreground">Current item&apos;s JSON data</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <code className="text-primary">$input</code>
                      <span className="text-muted-foreground">All input items from previous node</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <code className="text-primary">$node[&apos;Name&apos;]</code>
                      <span className="text-muted-foreground">Access specific node output</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <code className="text-primary">$workflow</code>
                      <span className="text-muted-foreground">Workflow metadata</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <code className="text-primary">$execution</code>
                      <span className="text-muted-foreground">Current execution context</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Branching */}
            <section id="branching" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Branching & Merging
              </h2>

              <Card className="bg-card/50 mb-6">
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

              <Card className="bg-card/50">
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
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
                Loops & Iterations
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Processing Multiple Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    By default, nodes process all input items. Each item flows through the node sequentially.
                  </p>
                  <CodeBlock 
                    language="typescript"
                    code={`// Input: 3 items
[{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]

// Code node with expression
"Hello, {{ $json.name }}!"

// Output: 3 items
["Hello, Alice!", "Hello, Bob!", "Hello, Charlie!"]`} />
                  <p className="text-muted-foreground">
                    Use the <strong>Split Out</strong> node to expand arrays into individual items, 
                    and <strong>Aggregate</strong> to collect items back into an array.
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Error Handling */}
            <section id="error-handling" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">6</span>
                Error Handling
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Error Handling Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Stop on Error (Default)</h4>
                      <p className="text-sm text-muted-foreground">Workflow stops immediately when any node fails</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Continue on Error</h4>
                      <p className="text-sm text-muted-foreground">Skip failed items and continue with remaining</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Retry on Failure</h4>
                      <p className="text-sm text-muted-foreground">Automatically retry failed operations with backoff</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50">
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
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-primary/10 to-chart-3/10 border-primary/20">
              <CardContent className="py-12">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to build?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start building powerful workflows with Typeflow.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/">
                    <Button size="lg">
                      <Play className="h-4 w-4 mr-2" />
                      Create Workflow
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
