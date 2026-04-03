'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from '@/components/ui/code-block';
import { DocsPageLayout, SectionHeading, Prose, type DocSection } from '../components';

const sections: DocSection[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'docker', title: 'Docker' },
  { id: 'environment', title: 'Environment Variables' },
  { id: 'database', title: 'Database Setup' },
  { id: 'scaling', title: 'Scaling' },
  { id: 'security', title: 'Production Security' },
];

export default function DeploymentDocsPage() {
  return (
    <DocsPageLayout
      title="Deployment"
      subtitle="Deploy Typeflow to production with Docker, Kubernetes, or cloud platforms."
      sections={sections}
    >
      {/* Overview */}
      <section>
        <SectionHeading id="overview">Overview</SectionHeading>
        <Prose>
          <p>
            Typeflow can be deployed in several ways depending on your scale and
            infrastructure preferences. Use <strong>Docker</strong> for single-container
            or compose-based setups, ideal for small-to-medium deployments with full
            control over the environment. <strong>Docker Compose</strong> bundles the
            application with PostgreSQL so you can start a complete stack with one
            command. For managed hosting, Typeflow also runs on{' '}
            <strong>cloud platforms</strong> such as Vercel, Railway, and Render, which
            handle scaling and TLS automatically.
          </p>
        </Prose>
      </section>

      {/* Docker */}
      <section>
        <SectionHeading id="docker">Docker</SectionHeading>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="compose">Docker Compose</TabsTrigger>
            <TabsTrigger value="single">Single Container</TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-foreground">docker-compose.yml</CardTitle>
                <CardDescription>Full production setup with PostgreSQL</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  language="bash"
                  showLineNumbers
                  code={`version: '3.8'

services:
  typeflow:
    image: typeflow/typeflow:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://typeflow:secret@db:5432/typeflow
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=https://your-domain.com
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=typeflow
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=typeflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="single">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-foreground">Single Container</CardTitle>
                <CardDescription>For development or small deployments</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  language="bash"
                  code={`# Pull and run
docker run -d \\
  --name typeflow \\
  -p 3000:3000 \\
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \\
  -e NEXTAUTH_SECRET=your-secret-key \\
  typeflow/typeflow:latest`}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Environment Variables */}
      <section>
        <SectionHeading id="environment">Environment Variables</SectionHeading>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Required Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-primary font-mono">DATABASE_URL</code>
                <p className="text-muted-foreground mt-1">PostgreSQL connection string</p>
                <code className="text-xs text-muted-foreground">postgresql://user:pass@host:5432/database</code>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-primary font-mono">NEXTAUTH_SECRET</code>
                <p className="text-muted-foreground mt-1">Secret for signing session tokens (min. 32 chars)</p>
                <code className="text-xs text-muted-foreground">openssl rand -base64 32</code>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <code className="text-primary font-mono">NEXTAUTH_URL</code>
                <p className="text-muted-foreground mt-1">Your public URL</p>
                <code className="text-xs text-muted-foreground">https://typeflow.your-domain.com</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 mt-4">
          <CardHeader>
            <CardTitle className="text-foreground">Optional Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <code className="text-primary font-mono">ENCRYPTION_KEY</code>
                <span className="text-muted-foreground">Custom key for credential encryption</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <code className="text-primary font-mono">REDIS_URL</code>
                <span className="text-muted-foreground">Redis for caching and queues</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <code className="text-primary font-mono">LOG_LEVEL</code>
                <span className="text-muted-foreground">debug, info, warn, error</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <code className="text-primary font-mono">MAX_EXECUTION_TIMEOUT</code>
                <span className="text-muted-foreground">Max workflow runtime (ms)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Database Setup */}
      <section>
        <SectionHeading id="database">Database Setup</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Running Migrations</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="bash"
              code={`# Run database migrations
npx prisma migrate deploy

# Or with Docker
docker exec typeflow npx prisma migrate deploy`}
            />
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Backup & Restore</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              language="bash"
              code={`# Backup
pg_dump -U typeflow -h localhost typeflow > backup.sql

# Restore
psql -U typeflow -h localhost typeflow < backup.sql

# Scheduled backup with Docker
docker exec -t postgres pg_dumpall -c -U typeflow > backup_$(date +%Y%m%d).sql`}
            />
          </CardContent>
        </Card>
      </section>

      {/* Scaling */}
      <section>
        <SectionHeading id="scaling">Scaling</SectionHeading>

        <Card className="bg-card/50 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Horizontal Scaling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Prose>
              <p>
                Typeflow supports horizontal scaling with multiple instances behind a
                load balancer.
              </p>
            </Prose>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Load Balancer</h4>
                <p className="text-sm text-muted-foreground">Use nginx, HAProxy, or cloud load balancers</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Session Storage</h4>
                <p className="text-sm text-muted-foreground">Configure Redis for shared sessions across instances</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-1">Queue Workers</h4>
                <p className="text-sm text-muted-foreground">Separate worker processes for workflow execution</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Resource Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Small (1-10 workflows)</span>
                <span className="text-muted-foreground">1 CPU, 1GB RAM</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Medium (10-50 workflows)</span>
                <span className="text-muted-foreground">2 CPU, 4GB RAM</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="font-medium text-foreground">Large (50+ workflows)</span>
                <span className="text-muted-foreground">4+ CPU, 8GB+ RAM, Redis</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Production Security */}
      <section>
        <SectionHeading id="security">Production Security</SectionHeading>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-foreground">Security Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Use HTTPS</strong> &mdash;
                Configure TLS/SSL for all traffic
              </li>
              <li>
                <strong className="text-foreground">Strong Secrets</strong> &mdash;
                Generate random secrets for NEXTAUTH_SECRET
              </li>
              <li>
                <strong className="text-foreground">Database Security</strong> &mdash;
                Use strong passwords and restrict network access
              </li>
              <li>
                <strong className="text-foreground">Regular Updates</strong> &mdash;
                Keep Docker images and dependencies updated
              </li>
              <li>
                <strong className="text-foreground">Backup Strategy</strong> &mdash;
                Regular automated database backups
              </li>
              <li>
                <strong className="text-foreground">Rate Limiting</strong> &mdash;
                Configure limits on API and webhook endpoints
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </DocsPageLayout>
  );
}
