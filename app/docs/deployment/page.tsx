'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Rocket, Container, Cloud, Server, Menu, X, ChevronRight, Settings, Database, Shield, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'overview', title: 'Overview', icon: Rocket },
  { id: 'docker', title: 'Docker', icon: Container },
  { id: 'environment', title: 'Environment Variables', icon: Settings },
  { id: 'database', title: 'Database Setup', icon: Database },
  { id: 'scaling', title: 'Scaling', icon: Gauge },
  { id: 'security', title: 'Production Security', icon: Shield },
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

export default function DeploymentDocsPage() {
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
              Deployment
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Deploy Typeflow to production with Docker, Kubernetes, or cloud platforms.
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
                  <CardTitle className="text-foreground">Deployment Options</CardTitle>
                  <CardDescription>Choose the right deployment strategy for your needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Container className="h-6 w-6 text-primary mb-2" />
                      <h4 className="font-medium text-foreground">Docker</h4>
                      <p className="text-sm text-muted-foreground">Single container for small deployments</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Server className="h-6 w-6 text-chart-4 mb-2" />
                      <h4 className="font-medium text-foreground">Docker Compose</h4>
                      <p className="text-sm text-muted-foreground">Multi-container with database</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <Cloud className="h-6 w-6 text-chart-1 mb-2" />
                      <h4 className="font-medium text-foreground">Cloud Platforms</h4>
                      <p className="text-sm text-muted-foreground">Vercel, Railway, Render</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Docker */}
            <section id="docker" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
                Docker
              </h2>

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
  postgres_data:`} />
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
  typeflow/typeflow:latest`} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

            {/* Environment Variables */}
            <section id="environment" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
                Environment Variables
              </h2>

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

            {/* Database */}
            <section id="database" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">4</span>
                Database Setup
              </h2>

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
docker exec typeflow npx prisma migrate deploy`} />
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
docker exec -t postgres pg_dumpall -c -U typeflow > backup_$(date +%Y%m%d).sql`} />
                </CardContent>
              </Card>
            </section>

            {/* Scaling */}
            <section id="scaling" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">5</span>
                Scaling
              </h2>

              <Card className="bg-card/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-foreground">Horizontal Scaling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Typeflow supports horizontal scaling with multiple instances behind a load balancer.
                  </p>
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

            {/* Security */}
            <section id="security" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">6</span>
                Production Security
              </h2>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Security Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <div>
                        <strong className="text-foreground">Use HTTPS</strong>
                        <p className="text-sm">Configure TLS/SSL for all traffic</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <div>
                        <strong className="text-foreground">Strong Secrets</strong>
                        <p className="text-sm">Generate random secrets for NEXTAUTH_SECRET</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <div>
                        <strong className="text-foreground">Database Security</strong>
                        <p className="text-sm">Use strong passwords and restrict network access</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <div>
                        <strong className="text-foreground">Regular Updates</strong>
                        <p className="text-sm">Keep Docker images and dependencies updated</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <div>
                        <strong className="text-foreground">Backup Strategy</strong>
                        <p className="text-sm">Regular automated database backups</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <div>
                        <strong className="text-foreground">Rate Limiting</strong>
                        <p className="text-sm">Configure limits on API and webhook endpoints</p>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-primary/10 to-chart-5/10 border-primary/20">
              <CardContent className="py-12">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Ready to deploy?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Get Typeflow running in production in minutes.
                </p>
                <div className="flex gap-4 justify-center">
                  <a href="https://github.com/HenryBuilds/typeflow" target="_blank" rel="noopener noreferrer">
                    <Button size="lg">
                      <Container className="h-4 w-4 mr-2" />
                      View on GitHub
                    </Button>
                  </a>
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
