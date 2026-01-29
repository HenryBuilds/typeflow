/**
 * Tests for HTTP Request Node (Declarative Style)
 */

import { HttpRequestNode } from '../../nodes/HttpRequest/HttpRequest.node';

describe('HttpRequestNode', () => {
  let node: HttpRequestNode;

  beforeEach(() => {
    node = new HttpRequestNode();
  });

  describe('description', () => {
    it('should have correct basic properties', () => {
      expect(node.description.name).toBe('httpRequest');
      expect(node.description.displayName).toBe('HTTP Request');
      expect(node.description.group).toContain('output');
    });

    it('should NOT have execute method (declarative style)', () => {
      // Declarative nodes don't implement execute()
      // The workflow engine handles execution based on routing config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect('execute' in node).toBe(false);
    });

    it('should have routing configuration in method options', () => {
      const methodProperty = node.description.properties.find(
        p => p.name === 'method'
      );
      
      expect(methodProperty).toBeDefined();
      expect(methodProperty?.options).toBeDefined();
      
      const getOption = methodProperty?.options?.find((o: any) => o.value === 'GET');
      expect(getOption?.routing).toBeDefined();
      expect(getOption?.routing?.request?.method).toBe('GET');
    });

    it('should have URL property with routing', () => {
      const urlProperty = node.description.properties.find(
        p => p.name === 'url'
      );
      
      expect(urlProperty).toBeDefined();
      expect(urlProperty?.routing).toBeDefined();
      expect(urlProperty?.routing?.request?.url).toContain('$parameter["url"]');
    });

    it('should have body property for POST/PUT/PATCH methods', () => {
      const bodyProperty = node.description.properties.find(
        p => p.name === 'body'
      );
      
      expect(bodyProperty).toBeDefined();
      expect(bodyProperty?.displayOptions?.show?.method).toContain('POST');
      expect(bodyProperty?.displayOptions?.show?.method).toContain('PUT');
      expect(bodyProperty?.displayOptions?.show?.method).toContain('PATCH');
    });
  });

  describe('Typeflow-exclusive features', () => {
    it('should have resilience configuration', () => {
      expect(node.description.resilience).toBeDefined();
      expect(node.description.resilience?.retry?.maxAttempts).toBeGreaterThan(0);
      expect(node.description.resilience?.retry?.backoff).toBe('exponential');
    });

    it('should have rate limiting configuration', () => {
      expect(node.description.rateLimiting).toBeDefined();
      expect(node.description.rateLimiting?.maxRequests).toBeGreaterThan(0);
      expect(node.description.rateLimiting?.windowSeconds).toBeGreaterThan(0);
    });

    it('should have category and tags', () => {
      expect(node.description.category).toBe('Network');
      expect(node.description.tags).toContain('http');
      expect(node.description.tags).toContain('api');
    });
  });

  describe('routing validation', () => {
    it('should have all HTTP methods configured', () => {
      const methodProperty = node.description.properties.find(
        p => p.name === 'method'
      );
      
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      
      for (const method of methods) {
        const option = methodProperty?.options?.find((o: any) => o.value === method);
        expect(option).toBeDefined();
        expect(option?.routing?.request?.method).toBe(method);
      }
    });
  });

  describe('credentials', () => {
    it('should have optional credential configurations', () => {
      expect(node.description.credentials).toBeDefined();
      expect(node.description.credentials?.length).toBeGreaterThan(0);
      
      // All credentials should be optional
      for (const cred of node.description.credentials || []) {
        expect(cred.required).toBe(false);
      }
    });
  });
});
