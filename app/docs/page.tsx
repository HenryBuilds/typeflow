'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sections = [
  {
    title: 'Custom Node Development',
    description:
      'Build your own nodes to extend Typeflow with custom integrations and transformations.',
    href: '/docs/custom-nodes',
  },
  {
    title: 'Workflow Engine',
    description:
      'How Typeflow executes workflows, handles data flow, and manages state.',
    href: '/docs/workflow-engine',
  },
  {
    title: 'Triggers & Webhooks',
    description:
      'Set up workflow triggers including webhooks, schedules, and event-driven execution.',
    href: '/docs/triggers',
  },
  {
    title: 'Credentials & Secrets',
    description:
      'Securely manage API keys, OAuth tokens, and other sensitive configuration.',
    href: '/docs/credentials',
  },
  {
    title: 'Testing Workflows',
    description:
      'Debug and test workflows with breakpoints, step-by-step execution, and assertions.',
    href: '/docs/testing',
  },
  {
    title: 'Deployment',
    description:
      'Deploy Typeflow to production with Docker, Kubernetes, or cloud platforms.',
    href: '/docs/deployment',
  },
  {
    title: 'Node Playground',
    description:
      'Experiment with nodes in an isolated sandbox before adding them to a workflow.',
    href: '/docs/node-playground',
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Typeflow
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium text-foreground">
              Documentation
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Documentation
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Guides and references for building, testing, and deploying type-safe
          workflows with Typeflow.
        </p>

        <div className="mt-12 divide-y divide-border">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group flex items-start justify-between gap-4 py-5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <h2 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
