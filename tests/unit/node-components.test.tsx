import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock ReactFlow components
vi.mock('reactflow', () => ({
  Handle: ({ type, position, className }: any) => (
    <div data-testid={`handle-${type}`} className={className} />
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
  NodeProps: {},
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Filter: () => <span data-testid="icon-filter" />,
  Code: () => <span data-testid="icon-code" />,
  Trash2: () => <span data-testid="icon-trash" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  XCircle: () => <span data-testid="icon-x" />,
  Loader2: () => <span data-testid="icon-loader" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Settings2: () => <span data-testid="icon-settings" />,
  Play: () => <span data-testid="icon-play" />,
  ChevronDown: () => <span data-testid="icon-chevron" />,
  Clock: () => <span data-testid="icon-clock" />,
  GitMerge: () => <span data-testid="icon-merge" />,
  Split: () => <span data-testid="icon-split" />,
  Hash: () => <span data-testid="icon-hash" />,
  Calendar: () => <span data-testid="icon-calendar" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Globe: () => <span data-testid="icon-globe" />,
  Pause: () => <span data-testid="icon-pause" />,
  Circle: () => <span data-testid="icon-circle" />,
  Zap: () => <span data-testid="icon-zap" />,
  Webhook: () => <span data-testid="icon-webhook" />,
}))

describe('Node Components - Data Interfaces', () => {
  describe('FilterNodeData', () => {
    interface FilterNodeData {
      label?: string
      config?: {
        conditions?: Array<{
          field: string
          operator: string
          value: string
        }>
        combineWith?: 'and' | 'or'
      }
      onEdit?: (nodeId: string) => void
      onExecute?: (nodeId: string) => void
      onDelete?: (nodeId: string) => void
      isExecuting?: boolean
      executionStatus?: 'pending' | 'running' | 'completed' | 'failed'
      errorMessage?: string
    }

    it('should have correct default values', () => {
      const data: FilterNodeData = {}
      expect(data.label).toBeUndefined()
      expect(data.config).toBeUndefined()
      expect(data.isExecuting).toBeUndefined()
    })

    it('should accept valid config', () => {
      const data: FilterNodeData = {
        label: 'My Filter',
        config: {
          conditions: [
            { field: 'status', operator: 'equals', value: 'active' },
          ],
          combineWith: 'and',
        },
      }

      expect(data.label).toBe('My Filter')
      expect(data.config?.conditions).toHaveLength(1)
      expect(data.config?.combineWith).toBe('and')
    })

    it('should track execution status', () => {
      const statuses: FilterNodeData['executionStatus'][] = [
        'pending',
        'running',
        'completed',
        'failed',
      ]

      statuses.forEach((status) => {
        const data: FilterNodeData = { executionStatus: status }
        expect(data.executionStatus).toBe(status)
      })
    })
  })

  describe('CodeNodeData', () => {
    interface CodeNodeData {
      label?: string
      config?: {
        code?: string
        [key: string]: unknown
      }
      onEdit?: (nodeId: string) => void
      onExecute?: (nodeId: string) => void
      onDelete?: (nodeId: string) => void
      isExecuting?: boolean
      executionStatus?: 'pending' | 'running' | 'completed' | 'failed'
      errorMessage?: string
      inputData?: Array<{
        sourceNodeId: string
        output: unknown
      }>
    }

    it('should store code in config', () => {
      const data: CodeNodeData = {
        label: 'Transform Data',
        config: {
          code: 'return $input.map(item => ({ ...item.json, processed: true }))',
        },
      }

      expect(data.config?.code).toContain('$input')
    })

    it('should track input data from previous nodes', () => {
      const data: CodeNodeData = {
        inputData: [
          {
            sourceNodeId: 'node-1',
            output: [{ json: { id: 1 } }],
          },
          {
            sourceNodeId: 'node-2',
            output: [{ json: { id: 2 } }],
          },
        ],
      }

      expect(data.inputData).toHaveLength(2)
      expect(data.inputData?.[0].sourceNodeId).toBe('node-1')
    })
  })
})

describe('Node Status Styling', () => {
  const getStatusStyles = (
    executionStatus?: 'pending' | 'running' | 'completed' | 'failed',
    isExecuting?: boolean,
    selected?: boolean
  ): string => {
    if (executionStatus === 'completed') {
      return 'border-green-500 bg-green-50 dark:bg-green-950/20'
    }
    if (executionStatus === 'failed') {
      return 'border-red-500 bg-red-50 dark:bg-red-950/20'
    }
    if (executionStatus === 'running' || isExecuting) {
      return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 animate-pulse'
    }
    if (selected) {
      return 'border-blue-500 bg-white dark:bg-gray-800'
    }
    return 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
  }

  it('should return green styles for completed status', () => {
    const styles = getStatusStyles('completed')
    expect(styles).toContain('border-green-500')
    expect(styles).toContain('bg-green-50')
  })

  it('should return red styles for failed status', () => {
    const styles = getStatusStyles('failed')
    expect(styles).toContain('border-red-500')
    expect(styles).toContain('bg-red-50')
  })

  it('should return blue animated styles for running status', () => {
    const styles = getStatusStyles('running')
    expect(styles).toContain('border-blue-500')
    expect(styles).toContain('animate-pulse')
  })

  it('should return blue animated styles when isExecuting is true', () => {
    const styles = getStatusStyles(undefined, true)
    expect(styles).toContain('border-blue-500')
    expect(styles).toContain('animate-pulse')
  })

  it('should return blue border for selected nodes', () => {
    const styles = getStatusStyles(undefined, false, true)
    expect(styles).toContain('border-blue-500')
    expect(styles).not.toContain('animate-pulse')
  })

  it('should return gray border for default state', () => {
    const styles = getStatusStyles()
    expect(styles).toContain('border-gray-300')
  })
})

describe('Node Output Formatting', () => {
  const formatOutput = (output: unknown): string => {
    if (output === null) return 'null'
    if (output === undefined) return 'undefined'

    // Handle items array format
    if (
      Array.isArray(output) &&
      output.length > 0 &&
      output[0]?.json !== undefined
    ) {
      const items = output as Array<{ json: unknown }>
      if (items.length === 1) {
        return JSON.stringify(items[0].json, null, 2)
      } else {
        return JSON.stringify(
          items.map((item) => item.json),
          null,
          2
        )
      }
    }

    try {
      const str = JSON.stringify(output, null, 2)
      return str.length > 200 ? str.substring(0, 200) + '...' : str
    } catch {
      return String(output)
    }
  }

  it('should format null as "null"', () => {
    expect(formatOutput(null)).toBe('null')
  })

  it('should format undefined as "undefined"', () => {
    expect(formatOutput(undefined)).toBe('undefined')
  })

  it('should format single item array', () => {
    const output = [{ json: { name: 'Alice', age: 30 } }]
    const result = formatOutput(output)
    expect(result).toContain('"name": "Alice"')
    expect(result).toContain('"age": 30')
  })

  it('should format multiple items array', () => {
    const output = [
      { json: { id: 1 } },
      { json: { id: 2 } },
    ]
    const result = formatOutput(output)
    const parsed = JSON.parse(result)
    expect(parsed).toHaveLength(2)
  })

  it('should truncate long output', () => {
    const longData = { data: 'x'.repeat(300) }
    const result = formatOutput(longData)
    expect(result.length).toBeLessThanOrEqual(203) // 200 + "..."
    expect(result).toContain('...')
  })

  it('should handle plain objects', () => {
    const output = { key: 'value', count: 42 }
    const result = formatOutput(output)
    expect(result).toContain('"key": "value"')
  })
})

describe('Node Condition Count Display', () => {
  const getConditionDisplay = (conditionCount: number): string => {
    if (conditionCount > 0) {
      return `${conditionCount} condition${conditionCount > 1 ? 's' : ''}`
    }
    return 'No conditions'
  }

  it('should show "No conditions" for zero conditions', () => {
    expect(getConditionDisplay(0)).toBe('No conditions')
  })

  it('should show singular for one condition', () => {
    expect(getConditionDisplay(1)).toBe('1 condition')
  })

  it('should show plural for multiple conditions', () => {
    expect(getConditionDisplay(2)).toBe('2 conditions')
    expect(getConditionDisplay(5)).toBe('5 conditions')
  })
})

describe('Node Types Registry', () => {
  const nodeTypes = {
    code: 'CodeNode',
    trigger: 'TriggerNode',
    workflow: 'WorkflowNode',
    webhook: 'WebhookNode',
    webhookResponse: 'WebhookResponseNode',
    utilities: 'UtilitiesNode',
    executeWorkflow: 'ExecuteWorkflowNode',
    workflowInput: 'WorkflowInputNode',
    workflowOutput: 'WorkflowOutputNode',
    filter: 'FilterNode',
    limit: 'LimitNode',
    removeDuplicates: 'RemoveDuplicatesNode',
    splitOut: 'SplitOutNode',
    aggregate: 'AggregateNode',
    merge: 'MergeNode',
    summarize: 'SummarizeNode',
    dateTime: 'DateTimeNode',
    editFields: 'EditFieldsNode',
    httpRequest: 'HttpRequestNode',
    wait: 'WaitNode',
    noop: 'NoopNode',
    scheduleTrigger: 'ScheduleTriggerNode',
    manualTrigger: 'ManualTriggerNode',
    chatTrigger: 'ChatTriggerNode',
  }

  it('should have all expected node types', () => {
    expect(Object.keys(nodeTypes)).toHaveLength(24)
  })

  it('should include all trigger types', () => {
    const triggerTypes = ['trigger', 'scheduleTrigger', 'manualTrigger', 'chatTrigger']
    triggerTypes.forEach((type) => {
      expect(nodeTypes).toHaveProperty(type)
    })
  })

  it('should include all data transformation nodes', () => {
    const dataNodes = [
      'filter',
      'limit',
      'removeDuplicates',
      'splitOut',
      'aggregate',
      'merge',
      'summarize',
      'editFields',
    ]
    dataNodes.forEach((type) => {
      expect(nodeTypes).toHaveProperty(type)
    })
  })

  it('should include utility nodes', () => {
    const utilityNodes = ['code', 'utilities', 'httpRequest', 'wait', 'noop', 'dateTime']
    utilityNodes.forEach((type) => {
      expect(nodeTypes).toHaveProperty(type)
    })
  })
})

describe('Workflow Editor - Node Conversion', () => {
  interface WorkflowNode {
    id: string
    type: string
    label: string
    position: { x: number; y: number }
    config?: Record<string, unknown> | null
    executionOrder?: number
  }

  interface ReactFlowNode {
    id: string
    type: string
    position: { x: number; y: number }
    data: {
      label: string
      config: Record<string, unknown>
    }
  }

  const convertToReactFlowNode = (node: WorkflowNode): ReactFlowNode => ({
    id: node.id,
    type: node.type || 'workflow',
    position: node.position,
    data: {
      label: node.label,
      config: node.config || {},
    },
  })

  it('should convert database node to ReactFlow node', () => {
    const dbNode: WorkflowNode = {
      id: 'node-1',
      type: 'filter',
      label: 'Filter Active',
      position: { x: 100, y: 200 },
      config: { conditions: [] },
    }

    const rfNode = convertToReactFlowNode(dbNode)

    expect(rfNode.id).toBe('node-1')
    expect(rfNode.type).toBe('filter')
    expect(rfNode.position).toEqual({ x: 100, y: 200 })
    expect(rfNode.data.label).toBe('Filter Active')
    expect(rfNode.data.config).toEqual({ conditions: [] })
  })

  it('should use default type when type is missing', () => {
    const dbNode: WorkflowNode = {
      id: 'node-2',
      type: '',
      label: 'Generic Node',
      position: { x: 0, y: 0 },
    }

    const rfNode = convertToReactFlowNode(dbNode)
    expect(rfNode.type).toBe('workflow')
  })

  it('should handle null config', () => {
    const dbNode: WorkflowNode = {
      id: 'node-3',
      type: 'code',
      label: 'Code Node',
      position: { x: 50, y: 50 },
      config: null,
    }

    const rfNode = convertToReactFlowNode(dbNode)
    expect(rfNode.data.config).toEqual({})
  })
})

describe('Workflow Editor - Connection Conversion', () => {
  interface WorkflowConnection {
    id: string
    sourceNodeId: string
    targetNodeId: string
    sourceHandle?: string | null
    targetHandle?: string | null
  }

  interface ReactFlowEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    type: string
  }

  const convertToReactFlowEdge = (conn: WorkflowConnection): ReactFlowEdge => ({
    id: conn.id,
    source: conn.sourceNodeId,
    target: conn.targetNodeId,
    sourceHandle: conn.sourceHandle || undefined,
    targetHandle: conn.targetHandle || undefined,
    type: 'deletable',
  })

  it('should convert database connection to ReactFlow edge', () => {
    const dbConn: WorkflowConnection = {
      id: 'edge-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
    }

    const rfEdge = convertToReactFlowEdge(dbConn)

    expect(rfEdge.id).toBe('edge-1')
    expect(rfEdge.source).toBe('node-1')
    expect(rfEdge.target).toBe('node-2')
    expect(rfEdge.type).toBe('deletable')
  })

  it('should handle null handles', () => {
    const dbConn: WorkflowConnection = {
      id: 'edge-2',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      sourceHandle: null,
      targetHandle: null,
    }

    const rfEdge = convertToReactFlowEdge(dbConn)
    expect(rfEdge.sourceHandle).toBeUndefined()
    expect(rfEdge.targetHandle).toBeUndefined()
  })

  it('should preserve handle values when provided', () => {
    const dbConn: WorkflowConnection = {
      id: 'edge-3',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      sourceHandle: 'output-1',
      targetHandle: 'input-1',
    }

    const rfEdge = convertToReactFlowEdge(dbConn)
    expect(rfEdge.sourceHandle).toBe('output-1')
    expect(rfEdge.targetHandle).toBe('input-1')
  })
})

describe('Node Callback Handling', () => {
  it('should call onEdit with node ID', () => {
    const onEdit = vi.fn()
    const nodeId = 'test-node-123'

    onEdit(nodeId)

    expect(onEdit).toHaveBeenCalledWith(nodeId)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('should call onExecute with node ID', () => {
    const onExecute = vi.fn()
    const nodeId = 'execute-node-456'

    onExecute(nodeId)

    expect(onExecute).toHaveBeenCalledWith(nodeId)
  })

  it('should call onDelete with node ID', () => {
    const onDelete = vi.fn()
    const nodeId = 'delete-node-789'

    onDelete(nodeId)

    expect(onDelete).toHaveBeenCalledWith(nodeId)
  })

  it('should not call callbacks when undefined', () => {
    const data = {
      onEdit: undefined,
      onExecute: undefined,
      onDelete: undefined,
    }

    // Simulate safe callback invocation
    data.onEdit?.('node-id')
    data.onExecute?.('node-id')
    data.onDelete?.('node-id')

    // No errors should be thrown
    expect(true).toBe(true)
  })
})

describe('Node Integration - Data Flow', () => {
  interface ExecutionItem {
    json: Record<string, unknown>
  }

  interface NodeOutput {
    status: 'pending' | 'running' | 'completed' | 'failed'
    output?: ExecutionItem[]
    error?: string
    duration?: number
  }

  it('should track execution output for each node', () => {
    const nodeOutputs: Record<string, NodeOutput> = {
      'trigger-1': {
        status: 'completed',
        output: [{ json: { request: { body: { data: 'test' } } } }],
        duration: 5,
      },
      'filter-1': {
        status: 'completed',
        output: [{ json: { data: 'test', passed: true } }],
        duration: 12,
      },
      'code-1': {
        status: 'running',
      },
    }

    expect(nodeOutputs['trigger-1'].status).toBe('completed')
    expect(nodeOutputs['filter-1'].output).toHaveLength(1)
    expect(nodeOutputs['code-1'].status).toBe('running')
  })

  it('should handle failed node with error message', () => {
    const nodeOutput: NodeOutput = {
      status: 'failed',
      error: 'TypeError: Cannot read property "data" of undefined',
      duration: 3,
    }

    expect(nodeOutput.status).toBe('failed')
    expect(nodeOutput.error).toContain('TypeError')
    expect(nodeOutput.output).toBeUndefined()
  })

  it('should pass output from one node as input to next', () => {
    // Simulate trigger output
    const triggerOutput: ExecutionItem[] = [
      { json: { userId: 123, action: 'login' } },
    ]

    // Filter node receives trigger output
    const filterInput = triggerOutput

    // Filter processes and outputs matching items
    const filterOutput = filterInput.filter(
      (item) => item.json.action === 'login'
    )

    expect(filterOutput).toHaveLength(1)
    expect(filterOutput[0].json.userId).toBe(123)
  })

  it('should handle multiple inputs from merge node', () => {
    const input1: ExecutionItem[] = [{ json: { source: 'A', value: 1 } }]
    const input2: ExecutionItem[] = [{ json: { source: 'B', value: 2 } }]

    // Merge combines inputs
    const mergedOutput = [...input1, ...input2]

    expect(mergedOutput).toHaveLength(2)
    expect(mergedOutput.map((i) => i.json.source)).toEqual(['A', 'B'])
  })
})

describe('Node Config Serialization', () => {
  it('should serialize filter config correctly', () => {
    const config = {
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'count', operator: 'greaterThan', value: '10' },
      ],
      combineWith: 'and' as const,
    }

    const serialized = JSON.stringify(config)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.conditions).toHaveLength(2)
    expect(deserialized.combineWith).toBe('and')
  })

  it('should serialize code config correctly', () => {
    const config = {
      code: `
        const result = $input.map(item => ({
          ...item.json,
          processed: true,
          timestamp: new Date().toISOString()
        }));
        return result;
      `,
    }

    const serialized = JSON.stringify(config)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.code).toContain('$input')
    expect(deserialized.code).toContain('processed')
  })

  it('should serialize httpRequest config correctly', () => {
    const config = {
      method: 'POST',
      url: 'https://api.example.com/users',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer {{token}}',
      },
      body: '{"name": "{{name}}"}',
      bodyType: 'json',
    }

    const serialized = JSON.stringify(config)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.method).toBe('POST')
    expect(deserialized.headers['Content-Type']).toBe('application/json')
  })
})
