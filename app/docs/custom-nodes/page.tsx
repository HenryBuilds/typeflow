'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Code2, Zap, Package, Settings, TestTube, Rocket, Menu, X, ChevronRight, Sparkles, Shield, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'getting-started', title: 'Getting Started', icon: Rocket },
  { id: 'node-styles', title: 'Choose Your Style', icon: Code2 },
  { id: 'typeflow-features', title: 'Typeflow Features', icon: Sparkles },
  { id: 'credentials', title: 'Creating Credentials', icon: Shield },
  { id: 'testing', title: 'Testing Your Node', icon: TestTube },
  { id: 'deployment', title: 'Deployment', icon: Package },
  { id: 'package-json', title: 'Package Configuration', icon: FileCode },
];

function SideNav({ activeSection }: { activeSection: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 lg:hidden shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 z-40 flex flex-col",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Navigation */}
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
          
          {/* Quick Links */}
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
              <a
                href="https://github.com/typeflow/node-starter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                GitHub Template →
              </a>
            </div>
          </div>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

export default function CustomNodesDocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

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
              Build Custom Nodes for Typeflow
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Extend Typeflow with your own nodes. Create API integrations, 
              data transformations, or anything you can imagine.
            </p>
          </div>

          {/* Quick Start Steps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
            {[
              { icon: Package, title: 'Clone Template', desc: 'Get the starter' },
              { icon: Code2, title: 'Write Code', desc: 'Build your node' },
              { icon: Settings, title: 'Configure', desc: 'Set up features' },
              { icon: Rocket, title: 'Deploy', desc: 'Link to Typeflow' },
            ].map((step, i) => (
              <Card key={i} className="bg-card/50">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-medium text-foreground">{step.title}</div>
                  <div className="text-sm text-muted-foreground">{step.desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="space-y-16">
            {/* Section 1: Getting Started */}
            <section id="getting-started" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                Getting Started
              </h2>
              
              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Clone the Starter Template</CardTitle>
                  <CardDescription>Get up and running in seconds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock 
                    language="bash"
                    code={`# Clone the template
cp -r templates/typeflow-node-starter my-custom-nodes
cd my-custom-nodes

# Install dependencies
npm install

# Build
npm run build`} 
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Project Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`my-custom-nodes/
├── package.json          # Package config with 'typeflow' section
├── tsconfig.json         # TypeScript configuration
├── types/                # Typeflow type definitions
│   └── typeflow-workflow.ts
├── credentials/          # Credential definitions
│   └── MyApi.credentials.ts
└── nodes/                # Your custom nodes
    └── MyNode/
        ├── MyNode.node.ts    # Main node class
        ├── MyNode.node.json  # Optional metadata
        └── icon.svg          # Node icon`} />
                </CardContent>
              </Card>
            </section>

            {/* Section 2: Node Styles */}
            <section id="node-styles" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Choose Your Style
              </h2>

              <Tabs defaultValue="programmatic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="programmatic">Programmatic Style</TabsTrigger>
                  <TabsTrigger value="declarative">Declarative Style</TabsTrigger>
                </TabsList>

                <TabsContent value="programmatic">
                  <Card className="bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Zap className="h-5 w-5 text-chart-4" />
                        Programmatic Style
                      </CardTitle>
                      <CardDescription>
                        Full control with the execute() method. Best for complex logic.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock 
                        showLineNumbers
                        code={`import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
} from '../types/typeflow-workflow';

export class MyTransformNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Transform',
    name: 'myTransform',
    icon: 'file:icon.svg',
    group: ['transform'],
    version: 1,
    description: 'Transform data with custom logic',
    defaults: { name: 'My Transform' },
    inputs: ['main'],
    outputs: ['main'],
    
    // Typeflow-exclusive features
    category: 'Data Transformation',
    tags: ['transform', 'utility'],
    
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Uppercase', value: 'uppercase' },
          { name: 'Lowercase', value: 'lowercase' },
        ],
        default: 'uppercase',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as string;
      const json = { ...items[i].json };
      
      // Your transformation logic here
      results.push({ json });
    }
    
    return [results];
  }
}`} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="declarative">
                  <Card className="bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Settings className="h-5 w-5 text-chart-1" />
                        Declarative Style
                      </CardTitle>
                      <CardDescription>
                        Configuration-based. Best for simple API integrations.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock 
                        showLineNumbers
                        code={`import { INodeType, INodeTypeDescription } from '../types/typeflow-workflow';

export class GitHubApiNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GitHub',
    name: 'github',
    icon: 'file:github.svg',
    group: ['output'],
    version: 1,
    description: 'Interact with GitHub API',
    defaults: { name: 'GitHub' },
    inputs: ['main'],
    outputs: ['main'],
    
    credentials: [
      { name: 'githubApi', required: true },
    ],
    
    requestDefaults: {
      baseURL: 'https://api.github.com',
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    },
    
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Get Repo',
            value: 'get',
            routing: {
              request: {
                method: 'GET',
                url: '=/repos/{{$parameter.owner}}/{{$parameter.repo}}',
              },
            },
          },
        ],
        default: 'get',
      },
    ],
  };
}`} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

            {/* Section 3: Typeflow Features */}
            <section id="typeflow-features" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Typeflow-Exclusive Features
              </h2>

              <div className="grid gap-4">
                {[
                  {
                    title: 'Streaming Support',
                    desc: 'Handle real-time data like AI responses',
                    code: `streaming: {
  enabled: true,
  emitPartial: true,
  bufferSize: 100
}`,
                  },
                  {
                    title: 'Result Caching',
                    desc: 'Cache expensive API calls',
                    code: `caching: {
  enabled: true,
  ttl: 3600,  // 1 hour
  scope: 'workflow'
}`,
                  },
                  {
                    title: 'Parallel Processing',
                    desc: 'Process items concurrently',
                    code: `parallelProcessing: {
  enabled: true,
  concurrency: 5,
  errorStrategy: 'continue'
}`,
                  },
                  {
                    title: 'Cost Estimation',
                    desc: 'Preview costs before execution',
                    code: `costEstimation: {
  perItem: 0.001,
  category: 'ai',
  warningThreshold: 1.00
}`,
                  },
                  {
                    title: 'Lifecycle Hooks',
                    desc: 'Run custom logic at key points',
                    code: `hooks: {
  beforeExecute: 'console.log("Starting...")',
  onError: 'return { retry: true }'
}`,
                  },
                ].map((feature, i) => (
                  <Card key={i} className="bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-foreground text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.desc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock code={feature.code} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Section 4: Credentials */}
            <section id="credentials" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Creating Credentials
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">API Credential Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock 
                    showLineNumbers
                    code={`import {
  ICredentialType,
  INodeProperties,
  IAuthenticateGeneric,
} from '../types/typeflow-workflow';

export class MyApiCredentials implements ICredentialType {
  name = 'myApiCredentials';
  displayName = 'My API';
  
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'Authorization': '=Bearer {{$credentials.apiKey}}',
      },
    },
  };
}`} />
                </CardContent>
              </Card>
            </section>

            {/* Section 5: Testing */}
            <section id="testing" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
                Testing Your Node
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <TestTube className="h-5 w-5 text-chart-3" />
                    Built-in Test Cases
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Define test cases directly in your node description:
                  </p>
                  <CodeBlock code={`testCases: [
  {
    name: 'Should transform correctly',
    input: [{ json: { name: 'John', age: 30 } }],
    parameters: { operation: 'uppercase', field: 'name' },
    expectedOutput: [{ json: { name: 'JOHN', age: 30 } }],
  },
  {
    name: 'Should handle empty input',
    input: [],
    parameters: { operation: 'uppercase' },
    expectedOutput: [],
  },
]`} />
                  <p className="text-muted-foreground">
                    Run tests with: <code className="bg-muted px-2 py-1 rounded text-foreground">typeflow test</code>
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Section 6: Deployment */}
            <section id="deployment" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">6</span>
                Deployment
              </h2>

              <div className="space-y-4">
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-foreground">Local Development</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock 
                      language="bash"
                      code={`# Build your package
npm run build

# Create Typeflow custom nodes directory
mkdir -p ~/.typeflow/custom
cd ~/.typeflow/custom
npm init -y

# Link your package for development
npm link /path/to/my-custom-nodes

# Restart Typeflow - your nodes will appear!`} />
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-foreground">Publishing to npm</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock 
                      language="bash"
                      code={`# Update package.json name to: typeflow-nodes-yourname
npm publish

# Users can install with:
cd ~/.typeflow/custom
npm install typeflow-nodes-yourname`} />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Section 7: Package.json */}
            <section id="package-json" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">7</span>
                Package Configuration
              </h2>

              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <CodeBlock 
                    language="json"
                    showLineNumbers
                    code={`{
  "name": "typeflow-nodes-example",
  "version": "1.0.0",
  "description": "Custom nodes for Typeflow",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "typeflow": {
    "nodes": [
      "dist/nodes/MyNode/MyNode.node.js"
    ],
    "credentials": [
      "dist/credentials/MyApi.credentials.js"
    ]
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}`} />
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
                  Start with the template and create your first custom node in minutes.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="https://github.com/typeflow/node-starter">
                    <Button size="lg">
                      <Package className="h-4 w-4 mr-2" />
                      Get the Template
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
