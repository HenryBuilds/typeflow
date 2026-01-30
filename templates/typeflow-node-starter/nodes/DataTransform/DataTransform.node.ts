/**
 * Data Transform Node (Programmatic Style)
 * 
 * This demonstrates creating a node using the programmatic style,
 * where you implement the execute() method for full control.
 * 
 * Best for: Complex logic, data transformations, custom processing.
 * 
 * You have full control over:
 * - Input data processing
 * - Business logic
 * - Output formatting
 * - Error handling
 */

import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
} from '../../types/workflow-types';

export class DataTransformNode implements INodeType {
  description: INodeTypeDescription = {
    // ==================== Basic Info ====================
    displayName: 'Data Transform',
    name: 'dataTransform',
    icon: 'file:transform.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Transform, filter, and manipulate data',
    defaults: {
      name: 'Data Transform',
    },
    
    // ==================== Connections ====================
    inputs: ['main'],
    outputs: ['main'],
    
    // ==================== Properties ====================
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Uppercase',
            value: 'uppercase',
            description: 'Convert a text field to uppercase',
          },
          {
            name: 'Lowercase',
            value: 'lowercase',
            description: 'Convert a text field to lowercase',
          },
          {
            name: 'Filter Items',
            value: 'filter',
            description: 'Keep only items matching a condition',
          },
          {
            name: 'Sort Items',
            value: 'sort',
            description: 'Sort items by a field',
          },
          {
            name: 'Add Field',
            value: 'addField',
            description: 'Add a new field to each item',
          },
          {
            name: 'Remove Field',
            value: 'removeField',
            description: 'Remove a field from each item',
          },
        ],
        default: 'uppercase',
      },
      
      // Field name (for uppercase/lowercase/removeField)
      {
        displayName: 'Field Name',
        name: 'fieldName',
        type: 'string',
        required: true,
        displayOptions: {
          show: { operation: ['uppercase', 'lowercase', 'removeField'] },
        },
        default: '',
        description: 'The name of the field to transform',
      },
      
      // Filter Condition
      {
        displayName: 'Filter Field',
        name: 'filterField',
        type: 'string',
        displayOptions: {
          show: { operation: ['filter'] },
        },
        default: '',
        description: 'Field to check',
      },
      {
        displayName: 'Filter Condition',
        name: 'filterCondition',
        type: 'options',
        displayOptions: {
          show: { operation: ['filter'] },
        },
        options: [
          { name: 'Equals', value: 'equals' },
          { name: 'Not Equals', value: 'notEquals' },
          { name: 'Contains', value: 'contains' },
          { name: 'Greater Than', value: 'gt' },
          { name: 'Less Than', value: 'lt' },
          { name: 'Is Empty', value: 'isEmpty' },
          { name: 'Is Not Empty', value: 'isNotEmpty' },
        ],
        default: 'equals',
      },
      {
        displayName: 'Filter Value',
        name: 'filterValue',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['filter'],
            filterCondition: ['equals', 'notEquals', 'contains', 'gt', 'lt'],
          },
        },
        default: '',
      },
      
      // Sort Options
      {
        displayName: 'Sort Field',
        name: 'sortField',
        type: 'string',
        displayOptions: {
          show: { operation: ['sort'] },
        },
        default: '',
      },
      {
        displayName: 'Sort Direction',
        name: 'sortDirection',
        type: 'options',
        displayOptions: {
          show: { operation: ['sort'] },
        },
        options: [
          { name: 'Ascending', value: 'asc' },
          { name: 'Descending', value: 'desc' },
        ],
        default: 'asc',
      },
      
      // Add Field Options
      {
        displayName: 'New Field Name',
        name: 'newFieldName',
        type: 'string',
        displayOptions: {
          show: { operation: ['addField'] },
        },
        default: '',
        description: 'Name for the new field',
      },
      {
        displayName: 'New Field Value',
        name: 'newFieldValue',
        type: 'string',
        displayOptions: {
          show: { operation: ['addField'] },
        },
        default: '',
        description: 'Value for the new field (supports expressions)',
      },
    ],
    
    // ==================== TYPEFLOW-EXCLUSIVE ====================
    
    category: 'Data Transformation',
    tags: ['transform', 'filter', 'sort', 'uppercase', 'lowercase', 'data'],
    
    // Parallel processing for better performance
    parallelProcessing: {
      enabled: true,
      concurrency: 5,
      batchSize: 100,
      errorStrategy: 'continue',
    },
    
    // Caching for repeated operations
    caching: {
      enabled: true,
      ttl: 300,
      scope: 'workflow',
      invalidateOn: ['input_change'],
    },
    
    // Test cases
    testCases: [
      {
        name: 'Should convert text to uppercase',
        input: [{ json: { name: 'hello world' } }],
        parameters: { operation: 'uppercase', fieldName: 'name' },
        expectedOutput: [{ json: { name: 'HELLO WORLD' } }],
      },
      {
        name: 'Should filter items by field value',
        input: [
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
        expectedOutput: [
          { json: { name: 'Alice', status: 'active' } },
          { json: { name: 'Charlie', status: 'active' } },
        ],
      },
    ],
    
    documentation: {
      longDescription: `
## Data Transform Node

A powerful node for data manipulation and transformation.

### Operations

- **Uppercase/Lowercase**: Convert text fields
- **Filter Items**: Keep only items matching your conditions
- **Sort Items**: Order items by any field
- **Add/Remove Field**: Modify item structure
      `,
      examples: [
        {
          title: 'Filter Active Users',
          description: 'Keep only users with active status',
          input: { status: 'active' },
          parameters: { operation: 'filter', filterField: 'status', filterCondition: 'equals', filterValue: 'active' },
          output: { status: 'active' },
        },
      ],
    },
  };

  /**
   * Execute the node logic
   * This is where the magic happens in programmatic style!
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const operation = this.getNodeParameter('operation', 0) as string;
    let results: INodeExecutionData[] = [];

    switch (operation) {
      case 'uppercase': {
        const fieldName = this.getNodeParameter('fieldName', 0) as string;
        for (const item of items) {
          const json = { ...item.json };
          if (json[fieldName] && typeof json[fieldName] === 'string') {
            json[fieldName] = (json[fieldName] as string).toUpperCase();
          }
          results.push({ json });
        }
        break;
      }

      case 'lowercase': {
        const fieldName = this.getNodeParameter('fieldName', 0) as string;
        for (const item of items) {
          const json = { ...item.json };
          if (json[fieldName] && typeof json[fieldName] === 'string') {
            json[fieldName] = (json[fieldName] as string).toLowerCase();
          }
          results.push({ json });
        }
        break;
      }

      case 'filter': {
        const filterField = this.getNodeParameter('filterField', 0) as string;
        const filterCondition = this.getNodeParameter('filterCondition', 0) as string;
        const filterValue = this.getNodeParameter('filterValue', 0, '') as string;
        
        for (const item of items) {
          const fieldValue = item.json[filterField];
          let matches = false;
          
          switch (filterCondition) {
            case 'equals':
              matches = String(fieldValue) === filterValue;
              break;
            case 'notEquals':
              matches = String(fieldValue) !== filterValue;
              break;
            case 'contains':
              matches = String(fieldValue).includes(filterValue);
              break;
            case 'gt':
              matches = Number(fieldValue) > Number(filterValue);
              break;
            case 'lt':
              matches = Number(fieldValue) < Number(filterValue);
              break;
            case 'isEmpty':
              matches = fieldValue === null || fieldValue === undefined || fieldValue === '';
              break;
            case 'isNotEmpty':
              matches = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
              break;
          }
          
          if (matches) {
            results.push(item);
          }
        }
        break;
      }

      case 'sort': {
        const sortField = this.getNodeParameter('sortField', 0) as string;
        const sortDirection = this.getNodeParameter('sortDirection', 0) as string;
        
        results = [...items].sort((a, b) => {
          const aVal = a.json[sortField];
          const bVal = b.json[sortField];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          const comparison = String(aVal).localeCompare(String(bVal));
          return sortDirection === 'asc' ? comparison : -comparison;
        });
        break;
      }

      case 'addField': {
        const newFieldName = this.getNodeParameter('newFieldName', 0) as string;
        const newFieldValue = this.getNodeParameter('newFieldValue', 0) as string;
        
        for (const item of items) {
          const json = { ...item.json, [newFieldName]: newFieldValue };
          results.push({ json });
        }
        break;
      }

      case 'removeField': {
        const fieldName = this.getNodeParameter('fieldName', 0) as string;
        
        for (const item of items) {
          const json = { ...item.json };
          delete json[fieldName];
          results.push({ json });
        }
        break;
      }

      default:
        results = items;
    }

    return [results];
  }
}
