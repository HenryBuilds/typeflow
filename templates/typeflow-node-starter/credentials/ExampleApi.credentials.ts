/**
 * Example Credentials
 * 
 * This file demonstrates how to create credentials for your custom node.
 * Credentials handle authentication with external APIs.
 */

import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from '../types/typeflow-workflow';

export class ExampleApi implements ICredentialType {
  // Internal name used in node's credential definition
  name = 'exampleApi';
  
  // Display name shown in the UI
  displayName = 'Example API';
  
  // Link to documentation (optional but recommended)
  documentationUrl = 'https://docs.example.com/api-authentication';
  
  // Define the fields users need to fill out
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true, // Masks the input
      },
      default: '',
      description: 'Your Example API key',
    },
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        { name: 'Production', value: 'production' },
        { name: 'Sandbox', value: 'sandbox' },
      ],
      default: 'production',
      description: 'API environment to use',
    },
  ];

  // Define how credentials are applied to requests
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'Authorization': '=Bearer {{$credentials.apiKey}}',
      },
    },
  };
}
