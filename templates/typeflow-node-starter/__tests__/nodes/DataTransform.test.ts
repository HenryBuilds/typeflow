/**
 * Tests for Data Transform Node (Programmatic Style)
 */

import { DataTransformNode } from '../../nodes/DataTransform/DataTransform.node';
import { createMockExecuteFunctions } from '../helpers/mock-execute-functions';

describe('DataTransformNode', () => {
  let node: DataTransformNode;

  beforeEach(() => {
    node = new DataTransformNode();
  });

  describe('description', () => {
    it('should have correct basic properties', () => {
      expect(node.description.name).toBe('dataTransform');
      expect(node.description.displayName).toBe('Data Transform');
      expect(node.description.group).toContain('transform');
    });

    it('should have execute method', () => {
      expect(typeof node.execute).toBe('function');
    });

    it('should have test cases defined', () => {
      expect(node.description.testCases).toBeDefined();
      expect(node.description.testCases!.length).toBeGreaterThan(0);
    });
  });

  describe('execute - uppercase', () => {
    it('should convert text field to uppercase', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 'hello world' } },
          { json: { name: 'foo bar' } },
        ],
        parameters: {
          operation: 'uppercase',
          fieldName: 'name',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.name).toBe('HELLO WORLD');
      expect(result[0][1].json.name).toBe('FOO BAR');
    });

    it('should handle non-string fields gracefully', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 123 } },
        ],
        parameters: {
          operation: 'uppercase',
          fieldName: 'name',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0][0].json.name).toBe(123);
    });
  });

  describe('execute - lowercase', () => {
    it('should convert text field to lowercase', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { title: 'HELLO WORLD' } },
        ],
        parameters: {
          operation: 'lowercase',
          fieldName: 'title',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0][0].json.title).toBe('hello world');
    });
  });

  describe('execute - filter', () => {
    it('should filter items by equals condition', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 'Alice', status: 'active' } },
          { json: { name: 'Bob', status: 'inactive' } },
          { json: { name: 'Charlie', status: 'active' } },
        ],
        parameters: {
          operation: 'filter',
          filterField: 'status',
          filterCondition: 'equals',
          filterValue: 'active',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.name).toBe('Alice');
      expect(result[0][1].json.name).toBe('Charlie');
    });

    it('should filter items by notEquals condition', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { status: 'active' } },
          { json: { status: 'inactive' } },
        ],
        parameters: {
          operation: 'filter',
          filterField: 'status',
          filterCondition: 'notEquals',
          filterValue: 'active',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.status).toBe('inactive');
    });

    it('should filter items by contains condition', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { email: 'alice@example.com' } },
          { json: { email: 'bob@test.org' } },
        ],
        parameters: {
          operation: 'filter',
          filterField: 'email',
          filterCondition: 'contains',
          filterValue: 'example',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.email).toBe('alice@example.com');
    });

    it('should filter items by isEmpty condition', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 'Alice', notes: '' } },
          { json: { name: 'Bob', notes: 'Some notes' } },
        ],
        parameters: {
          operation: 'filter',
          filterField: 'notes',
          filterCondition: 'isEmpty',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.name).toBe('Alice');
    });
  });

  describe('execute - sort', () => {
    it('should sort items ascending', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 'Charlie' } },
          { json: { name: 'Alice' } },
          { json: { name: 'Bob' } },
        ],
        parameters: {
          operation: 'sort',
          sortField: 'name',
          sortDirection: 'asc',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0][0].json.name).toBe('Alice');
      expect(result[0][1].json.name).toBe('Bob');
      expect(result[0][2].json.name).toBe('Charlie');
    });

    it('should sort items descending', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { score: 85 } },
          { json: { score: 92 } },
          { json: { score: 78 } },
        ],
        parameters: {
          operation: 'sort',
          sortField: 'score',
          sortDirection: 'desc',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0][0].json.score).toBe(92);
      expect(result[0][1].json.score).toBe(85);
      expect(result[0][2].json.score).toBe(78);
    });
  });

  describe('execute - addField', () => {
    it('should add a new field to items', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 'Alice' } },
        ],
        parameters: {
          operation: 'addField',
          newFieldName: 'processed',
          newFieldValue: 'true',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0][0].json.name).toBe('Alice');
      expect(result[0][0].json.processed).toBe('true');
    });
  });

  describe('execute - removeField', () => {
    it('should remove a field from items', async () => {
      const mockContext = createMockExecuteFunctions({
        inputData: [
          { json: { name: 'Alice', password: 'secret' } },
        ],
        parameters: {
          operation: 'removeField',
          fieldName: 'password',
        },
      });

      const result = await node.execute.call(mockContext as any);

      expect(result[0][0].json.name).toBe('Alice');
      expect(result[0][0].json.password).toBeUndefined();
    });
  });

  describe('built-in test cases', () => {
    it('should pass all defined test cases', async () => {
      const testCases = node.description.testCases || [];

      for (const testCase of testCases) {
        const mockContext = createMockExecuteFunctions({
          inputData: testCase.input,
          parameters: testCase.parameters,
        });

        const result = await node.execute.call(mockContext as any);

        if (testCase.expectedOutput) {
          expect(result[0]).toEqual(testCase.expectedOutput);
        }
      }
    });
  });
});
