'use client';

import { DocsPageLayout, SectionHeading, Prose, type DocSection } from '../components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';

const sections: DocSection[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'creating', title: 'Creating Credentials' },
  { id: 'types', title: 'Credential Types' },
  { id: 'security', title: 'Security' },
  { id: 'usage', title: 'Using in Workflows' },
];

export default function CredentialsDocsPage() {
  return (
    <DocsPageLayout
      title="Credentials & Secrets"
      subtitle="Securely manage API keys, OAuth tokens, database connections, and other sensitive data."
      sections={sections}
    >
      {/* Overview */}
      <section>
        <SectionHeading id="overview">Overview</SectionHeading>
        <Prose>
          <p>
            Credentials let you store sensitive information — API keys, OAuth tokens, database
            passwords, and other secrets — separately from your workflow definitions. This keeps
            secrets secure and makes them reusable across multiple workflows.
          </p>
          <p>
            <strong>Encrypted storage</strong> — Secrets are encrypted at rest with AES-256.
          </p>
          <p>
            <strong>Reusable</strong> — Use the same credential across multiple workflows without
            duplicating sensitive data.
          </p>
          <p>
            <strong>Access control</strong> — Credentials are scoped to organizations with
            role-based access.
          </p>
        </Prose>
      </section>

      {/* Creating Credentials */}
      <section>
        <SectionHeading id="creating">Creating Credentials</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">From the UI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open a node that requires authentication (e.g., HTTP Request, Database)</li>
              <li>Click the <strong>Credential</strong> dropdown</li>
              <li>Select <strong>Create New</strong></li>
              <li>Fill in the required fields (API key, connection string, etc.)</li>
              <li>Give the credential a memorable name</li>
              <li>Click <strong>Save</strong></li>
            </ol>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Via API</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://your-domain.com/api/credentials \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Database",
    "type": "postgres",
    "data": {
      "host": "localhost",
      "port": 5432,
      "database": "mydb",
      "user": "admin",
      "password": "secret"
    }
  }'`}
            />
          </CardContent>
        </Card>
      </section>

      {/* Credential Types */}
      <section>
        <SectionHeading id="types">Credential Types</SectionHeading>

        <div className="grid gap-4">
          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">API Key</CardTitle>
              <CardDescription>Simple authentication with a single key</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "apiKey": "sk_live_xxx..."
}`} />
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">OAuth2</CardTitle>
              <CardDescription>OAuth 2.0 with access and refresh tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "clientId": "...",
  "clientSecret": "...",
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": 1234567890
}`} />
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">Database</CardTitle>
              <CardDescription>Connection strings for PostgreSQL, MySQL, MongoDB, Redis</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "host": "db.example.com",
  "port": 5432,
  "database": "production",
  "user": "app_user",
  "password": "...",
  "ssl": true
}`} />
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">Basic Auth</CardTitle>
              <CardDescription>Username and password</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code={`{
  "username": "admin",
  "password": "..."
}`} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Security */}
      <section>
        <SectionHeading id="security">Security</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Encryption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">At Rest</h4>
              <p className="text-sm text-muted-foreground">All credentials are encrypted with AES-256-GCM before storage</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">In Transit</h4>
              <p className="text-sm text-muted-foreground">TLS 1.3 for all API communication</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-foreground mb-1">Key Management</h4>
              <p className="text-sm text-muted-foreground">Encryption keys are stored separately and rotated regularly</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Use descriptive names to identify credentials easily</li>
              <li>Create separate credentials for development and production</li>
              <li>Rotate API keys and tokens regularly</li>
              <li>Use least-privilege principle for database users</li>
              <li>Never hardcode secrets in workflow expressions</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Usage */}
      <section>
        <SectionHeading id="usage">Using in Workflows</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Selecting Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Prose>
              <p>
                When configuring a node that requires authentication, select the appropriate
                credential from the dropdown. The credential fields will be automatically injected
                into the request.
              </p>
            </Prose>
            <CodeBlock code={`// In HTTP Request node
URL: https://api.example.com/data
Credential: "My API Key"

// Automatically adds:
Headers: {
  "Authorization": "Bearer sk_live_xxx..."
}`} />
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Expression Access</CardTitle>
            <CardDescription>Access credential data in expressions (advanced)</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={`// Access credential fields in Code node
const apiKey = $credentials.apiKey;
const baseUrl = $credentials.baseUrl || 'https://api.default.com';

// Use in dynamic configurations
const headers = {
  'X-Custom-Header': $credentials.customHeader
};`} />
          </CardContent>
        </Card>
      </section>
    </DocsPageLayout>
  );
}
