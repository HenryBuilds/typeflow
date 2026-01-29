'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Code2, 
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCode,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CodeBlock } from '@/components/ui/code-block';

// Sample node definitions for testing
const SAMPLE_NODES = {
  httpRequest: {
    name: 'HTTP Request',
    style: 'declarative',
    description: 'Declarative style - routing-based API calls',
    icon: Zap,
    parameters: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1',
    },
    mockExecute: async (params: Record<string, unknown>) => {
      // Simulate HTTP request
      const response = await fetch(params.url as string, {
        method: params.method as string,
      });
      return await response.json();
    },
  },
  dataTransform: {
    name: 'Data Transform',
    style: 'programmatic',
    description: 'Programmatic style - custom execute() logic',
    icon: Code2,
    operations: ['uppercase', 'lowercase', 'filter', 'sort', 'addField', 'removeField'],
    mockExecute: async (
      operation: string, 
      input: Record<string, unknown>[], 
      params: Record<string, unknown>
    ) => {
      const results: Record<string, unknown>[] = [];
      
      for (const item of input) {
        switch (operation) {
          case 'uppercase': {
            const fieldName = params.fieldName as string;
            if (item[fieldName] && typeof item[fieldName] === 'string') {
              results.push({ ...item, [fieldName]: (item[fieldName] as string).toUpperCase() });
            } else {
              results.push(item);
            }
            break;
          }
          case 'lowercase': {
            const fieldName = params.fieldName as string;
            if (item[fieldName] && typeof item[fieldName] === 'string') {
              results.push({ ...item, [fieldName]: (item[fieldName] as string).toLowerCase() });
            } else {
              results.push(item);
            }
            break;
          }
          case 'filter': {
            const { filterField, filterCondition, filterValue } = params;
            const fieldValue = item[filterField as string];
            let matches = false;
            
            switch (filterCondition) {
              case 'equals':
                matches = String(fieldValue) === filterValue;
                break;
              case 'notEquals':
                matches = String(fieldValue) !== filterValue;
                break;
              case 'contains':
                matches = String(fieldValue).includes(filterValue as string);
                break;
            }
            
            if (matches) results.push(item);
            break;
          }
          case 'addField': {
            const { newFieldName, newFieldValue } = params;
            results.push({ ...item, [newFieldName as string]: newFieldValue });
            break;
          }
          case 'removeField': {
            const fieldName = params.fieldName as string;
            const { [fieldName]: _, ...rest } = item;
            results.push(rest);
            break;
          }
          default:
            results.push(item);
        }
      }
      
      if (operation === 'sort') {
        const { sortField, sortDirection } = params;
        results.push(...input);
        results.sort((a, b) => {
          const aVal = a[sortField as string];
          const bVal = b[sortField as string];
          const comparison = String(aVal).localeCompare(String(bVal));
          return sortDirection === 'asc' ? comparison : -comparison;
        });
        return results.slice(input.length);
      }
      
      return results;
    },
  },
};

export default function NodePlaygroundPage() {
  const [selectedNode, setSelectedNode] = useState<'httpRequest' | 'dataTransform'>('dataTransform');
  const [operation, setOperation] = useState('uppercase');
  const [inputData, setInputData] = useState(JSON.stringify([
    { name: 'hello world', status: 'active' },
    { name: 'foo bar', status: 'inactive' },
    { name: 'test data', status: 'active' }
  ], null, 2));
  const [fieldName, setFieldName] = useState('name');
  const [filterField, setFilterField] = useState('status');
  const [filterCondition, setFilterCondition] = useState('equals');
  const [filterValue, setFilterValue] = useState('active');
  const [newFieldName, setNewFieldName] = useState('timestamp');
  const [newFieldValue, setNewFieldValue] = useState(new Date().toISOString());
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [httpUrl, setHttpUrl] = useState('https://jsonplaceholder.typicode.com/users/1');
  const [httpMethod, setHttpMethod] = useState('GET');
  
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runNode = async () => {
    setIsRunning(true);
    setError(null);
    setOutput(null);
    
    try {
      let result: unknown;
      
      if (selectedNode === 'httpRequest') {
        result = await SAMPLE_NODES.httpRequest.mockExecute({
          method: httpMethod,
          url: httpUrl,
        });
      } else {
        const input = JSON.parse(inputData);
        const params: Record<string, unknown> = {
          fieldName,
          filterField,
          filterCondition,
          filterValue,
          newFieldName,
          newFieldValue,
          sortField,
          sortDirection,
        };
        result = await SAMPLE_NODES.dataTransform.mockExecute(operation, input, params);
      }
      
      setOutput(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Docs
            </Link>
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Node Playground</h1>
            </div>
          </div>
          <Badge variant="secondary">Interactive Testing</Badge>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Node Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card 
            className={`cursor-pointer transition-all ${selectedNode === 'dataTransform' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedNode('dataTransform')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-lg">Data Transform</CardTitle>
                </div>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500">Programmatic</Badge>
              </div>
              <CardDescription>
                Custom execute() logic with full control
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${selectedNode === 'httpRequest' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
            onClick={() => setSelectedNode('httpRequest')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-indigo-500" />
                  <CardTitle className="text-lg">HTTP Request</CardTitle>
                </div>
                <Badge variant="outline" className="text-indigo-500 border-indigo-500">Declarative</Badge>
              </div>
              <CardDescription>
                Routing-based API configuration
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Node Configuration */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedNode === 'dataTransform' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Operation</Label>
                      <Select value={operation} onValueChange={setOperation}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uppercase">Uppercase</SelectItem>
                          <SelectItem value="lowercase">Lowercase</SelectItem>
                          <SelectItem value="filter">Filter Items</SelectItem>
                          <SelectItem value="sort">Sort Items</SelectItem>
                          <SelectItem value="addField">Add Field</SelectItem>
                          <SelectItem value="removeField">Remove Field</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(operation === 'uppercase' || operation === 'lowercase' || operation === 'removeField') && (
                      <div className="space-y-2">
                        <Label>Field Name</Label>
                        <input 
                          type="text" 
                          value={fieldName} 
                          onChange={(e) => setFieldName(e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-border bg-background"
                        />
                      </div>
                    )}
                    
                    {operation === 'filter' && (
                      <>
                        <div className="space-y-2">
                          <Label>Filter Field</Label>
                          <input 
                            type="text" 
                            value={filterField} 
                            onChange={(e) => setFilterField(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Condition</Label>
                          <Select value={filterCondition} onValueChange={setFilterCondition}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="notEquals">Not Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <input 
                            type="text" 
                            value={filterValue} 
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                          />
                        </div>
                      </>
                    )}
                    
                    {operation === 'sort' && (
                      <>
                        <div className="space-y-2">
                          <Label>Sort Field</Label>
                          <input 
                            type="text" 
                            value={sortField} 
                            onChange={(e) => setSortField(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Direction</Label>
                          <Select value={sortDirection} onValueChange={setSortDirection}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">Ascending</SelectItem>
                              <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    
                    {operation === 'addField' && (
                      <>
                        <div className="space-y-2">
                          <Label>New Field Name</Label>
                          <input 
                            type="text" 
                            value={newFieldName} 
                            onChange={(e) => setNewFieldName(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>New Field Value</Label>
                          <input 
                            type="text" 
                            value={newFieldValue} 
                            onChange={(e) => setNewFieldValue(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Input Data (JSON Array)</Label>
                      <Textarea 
                        value={inputData}
                        onChange={(e) => setInputData(e.target.value)}
                        className="font-mono text-sm min-h-[200px]"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>HTTP Method</Label>
                      <Select value={httpMethod} onValueChange={setHttpMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <input 
                        type="text" 
                        value={httpUrl} 
                        onChange={(e) => setHttpUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono text-sm"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This makes a real HTTP request to the specified URL.
                    </p>
                  </>
                )}
                
                <Button 
                  onClick={runNode} 
                  disabled={isRunning}
                  className="w-full"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Node
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Output
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="flex items-start gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                    <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                ) : output ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Success</span>
                    </div>
                    <CodeBlock code={output} language="json" />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Configure and run the node to see output</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Code Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Node Code
                </CardTitle>
                <CardDescription>
                  {selectedNode === 'dataTransform' 
                    ? 'The execute() method handles all the logic' 
                    : 'Routing configuration defines the API calls'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedNode === 'dataTransform' ? (
                  <CodeBlock 
                    code={`async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const operation = this.getNodeParameter('operation', 0);
  let results: INodeExecutionData[] = [];

  switch (operation) {
    case 'uppercase': {
      const fieldName = this.getNodeParameter('fieldName', 0);
      for (const item of items) {
        const json = { ...item.json };
        if (typeof json[fieldName] === 'string') {
          json[fieldName] = json[fieldName].toUpperCase();
        }
        results.push({ json });
      }
      break;
    }
    // ... other operations
  }

  return [results];
}`}
                    language="typescript"
                    showLineNumbers
                  />
                ) : (
                  <CodeBlock 
                    code={`{
  displayName: 'HTTP Request',
  name: 'httpRequest',
  
  properties: [
    {
      displayName: 'Method',
      name: 'method',
      type: 'options',
      options: [
        {
          name: 'GET',
          value: 'GET',
          routing: { request: { method: 'GET' } },
        },
        // ... more methods
      ],
    },
    {
      displayName: 'URL',
      name: 'url',
      type: 'string',
      routing: {
        request: { url: '={{$parameter["url"]}}' },
      },
    },
  ],
}`}
                    language="typescript"
                    showLineNumbers
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
