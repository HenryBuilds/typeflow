'use client';

import Link from 'next/link';
import { ArrowLeft, Book, Code2, Layers, Zap, Settings, Key, TestTube, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const docsSections = [
  {
    title: 'Custom Node Development',
    description: 'Build your own nodes to extend Typeflow with custom integrations and transformations.',
    icon: Code2,
    href: '/docs/custom-nodes',
    colorClass: 'text-primary bg-primary/10',
    tags: ['Nodes', 'TypeScript', 'API'],
  },
  {
    title: 'Workflow Engine',
    description: 'Understanding how Typeflow executes workflows and handles data flow.',
    icon: Layers,
    href: '/docs/workflow-engine',
    colorClass: 'text-chart-3 bg-chart-3/10',
    tags: ['Execution', 'Data Flow', 'Architecture'],
    comingSoon: true,
  },
  {
    title: 'Triggers & Webhooks',
    description: 'Set up workflow triggers including webhooks, schedules, and events.',
    icon: Zap,
    href: '/docs/triggers',
    colorClass: 'text-chart-4 bg-chart-4/10',
    tags: ['Webhooks', 'Cron', 'Events'],
    comingSoon: true,
  },
  {
    title: 'Credentials & Secrets',
    description: 'Securely manage API keys, OAuth tokens, and other sensitive data.',
    icon: Key,
    href: '/docs/credentials',
    colorClass: 'text-chart-1 bg-chart-1/10',
    tags: ['Security', 'OAuth', 'API Keys'],
    comingSoon: true,
  },
  {
    title: 'Testing Workflows',
    description: 'Debug and test your workflows with breakpoints and step-by-step execution.',
    icon: TestTube,
    href: '/docs/testing',
    colorClass: 'text-chart-2 bg-chart-2/10',
    tags: ['Debugging', 'Testing', 'Breakpoints'],
    comingSoon: true,
  },
  {
    title: 'Deployment',
    description: 'Deploy Typeflow to production with Docker, Kubernetes, or cloud platforms.',
    icon: Rocket,
    href: '/docs/deployment',
    colorClass: 'text-chart-5 bg-chart-5/10',
    tags: ['Docker', 'Production', 'Scaling'],
    comingSoon: true,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Typeflow
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Documentation</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Typeflow Documentation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build, deploy, and scale type-safe workflows.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          <Link href="/docs/custom-nodes">
            <Button variant="secondary">
              <Code2 className="h-4 w-4 mr-2" />
              Build Custom Nodes
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">
              <Settings className="h-4 w-4 mr-2" />
              Getting Started
            </Button>
          </Link>
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docsSections.map((section) => (
            <Link 
              key={section.title} 
              href={section.comingSoon ? '#' : section.href}
              className={section.comingSoon ? 'cursor-not-allowed' : ''}
            >
              <Card className={`bg-card/50 h-full transition-all hover:border-primary/50 ${section.comingSoon ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-lg ${section.colorClass} flex items-center justify-center`}>
                      <section.icon className="h-6 w-6" />
                    </div>
                    {section.comingSoon && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-foreground mt-4">{section.title}</CardTitle>
                  <CardDescription>
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {section.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary/5 to-chart-3/5 border-border">
            <CardContent className="py-12">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Can&apos;t find what you&apos;re looking for?
              </h3>
              <p className="text-muted-foreground mb-6">
                Join our community to ask questions and get help from other developers.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="https://github.com/typeflow/typeflow/discussions">
                  <Button variant="outline">
                    GitHub Discussions
                  </Button>
                </Link>
                <Link href="https://discord.gg/typeflow">
                  <Button variant="outline">
                    Discord Community
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
