'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ─── Types ─── */
export interface DocSection {
  id: string;
  title: string;
}

/* ─── Sidebar ─── */
export function DocsSideNav({
  sections,
  activeSection,
}: {
  sections: DocSection[];
  activeSection: string;
}) {
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

      <aside
        className={cn(
          'fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-56 border-r border-border bg-background/95 backdrop-blur-sm transition-transform duration-300 z-40',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <nav className="p-4 space-y-0.5 overflow-y-auto h-full">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block px-3 py-1.5 rounded-md text-[13px] transition-colors',
                activeSection === s.id
                  ? 'text-foreground font-medium bg-muted'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s.title}
            </a>
          ))}

          <div className="pt-6 mt-6 border-t border-border">
            <Link
              href="/docs"
              className="block px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; All docs
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

/* ─── Page wrapper ─── */
export function DocsPageLayout({
  title,
  subtitle,
  sections,
  children,
}: {
  title: string;
  subtitle: string;
  sections: DocSection[];
  children: React.ReactNode;
}) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-background">
      <DocsSideNav sections={sections} activeSection={activeSection} />

      <main className="lg:pl-56">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
              {title}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              {subtitle}
            </p>
          </header>

          {/* Content */}
          <div className="space-y-14">{children}</div>

          {/* Footer — just a quiet back link */}
          <div className="mt-16 pt-8 border-t border-border">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Back to documentation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Reusable section heading ─── */
export function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-xl font-semibold text-foreground mb-4 scroll-mt-8">
      {children}
    </h2>
  );
}

/* ─── Prose block for body text ─── */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
      {children}
    </div>
  );
}
