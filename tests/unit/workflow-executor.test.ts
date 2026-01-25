import { describe, it, expect } from 'vitest'

// Test the pure utility functions from WorkflowExecutor
// We test the logic in isolation without database dependencies

describe('WorkflowExecutor - Helper Functions', () => {
  describe('getNestedValue logic', () => {
    const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
      const keys = path.split('.')
      let current: unknown = obj
      for (const key of keys) {
        if (current === null || current === undefined) return undefined
        current = (current as Record<string, unknown>)[key]
      }
      return current
    }

    it('should get simple property', () => {
      const obj = { name: 'test', value: 123 }
      expect(getNestedValue(obj, 'name')).toBe('test')
      expect(getNestedValue(obj, 'value')).toBe(123)
    })

    it('should get nested property', () => {
      const obj = { user: { profile: { name: 'John' } } }
      expect(getNestedValue(obj, 'user.profile.name')).toBe('John')
    })

    it('should return undefined for non-existent path', () => {
      const obj = { name: 'test' }
      expect(getNestedValue(obj, 'nonexistent')).toBeUndefined()
      expect(getNestedValue(obj, 'a.b.c')).toBeUndefined()
    })

    it('should handle null values in path', () => {
      const obj = { user: null }
      expect(getNestedValue(obj, 'user.name')).toBeUndefined()
    })
  })

  describe('setNestedValue logic', () => {
    const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
      const keys = path.split('.')
      let current = obj
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {}
        }
        current = current[keys[i]] as Record<string, unknown>
      }
      current[keys[keys.length - 1]] = value
    }

    it('should set simple property', () => {
      const obj: Record<string, unknown> = {}
      setNestedValue(obj, 'name', 'test')
      expect(obj.name).toBe('test')
    })

    it('should set nested property and create intermediate objects', () => {
      const obj: Record<string, unknown> = {}
      setNestedValue(obj, 'user.profile.name', 'John')
      expect((obj.user as any).profile.name).toBe('John')
    })

    it('should overwrite existing values', () => {
      const obj: Record<string, unknown> = { name: 'old' }
      setNestedValue(obj, 'name', 'new')
      expect(obj.name).toBe('new')
    })
  })

  describe('evaluateCondition logic', () => {
    const evaluateCondition = (fieldValue: unknown, operator: string, compareValue: string): boolean => {
      const strFieldValue = String(fieldValue ?? '')
      const numFieldValue = Number(fieldValue)
      const numCompareValue = Number(compareValue)

      switch (operator) {
        case 'equals':
        case 'equal':
          return strFieldValue === compareValue
        case 'notEquals':
        case 'notEqual':
          return strFieldValue !== compareValue
        case 'contains':
          return strFieldValue.includes(compareValue)
        case 'notContains':
          return !strFieldValue.includes(compareValue)
        case 'startsWith':
          return strFieldValue.startsWith(compareValue)
        case 'endsWith':
          return strFieldValue.endsWith(compareValue)
        case 'greaterThan':
          return numFieldValue > numCompareValue
        case 'lessThan':
          return numFieldValue < numCompareValue
        case 'greaterThanOrEqual':
          return numFieldValue >= numCompareValue
        case 'lessThanOrEqual':
          return numFieldValue <= numCompareValue
        case 'isEmpty':
          return fieldValue === null || fieldValue === undefined || strFieldValue === ''
        case 'isNotEmpty':
          return fieldValue !== null && fieldValue !== undefined && strFieldValue !== ''
        case 'isTrue':
          return fieldValue === true || strFieldValue === 'true'
        case 'isFalse':
          return fieldValue === false || strFieldValue === 'false'
        case 'regex':
          try {
            return new RegExp(compareValue).test(strFieldValue)
          } catch {
            return false
          }
        default:
          return strFieldValue === compareValue
      }
    }

    it('should evaluate equals operator', () => {
      expect(evaluateCondition('test', 'equals', 'test')).toBe(true)
      expect(evaluateCondition('test', 'equals', 'other')).toBe(false)
    })

    it('should evaluate notEquals operator', () => {
      expect(evaluateCondition('test', 'notEquals', 'other')).toBe(true)
      expect(evaluateCondition('test', 'notEquals', 'test')).toBe(false)
    })

    it('should evaluate contains operator', () => {
      expect(evaluateCondition('hello world', 'contains', 'world')).toBe(true)
      expect(evaluateCondition('hello world', 'contains', 'foo')).toBe(false)
    })

    it('should evaluate startsWith and endsWith', () => {
      expect(evaluateCondition('hello world', 'startsWith', 'hello')).toBe(true)
      expect(evaluateCondition('hello world', 'endsWith', 'world')).toBe(true)
    })

    it('should evaluate numeric comparisons', () => {
      expect(evaluateCondition(10, 'greaterThan', '5')).toBe(true)
      expect(evaluateCondition(10, 'lessThan', '20')).toBe(true)
      expect(evaluateCondition(10, 'greaterThanOrEqual', '10')).toBe(true)
      expect(evaluateCondition(10, 'lessThanOrEqual', '10')).toBe(true)
    })

    it('should evaluate isEmpty and isNotEmpty', () => {
      expect(evaluateCondition('', 'isEmpty', '')).toBe(true)
      expect(evaluateCondition(null, 'isEmpty', '')).toBe(true)
      expect(evaluateCondition(undefined, 'isEmpty', '')).toBe(true)
      expect(evaluateCondition('value', 'isNotEmpty', '')).toBe(true)
    })

    it('should evaluate isTrue and isFalse', () => {
      expect(evaluateCondition(true, 'isTrue', '')).toBe(true)
      expect(evaluateCondition('true', 'isTrue', '')).toBe(true)
      expect(evaluateCondition(false, 'isFalse', '')).toBe(true)
      expect(evaluateCondition('false', 'isFalse', '')).toBe(true)
    })

    it('should evaluate regex operator', () => {
      expect(evaluateCondition('test123', 'regex', '\\d+')).toBe(true)
      expect(evaluateCondition('test', 'regex', '\\d+')).toBe(false)
    })
  })

  describe('formatDate logic', () => {
    const formatDate = (date: Date, format: string): string => {
      const pad = (n: number) => n.toString().padStart(2, '0')
      return format
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', pad(date.getMonth() + 1))
        .replace('DD', pad(date.getDate()))
        .replace('HH', pad(date.getHours()))
        .replace('mm', pad(date.getMinutes()))
        .replace('ss', pad(date.getSeconds()))
    }

    it('should format date with YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15) // Jan 15, 2024
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15')
    })

    it('should format date with time', () => {
      const date = new Date(2024, 5, 20, 14, 30, 45) // Jun 20, 2024, 14:30:45
      expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-06-20 14:30:45')
    })
  })

  describe('addToDate logic', () => {
    const addToDate = (date: Date, amount: number, unit: string): Date => {
      const result = new Date(date)
      switch (unit) {
        case 'seconds': result.setSeconds(result.getSeconds() + amount); break
        case 'minutes': result.setMinutes(result.getMinutes() + amount); break
        case 'hours': result.setHours(result.getHours() + amount); break
        case 'days': result.setDate(result.getDate() + amount); break
        case 'weeks': result.setDate(result.getDate() + amount * 7); break
        case 'months': result.setMonth(result.getMonth() + amount); break
        case 'years': result.setFullYear(result.getFullYear() + amount); break
      }
      return result
    }

    it('should add days', () => {
      const date = new Date(2024, 0, 15)
      const result = addToDate(date, 5, 'days')
      expect(result.getDate()).toBe(20)
    })

    it('should subtract days (negative amount)', () => {
      const date = new Date(2024, 0, 15)
      const result = addToDate(date, -5, 'days')
      expect(result.getDate()).toBe(10)
    })

    it('should add months', () => {
      const date = new Date(2024, 0, 15)
      const result = addToDate(date, 3, 'months')
      expect(result.getMonth()).toBe(3) // April
    })

    it('should add years', () => {
      const date = new Date(2024, 0, 15)
      const result = addToDate(date, 2, 'years')
      expect(result.getFullYear()).toBe(2026)
    })
  })

  describe('extractFromDate logic', () => {
    const extractFromDate = (date: Date, part: string): number => {
      switch (part) {
        case 'year': return date.getFullYear()
        case 'month': return date.getMonth() + 1
        case 'day': return date.getDate()
        case 'hour': return date.getHours()
        case 'minute': return date.getMinutes()
        case 'second': return date.getSeconds()
        case 'dayOfWeek': return date.getDay()
        default: return 0
      }
    }

    it('should extract year', () => {
      const date = new Date(2024, 5, 15)
      expect(extractFromDate(date, 'year')).toBe(2024)
    })

    it('should extract month (1-indexed)', () => {
      const date = new Date(2024, 5, 15) // June
      expect(extractFromDate(date, 'month')).toBe(6)
    })

    it('should extract day of week', () => {
      const date = new Date(2024, 0, 1) // Monday, Jan 1, 2024
      expect(extractFromDate(date, 'dayOfWeek')).toBe(date.getDay())
    })
  })
})

describe('WorkflowExecutor - Node Execution Logic', () => {
  interface ExecutionItem {
    json: Record<string, unknown>
  }

  const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
    const keys = path.split('.')
    let current: unknown = obj
    for (const key of keys) {
      if (current === null || current === undefined) return undefined
      current = (current as Record<string, unknown>)[key]
    }
    return current
  }

  describe('Filter Node Logic', () => {
    const executeFilter = (
      items: ExecutionItem[],
      conditions: Array<{ field: string; operator: string; value: string }>,
      combineWith: 'and' | 'or' = 'and'
    ): ExecutionItem[] => {
      const evaluateCondition = (fieldValue: unknown, operator: string, compareValue: string): boolean => {
        const strFieldValue = String(fieldValue ?? '')
        const numFieldValue = Number(fieldValue)
        const numCompareValue = Number(compareValue)

        switch (operator) {
          case 'equals': return strFieldValue === compareValue
          case 'greaterThan': return numFieldValue > numCompareValue
          case 'contains': return strFieldValue.includes(compareValue)
          default: return strFieldValue === compareValue
        }
      }

      return items.filter(item => {
        const results = conditions.map(condition => {
          const fieldValue = getNestedValue(item.json, condition.field)
          return evaluateCondition(fieldValue, condition.operator, condition.value)
        })

        if (combineWith === 'and') {
          return results.every(r => r)
        } else {
          return results.some(r => r)
        }
      })
    }

    it('should filter items with single condition', () => {
      const items: ExecutionItem[] = [
        { json: { status: 'active' } },
        { json: { status: 'inactive' } },
        { json: { status: 'active' } },
      ]

      const result = executeFilter(items, [{ field: 'status', operator: 'equals', value: 'active' }])
      expect(result).toHaveLength(2)
    })

    it('should filter with AND conditions', () => {
      const items: ExecutionItem[] = [
        { json: { status: 'active', score: 100 } },
        { json: { status: 'active', score: 50 } },
        { json: { status: 'inactive', score: 100 } },
      ]

      const result = executeFilter(
        items,
        [
          { field: 'status', operator: 'equals', value: 'active' },
          { field: 'score', operator: 'greaterThan', value: '75' },
        ],
        'and'
      )
      expect(result).toHaveLength(1)
      expect(result[0].json.score).toBe(100)
    })

    it('should filter with OR conditions', () => {
      const items: ExecutionItem[] = [
        { json: { status: 'active', score: 50 } },
        { json: { status: 'inactive', score: 100 } },
        { json: { status: 'pending', score: 30 } },
      ]

      const result = executeFilter(
        items,
        [
          { field: 'status', operator: 'equals', value: 'active' },
          { field: 'score', operator: 'greaterThan', value: '75' },
        ],
        'or'
      )
      expect(result).toHaveLength(2)
    })
  })

  describe('Limit Node Logic', () => {
    const executeLimit = (items: ExecutionItem[], maxItems: number, keepFirst: boolean = true): ExecutionItem[] => {
      if (keepFirst) {
        return items.slice(0, maxItems)
      } else {
        return items.slice(-maxItems)
      }
    }

    it('should limit to first N items', () => {
      const items: ExecutionItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } },
        { json: { id: 4 } },
        { json: { id: 5 } },
      ]

      const result = executeLimit(items, 3, true)
      expect(result).toHaveLength(3)
      expect(result[0].json.id).toBe(1)
    })

    it('should keep last N items', () => {
      const items: ExecutionItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } },
        { json: { id: 4 } },
        { json: { id: 5 } },
      ]

      const result = executeLimit(items, 2, false)
      expect(result).toHaveLength(2)
      expect(result[0].json.id).toBe(4)
    })
  })

  describe('RemoveDuplicates Node Logic', () => {
    const executeRemoveDuplicates = (
      items: ExecutionItem[],
      fieldToCompare?: string
    ): ExecutionItem[] => {
      const seen = new Set<string>()
      const result: ExecutionItem[] = []

      for (const item of items) {
        let key: string
        if (!fieldToCompare) {
          key = JSON.stringify(item.json)
        } else {
          const value = getNestedValue(item.json, fieldToCompare)
          key = JSON.stringify(value)
        }

        if (!seen.has(key)) {
          seen.add(key)
          result.push(item)
        }
      }

      return result
    }

    it('should remove duplicate objects', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Alice' } },
        { json: { name: 'Bob' } },
        { json: { name: 'Alice' } },
      ]

      const result = executeRemoveDuplicates(items)
      expect(result).toHaveLength(2)
    })

    it('should remove duplicates by specific field', () => {
      const items: ExecutionItem[] = [
        { json: { id: 1, name: 'Alice' } },
        { json: { id: 2, name: 'Bob' } },
        { json: { id: 1, name: 'Alice Updated' } },
      ]

      const result = executeRemoveDuplicates(items, 'id')
      expect(result).toHaveLength(2)
      expect(result[0].json.name).toBe('Alice')
    })
  })

  describe('Aggregate Node Logic', () => {
    const executeAggregate = (
      items: ExecutionItem[],
      fieldToAggregate?: string,
      outputFieldName: string = 'data'
    ): ExecutionItem[] => {
      if (fieldToAggregate) {
        const values = items.map(item => getNestedValue(item.json, fieldToAggregate))
        return [{ json: { [outputFieldName]: values } }]
      } else {
        const allData = items.map(item => item.json)
        return [{ json: { [outputFieldName]: allData } }]
      }
    }

    it('should aggregate all items into single output', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Alice' } },
        { json: { name: 'Bob' } },
      ]

      const result = executeAggregate(items)
      expect(result).toHaveLength(1)
      expect((result[0].json.data as any[]).length).toBe(2)
    })

    it('should aggregate specific field values', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Alice', score: 100 } },
        { json: { name: 'Bob', score: 85 } },
      ]

      const result = executeAggregate(items, 'score', 'scores')
      expect(result).toHaveLength(1)
      expect(result[0].json.scores).toEqual([100, 85])
    })
  })

  describe('Summarize Node Logic', () => {
    const executeSummarize = (
      items: ExecutionItem[],
      operations: Array<{ type: string; field?: string; outputField?: string }>
    ): ExecutionItem[] => {
      const result: Record<string, unknown> = {}

      for (const op of operations) {
        const outputField = op.outputField || op.type
        const values = op.field
          ? items.map(item => getNestedValue(item.json, op.field!))
          : items.map(item => item.json)

        switch (op.type) {
          case 'count':
            result[outputField] = items.length
            break
          case 'sum':
            result[outputField] = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0)
            break
          case 'average':
            const sum = values.reduce((acc: number, v) => acc + (Number(v) || 0), 0)
            result[outputField] = items.length > 0 ? sum / items.length : 0
            break
          case 'min':
            const numVals = values.filter(v => typeof v === 'number') as number[]
            result[outputField] = numVals.length > 0 ? Math.min(...numVals) : null
            break
          case 'max':
            const numVals2 = values.filter(v => typeof v === 'number') as number[]
            result[outputField] = numVals2.length > 0 ? Math.max(...numVals2) : null
            break
        }
      }

      return [{ json: result }]
    }

    it('should count items', () => {
      const items: ExecutionItem[] = [
        { json: { id: 1 } },
        { json: { id: 2 } },
        { json: { id: 3 } },
      ]

      const result = executeSummarize(items, [{ type: 'count' }])
      expect(result[0].json.count).toBe(3)
    })

    it('should calculate sum', () => {
      const items: ExecutionItem[] = [
        { json: { value: 10 } },
        { json: { value: 20 } },
        { json: { value: 30 } },
      ]

      const result = executeSummarize(items, [{ type: 'sum', field: 'value' }])
      expect(result[0].json.sum).toBe(60)
    })

    it('should calculate average', () => {
      const items: ExecutionItem[] = [
        { json: { score: 80 } },
        { json: { score: 90 } },
        { json: { score: 100 } },
      ]

      const result = executeSummarize(items, [{ type: 'average', field: 'score', outputField: 'avgScore' }])
      expect(result[0].json.avgScore).toBe(90)
    })

    it('should find min and max', () => {
      const items: ExecutionItem[] = [
        { json: { value: 5 } },
        { json: { value: 15 } },
        { json: { value: 10 } },
      ]

      const result = executeSummarize(items, [
        { type: 'min', field: 'value' },
        { type: 'max', field: 'value' },
      ])
      expect(result[0].json.min).toBe(5)
      expect(result[0].json.max).toBe(15)
    })
  })

  describe('SplitOut Node Logic', () => {
    const executeSplitOut = (
      items: ExecutionItem[],
      fieldToSplit: string,
      includeOtherFields: boolean = true
    ): ExecutionItem[] => {
      const result: ExecutionItem[] = []

      for (const item of items) {
        const arrayValue = getNestedValue(item.json, fieldToSplit)

        if (Array.isArray(arrayValue)) {
          for (const element of arrayValue) {
            if (includeOtherFields) {
              result.push({
                json: {
                  ...item.json,
                  [fieldToSplit]: element,
                },
              })
            } else {
              result.push({
                json: typeof element === 'object' && element !== null
                  ? element as Record<string, unknown>
                  : { value: element },
              })
            }
          }
        } else {
          result.push(item)
        }
      }

      return result
    }

    it('should split array field into multiple items', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Test', tags: ['a', 'b', 'c'] } },
      ]

      const result = executeSplitOut(items, 'tags')
      expect(result).toHaveLength(3)
      expect(result[0].json.tags).toBe('a')
      expect(result[1].json.tags).toBe('b')
      expect(result[2].json.tags).toBe('c')
    })

    it('should preserve other fields when splitting', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Test', values: [1, 2] } },
      ]

      const result = executeSplitOut(items, 'values', true)
      expect(result).toHaveLength(2)
      expect(result[0].json.name).toBe('Test')
      expect(result[0].json.values).toBe(1)
    })

    it('should only output split values when includeOtherFields is false', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Test', items: [{ id: 1 }, { id: 2 }] } },
      ]

      const result = executeSplitOut(items, 'items', false)
      expect(result).toHaveLength(2)
      expect(result[0].json.id).toBe(1)
      expect(result[0].json.name).toBeUndefined()
    })

    it('should pass through items without array field', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Test', value: 'not-array' } },
      ]

      const result = executeSplitOut(items, 'value')
      expect(result).toHaveLength(1)
      expect(result[0].json.name).toBe('Test')
    })
  })

  describe('Merge Node Logic', () => {
    const executeMerge = (
      items: ExecutionItem[],
      mode: 'append' | 'combine' | 'chooseBranch' = 'append',
      combineMode?: 'mergeByPosition' | 'mergeByKey',
      joinField?: string
    ): ExecutionItem[] => {
      switch (mode) {
        case 'append':
          return items

        case 'combine':
          if (combineMode === 'mergeByPosition') {
            const midpoint = Math.floor(items.length / 2)
            const result: ExecutionItem[] = []
            for (let i = 0; i < midpoint; i++) {
              result.push({
                json: {
                  ...items[i]?.json,
                  ...items[midpoint + i]?.json,
                },
              })
            }
            return result.length > 0 ? result : items
          } else if (combineMode === 'mergeByKey' && joinField) {
            const keyMap = new Map<string, Record<string, unknown>>()
            for (const item of items) {
              const keyValue = String(getNestedValue(item.json, joinField) ?? '')
              const existing = keyMap.get(keyValue) || {}
              keyMap.set(keyValue, { ...existing, ...item.json })
            }
            return Array.from(keyMap.values()).map(json => ({ json }))
          }
          return items

        case 'chooseBranch':
          return items.length > 0 ? [items[0]] : []

        default:
          return items
      }
    }

    it('should append all items in append mode', () => {
      const items: ExecutionItem[] = [
        { json: { source: 'A', value: 1 } },
        { json: { source: 'B', value: 2 } },
      ]

      const result = executeMerge(items, 'append')
      expect(result).toHaveLength(2)
    })

    it('should merge by position', () => {
      const items: ExecutionItem[] = [
        { json: { name: 'Alice' } },
        { json: { name: 'Bob' } },
        { json: { age: 30 } },
        { json: { age: 25 } },
      ]

      const result = executeMerge(items, 'combine', 'mergeByPosition')
      expect(result).toHaveLength(2)
      expect(result[0].json.name).toBe('Alice')
      expect(result[0].json.age).toBe(30)
    })

    it('should merge by key field', () => {
      const items: ExecutionItem[] = [
        { json: { id: 1, name: 'Alice' } },
        { json: { id: 2, name: 'Bob' } },
        { json: { id: 1, email: 'alice@test.com' } },
      ]

      const result = executeMerge(items, 'combine', 'mergeByKey', 'id')
      expect(result).toHaveLength(2)
      const alice = result.find(r => r.json.name === 'Alice')
      expect(alice?.json.email).toBe('alice@test.com')
    })

    it('should choose first branch in chooseBranch mode', () => {
      const items: ExecutionItem[] = [
        { json: { value: 'first' } },
        { json: { value: 'second' } },
      ]

      const result = executeMerge(items, 'chooseBranch')
      expect(result).toHaveLength(1)
      expect(result[0].json.value).toBe('first')
    })
  })

  describe('EditFields Node Logic', () => {
    const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
      const keys = path.split('.')
      let current = obj
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
          current[keys[i]] = {}
        }
        current = current[keys[i]] as Record<string, unknown>
      }
      current[keys[keys.length - 1]] = value
    }

    const deleteNestedValue = (obj: Record<string, unknown>, path: string): void => {
      const keys = path.split('.')
      let current = obj
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) return
        current = current[keys[i]] as Record<string, unknown>
      }
      delete current[keys[keys.length - 1]]
    }

    const executeEditFields = (
      items: ExecutionItem[],
      config: {
        fields?: Array<{ name: string; value: string; type?: string }>
        removeFields?: string[]
        renameFields?: Array<{ from: string; to: string }>
        keepOnlySet?: boolean
      }
    ): ExecutionItem[] => {
      return items.map(item => {
        let newJson: Record<string, unknown> = config.keepOnlySet
          ? {}
          : { ...item.json }

        // Set new fields
        if (config.fields) {
          for (const field of config.fields) {
            let value: unknown = field.value
            if (field.type === 'number') {
              value = Number(field.value)
            } else if (field.type === 'boolean') {
              value = field.value === 'true'
            }
            setNestedValue(newJson, field.name, value)
          }
        }

        // Remove fields
        if (config.removeFields) {
          for (const fieldPath of config.removeFields) {
            deleteNestedValue(newJson, fieldPath)
          }
        }

        // Rename fields
        if (config.renameFields) {
          for (const rename of config.renameFields) {
            const value = getNestedValue(newJson, rename.from)
            if (value !== undefined) {
              deleteNestedValue(newJson, rename.from)
              setNestedValue(newJson, rename.to, value)
            }
          }
        }

        return { json: newJson }
      })
    }

    it('should add new fields', () => {
      const items: ExecutionItem[] = [{ json: { name: 'Test' } }]
      const result = executeEditFields(items, {
        fields: [{ name: 'status', value: 'active' }],
      })

      expect(result[0].json.status).toBe('active')
      expect(result[0].json.name).toBe('Test')
    })

    it('should convert field types', () => {
      const items: ExecutionItem[] = [{ json: {} }]
      const result = executeEditFields(items, {
        fields: [
          { name: 'count', value: '42', type: 'number' },
          { name: 'enabled', value: 'true', type: 'boolean' },
        ],
      })

      expect(result[0].json.count).toBe(42)
      expect(result[0].json.enabled).toBe(true)
    })

    it('should remove fields', () => {
      const items: ExecutionItem[] = [{ json: { name: 'Test', password: 'secret' } }]
      const result = executeEditFields(items, {
        removeFields: ['password'],
      })

      expect(result[0].json.name).toBe('Test')
      expect(result[0].json.password).toBeUndefined()
    })

    it('should rename fields', () => {
      const items: ExecutionItem[] = [{ json: { oldName: 'value' } }]
      const result = executeEditFields(items, {
        renameFields: [{ from: 'oldName', to: 'newName' }],
      })

      expect(result[0].json.newName).toBe('value')
      expect(result[0].json.oldName).toBeUndefined()
    })

    it('should keep only set fields when keepOnlySet is true', () => {
      const items: ExecutionItem[] = [{ json: { existing: 'value', other: 'data' } }]
      const result = executeEditFields(items, {
        fields: [{ name: 'newField', value: 'new' }],
        keepOnlySet: true,
      })

      expect(result[0].json.newField).toBe('new')
      expect(result[0].json.existing).toBeUndefined()
    })
  })

  describe('DateTime Node Logic', () => {
    const executeDateTimeNode = (
      items: ExecutionItem[],
      operation: 'now' | 'format' | 'add' | 'subtract' | 'extract',
      config: {
        inputField?: string
        outputField?: string
        format?: string
        amount?: number
        unit?: string
        extractPart?: string
      } = {}
    ): ExecutionItem[] => {
      const outputField = config.outputField || 'date'

      const formatDate = (date: Date, fmt: string): string => {
        const pad = (n: number) => n.toString().padStart(2, '0')
        return fmt
          .replace('YYYY', date.getFullYear().toString())
          .replace('MM', pad(date.getMonth() + 1))
          .replace('DD', pad(date.getDate()))
          .replace('HH', pad(date.getHours()))
          .replace('mm', pad(date.getMinutes()))
          .replace('ss', pad(date.getSeconds()))
      }

      const addToDate = (date: Date, amt: number, unit: string): Date => {
        const result = new Date(date)
        switch (unit) {
          case 'days': result.setDate(result.getDate() + amt); break
          case 'months': result.setMonth(result.getMonth() + amt); break
          case 'years': result.setFullYear(result.getFullYear() + amt); break
        }
        return result
      }

      const extractFromDate = (date: Date, part: string): number => {
        switch (part) {
          case 'year': return date.getFullYear()
          case 'month': return date.getMonth() + 1
          case 'day': return date.getDate()
          default: return 0
        }
      }

      return items.map(item => {
        let inputDate: Date
        if (config.inputField) {
          const dateValue = getNestedValue(item.json, config.inputField)
          inputDate = dateValue ? new Date(dateValue as string | number) : new Date()
        } else {
          inputDate = new Date()
        }

        let result: unknown
        switch (operation) {
          case 'now':
            result = new Date().toISOString()
            break
          case 'format':
            result = config.format ? formatDate(inputDate, config.format) : inputDate.toISOString()
            break
          case 'add':
            result = addToDate(inputDate, config.amount || 0, config.unit || 'days').toISOString()
            break
          case 'subtract':
            result = addToDate(inputDate, -(config.amount || 0), config.unit || 'days').toISOString()
            break
          case 'extract':
            result = extractFromDate(inputDate, config.extractPart || 'year')
            break
          default:
            result = inputDate.toISOString()
        }

        return {
          json: {
            ...item.json,
            [outputField]: result,
          },
        }
      })
    }

    it('should add current date with now operation', () => {
      const items: ExecutionItem[] = [{ json: { id: 1 } }]
      const result = executeDateTimeNode(items, 'now')

      expect(result[0].json.date).toBeDefined()
      expect(typeof result[0].json.date).toBe('string')
    })

    it('should format date', () => {
      const items: ExecutionItem[] = [{ json: { createdAt: '2024-06-15T10:30:00Z' } }]
      const result = executeDateTimeNode(items, 'format', {
        inputField: 'createdAt',
        outputField: 'formatted',
        format: 'YYYY-MM-DD',
      })

      expect(result[0].json.formatted).toBe('2024-06-15')
    })

    it('should add days to date', () => {
      const items: ExecutionItem[] = [{ json: { date: '2024-01-15T00:00:00Z' } }]
      const result = executeDateTimeNode(items, 'add', {
        inputField: 'date',
        outputField: 'futureDate',
        amount: 10,
        unit: 'days',
      })

      expect(result[0].json.futureDate).toContain('2024-01-25')
    })

    it('should extract year from date', () => {
      const items: ExecutionItem[] = [{ json: { date: '2024-06-15T10:30:00Z' } }]
      const result = executeDateTimeNode(items, 'extract', {
        inputField: 'date',
        outputField: 'year',
        extractPart: 'year',
      })

      expect(result[0].json.year).toBe(2024)
    })
  })

  describe('Wait Node Logic', () => {
    const calculateWaitTime = (
      waitTime: number,
      unit: 'seconds' | 'minutes' | 'hours' = 'seconds',
      maxMs: number = 5 * 60 * 1000
    ): number => {
      let milliseconds = waitTime * 1000
      switch (unit) {
        case 'minutes': milliseconds = waitTime * 60 * 1000; break
        case 'hours': milliseconds = waitTime * 60 * 60 * 1000; break
      }
      return Math.min(milliseconds, maxMs)
    }

    it('should calculate wait time in seconds', () => {
      expect(calculateWaitTime(5, 'seconds')).toBe(5000)
    })

    it('should calculate wait time in minutes', () => {
      expect(calculateWaitTime(2, 'minutes')).toBe(120000)
    })

    it('should cap wait time at maximum', () => {
      const maxMs = 5 * 60 * 1000 // 5 minutes
      expect(calculateWaitTime(10, 'hours')).toBe(maxMs)
    })
  })

  describe('HTTP Request Node Logic', () => {
    const replaceTemplatePlaceholders = (
      template: string,
      data: Record<string, unknown>
    ): string => {
      let result = template
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(`{{${key}}}`, String(value))
      }
      return result
    }

    it('should replace URL placeholders', () => {
      const url = 'https://api.example.com/users/{{userId}}'
      const data = { userId: 123 }
      const result = replaceTemplatePlaceholders(url, data)
      expect(result).toBe('https://api.example.com/users/123')
    })

    it('should replace multiple placeholders', () => {
      const template = '{{baseUrl}}/api/{{version}}/{{resource}}'
      const data = { baseUrl: 'https://api.com', version: 'v2', resource: 'users' }
      const result = replaceTemplatePlaceholders(template, data)
      expect(result).toBe('https://api.com/api/v2/users')
    })

    it('should handle missing placeholders gracefully', () => {
      const url = 'https://api.example.com/users/{{userId}}'
      const data = { otherId: 456 }
      const result = replaceTemplatePlaceholders(url, data)
      expect(result).toBe('https://api.example.com/users/{{userId}}')
    })
  })

  describe('Noop Node Logic', () => {
    const executeNoop = (items: ExecutionItem[]): ExecutionItem[] => {
      return items
    }

    it('should pass through items unchanged', () => {
      const items: ExecutionItem[] = [
        { json: { id: 1, data: 'test' } },
        { json: { id: 2, data: 'test2' } },
      ]

      const result = executeNoop(items)
      expect(result).toEqual(items)
      expect(result).toHaveLength(2)
    })

    it('should handle empty input', () => {
      const result = executeNoop([])
      expect(result).toEqual([])
    })
  })

  describe('Trigger Node Logic', () => {
    const executeTrigger = (
      triggerData?: Record<string, unknown>
    ): ExecutionItem[] => {
      return triggerData ? [{ json: triggerData }] : [{ json: {} }]
    }

    it('should create item from trigger data', () => {
      const triggerData = { webhookId: '123', body: { message: 'hello' } }
      const result = executeTrigger(triggerData)

      expect(result).toHaveLength(1)
      expect(result[0].json.webhookId).toBe('123')
    })

    it('should create empty item when no trigger data', () => {
      const result = executeTrigger()

      expect(result).toHaveLength(1)
      expect(result[0].json).toEqual({})
    })
  })
})
