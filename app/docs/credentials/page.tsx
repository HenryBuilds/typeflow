'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Key, Shield, Lock, Database, Menu, X, ChevronRight, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', title: 'Overview', icon: Key },
  { id: 'creating', title: 'Creating Credentials', icon: Settings },
  { id: 'types', title: 'Credential Types', icon: Database },
  { id: 'security', title: 'Security', icon: Shield },
  { id: 'usage', title: 'Using in Workflows', icon: Lock },
];

function SideNav({ activeSection }: { activeSection: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 lg:hidden shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <aside className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 z-40 flex flex-col",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
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
          
          <div className="mt-8 pt-4 border-t border-border">
            <Link
              href="/docs"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              ← All Documentation
            </Link>
          </div>
        </nav>
      </aside>

      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

export default function CredentialsDocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

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
              Credentials & Secrets
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Securely manage API keys, OAuth tokens, database connections, and other sensitive data.
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-16">
            {/* Overview */}
            <section id="overview" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
                Overview
              </h2>
              
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Why Credentials?</CardTitle>
                  <CardDescription>Keep secrets secure and reusable</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Shield className="h-6 w-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground">Encrypted Storage</h4>
                      <p className="text-sm text-muted-foreground">Secrets are encrypted at rest with AES-256</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Key className="h-6 w-6 text-chart-4 mb-2" />
                      <h4 className="font-medium text-foreground">Reusable</h4>
                      <p className="text-sm text-muted-foreground">Use the same credential across multiple workflows</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Lock className="h-6 w-6 text-chart-1 mb-2" />
                      <h4 className="font-medium text-foreground">Access Control</h4>
                      <p className="text-sm text-muted-foreground">Scoped to organizations with role-based access</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Creating Credentials */}
            <section id="creating" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Creating Credentials
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">From the UI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
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
  }'`} />
                </CardContent>
              </Card>
            </section>

            {/* Credential Types */}
            <section id="types" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Credential Types
              </h2>

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
            <section id="security" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Security
              </h2>

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
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      Use descriptive names to identify credentials easily
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      Create separate credentials for development and production
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      Rotate API keys and tokens regularly
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      Use least-privilege principle for database users
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">✗</span>
                      Never hardcode secrets in workflow expressions
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            {/* Usage */}
            <section id="usage" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
                Using in Workflows
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Selecting Credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    When configuring a node that requires authentication, select the appropriate credential from the dropdown.
                    The credential fields will be automatically injected into the request.
                  </p>
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
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-primary/10 to-chart-1/10 border-primary/20">
              <CardContent className="py-12">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to connect?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add your first credential and start integrating with external services.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/">
                    <Button size="lg">
                      <Key className="h-4 w-4 mr-2" />
                      Add Credential
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
