'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from '@/components/ui/code-block';
import { DocsPageLayout, SectionHeading, Prose, type DocSection } from '../components';

const sections: DocSection[] = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'node-styles', title: 'Choose Your Style' },
  { id: 'typeflow-features', title: 'Typeflow Features' },
  { id: 'credentials', title: 'Creating Credentials' },
  { id: 'testing', title: 'Testing Your Node' },
  { id: 'deployment', title: 'Deployment' },
  { id: 'package-json', title: 'Package Configuration' },
];

export default function CustomNodesDocsPage() {
  return (
    <DocsPageLayout
      title="Build Custom Nodes for Typeflow"
      subtitle="Extend Typeflow with your own nodes. Create API integrations, data transformations, or anything you can imagine."
      sections={sections}
    >
      {/* Getting Started */}
      <section id="getting-started">
        <SectionHeading id="getting-started">Getting Started</SectionHeading>

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
│   └── workflow-types.ts
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

      {/* Node Styles */}
      <section id="node-styles">
        <SectionHeading id="node-styles">Choose Your Style</SectionHeading>

        <Tabs defaultValue="programmatic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="programmatic">Programmatic Style</TabsTrigger>
            <TabsTrigger value="declarative">Declarative Style</TabsTrigger>
          </TabsList>

          <TabsContent value="programmatic">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-foreground">Programmatic Style</CardTitle>
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
} from '../types/workflow-types';

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
                <CardTitle className="text-foreground">Declarative Style</CardTitle>
                <CardDescription>
                  Configuration-based. Best for simple API integrations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  showLineNumbers
                  code={`import { INodeType, INodeTypeDescription } from '../types/workflow-types';

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

      {/* Typeflow Features */}
      <section id="typeflow-features">
        <SectionHeading id="typeflow-features">Typeflow-Exclusive Features</SectionHeading>

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

      {/* Credentials */}
      <section id="credentials">
        <SectionHeading id="credentials">Creating Credentials</SectionHeading>

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
} from '../types/workflow-types';

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

      {/* Testing */}
      <section id="testing">
        <SectionHeading id="testing">Testing Your Node</SectionHeading>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Built-in Test Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Prose>
              <p>Define test cases directly in your node description:</p>
            </Prose>
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
            <Prose>
              <p>
                Run tests with: <code className="bg-muted px-2 py-1 rounded text-foreground">typeflow test</code>
              </p>
            </Prose>
          </CardContent>
        </Card>
      </section>

      {/* Deployment */}
      <section id="deployment">
        <SectionHeading id="deployment">Deployment</SectionHeading>

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

      {/* Package Configuration */}
      <section id="package-json">
        <SectionHeading id="package-json">Package Configuration</SectionHeading>

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
    </DocsPageLayout>
  );
}
