"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Zap, 
  Code, 
  GitBranch, 
  Play, 
  Shield, 
  Boxes,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Terminal,
  Workflow,
  Github
} from "lucide-react";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const githubUrl = "https://github.com/HenryBuilds/typeflow";

export default function LandingPage() {
  const [activePreview, setActivePreview] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActivePreview((prev) => (prev + 1) % 5);
    }, 5000);
    
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "TypeScript Native",
      description: "Write workflow logic in TypeScript with full IntelliSense support and type safety."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Visual Debugging",
      description: "Set breakpoints, step through execution, and inspect data at every node."
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: "Version Control",
      description: "Export, import, and version your workflows with JSON-based portability."
    },
    {
      icon: <Boxes className="h-6 w-6" />,
      title: "npm Packages",
      description: "Use any npm package in your workflows - axios, zod, lodash, and more."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Credentials",
      description: "Store API keys and secrets with AES-256 encryption at rest."
    },
    {
      icon: <Play className="h-6 w-6" />,
      title: "Real-time Execution",
      description: "Watch your workflows execute with live logging and output visualization."
    }
  ];

  const previews = [
    { src: "/typesafe.png", alt: "Type-Safe Workflow Development" },
    { src: "/types.png", alt: "TypeScript Type Definitions" },
    { src: "/packages.png", alt: "NPM Package Management" },
    { src: "/overview.png", alt: "Workflow Editor Overview" },
    { src: "/debugging.png", alt: "Visual Debugging with Breakpoints" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated Background with Parallax */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[128px]" 
          style={{ 
            animation: 'pulse 8s ease-in-out infinite',
            transform: `translateY(${scrollY * 0.3}px)`
          }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-chart-2/15 rounded-full blur-[128px]" 
          style={{ 
            animation: 'pulse 10s ease-in-out infinite', 
            animationDelay: '3s',
            transform: `translateY(${scrollY * -0.2}px)`
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-chart-3/10 rounded-full blur-[100px]" 
          style={{ 
            animation: 'pulse 12s ease-in-out infinite', 
            animationDelay: '6s',
            transform: `translate(-50%, calc(-50% + ${scrollY * 0.15}px))`
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">TypeScript-native workflow automation</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
              <span className="text-foreground">
                Build Workflows
              </span>
              <br />
              <span className="text-primary">
                Like a Developer
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Visual workflow editor with TypeScript code nodes, npm package support, 
              and VS Code-style debugging. Automate anything with the power of Node.js.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isDemoMode ? (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-5 to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] rounded-full" />
                  <div className="relative flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition-all m-[2px]">
                    <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    View on GitHub
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              ) : (
                <Link
                  href="/organizations"
                  className="group relative overflow-hidden rounded-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-5 to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] rounded-full" />
                  <div className="relative flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold transition-all m-[2px]">
                    <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    Start Building
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )}
              <a
                href="#features"
                className="group flex items-center justify-center gap-1.5 bg-secondary/50 backdrop-blur-sm border border-primary/20 hover:border-primary/50 hover:bg-secondary px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:shadow-md hover:shadow-primary/10"
              >
                <Code className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
                Explore Features
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          {/* Preview Window */}
          <div className={`mt-20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative max-w-5xl mx-auto">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
              
              {/* Window Frame */}
              <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
                {/* Title Bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <div className="w-3 h-3 rounded-full bg-chart-4" />
                    <div className="w-3 h-3 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-muted-foreground">Typeflow — Workflow Editor</span>
                  </div>
                  <div className="w-14" />
                </div>

                {/* Preview Image */}
                <div className="relative aspect-[16/10] bg-muted">
                  {previews.map((preview, index) => (
                    <div
                      key={preview.src}
                      className={`absolute inset-0 transition-opacity duration-700 ${
                        index === activePreview ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <Image
                        src={preview.src}
                        alt={preview.alt}
                        fill
                        className={preview.src === '/typesafe.png' ? 'object-contain' : 'object-cover object-top'}
                        priority={index === 0}
                        quality={100}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>

                {/* Preview Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {previews.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActivePreview(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === activePreview 
                          ? 'bg-primary w-6' 
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for developers who want the power of code with the clarity of visual workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="relative z-10 py-32 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground">
                Write Real TypeScript
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                No more complex UI configurations. Write actual TypeScript code with full 
                IntelliSense, import npm packages, and leverage the entire Node.js ecosystem.
              </p>
              <ul className="space-y-4">
                {[
                  "Full TypeScript type checking",
                  "Import any npm package",
                  "Access previous node outputs with $json",
                  "Async/await support built-in"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Block */}
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-xl" />
              <div className="relative bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-chart-4/60" />
                    <div className="w-3 h-3 rounded-full bg-primary/60" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">code-node.ts</span>
                </div>
                <pre className="p-6 text-sm font-mono overflow-x-auto bg-background">
                  <code className="text-foreground/80">
                    <span className="text-chart-3">const</span>{" "}
                    <span className="text-chart-2">axios</span>{" "}
                    <span className="text-muted-foreground">=</span>{" "}
                    <span className="text-chart-4">require</span>
                    <span className="text-muted-foreground">(</span>
                    <span className="text-primary">&apos;axios&apos;</span>
                    <span className="text-muted-foreground">);</span>
                    {"\n\n"}
                    <span className="text-muted-foreground">// Fetch data from external API</span>
                    {"\n"}
                    <span className="text-chart-3">const</span>{" "}
                    <span className="text-chart-2">response</span>{" "}
                    <span className="text-muted-foreground">=</span>{" "}
                    <span className="text-chart-3">await</span>{" "}
                    <span className="text-chart-2">axios</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-chart-4">get</span>
                    <span className="text-muted-foreground">(</span>
                    {"\n"}
                    {"  "}
                    <span className="text-primary">&apos;https://api.example.com/data&apos;</span>
                    {"\n"}
                    <span className="text-muted-foreground">);</span>
                    {"\n\n"}
                    <span className="text-muted-foreground">// Transform and return</span>
                    {"\n"}
                    <span className="text-chart-3">return</span>{" "}
                    <span className="text-chart-2">response</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-chart-2">data</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-chart-4">map</span>
                    <span className="text-muted-foreground">(</span>
                    <span className="text-chart-4">item</span>{" "}
                    <span className="text-chart-3">=&gt;</span>{" "}
                    <span className="text-muted-foreground">{"({"}</span>
                    {"\n"}
                    {"  "}
                    <span className="text-chart-2">id</span>
                    <span className="text-muted-foreground">:</span>{" "}
                    <span className="text-chart-4">item</span>
                    <span className="text-muted-foreground">.</span>
                    <span className="text-chart-2">id</span>
                    <span className="text-muted-foreground">,</span>
                    {"\n"}
                    {"  "}
                    <span className="text-chart-2">processed</span>
                    <span className="text-muted-foreground">:</span>{" "}
                    <span className="text-chart-3">true</span>
                    {"\n"}
                    <span className="text-muted-foreground">{"}));"}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
            Ready to Automate?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
            Start building powerful workflows with TypeScript today. 
            It&apos;s free, open-source, and developer-first.
          </p>
          {isDemoMode ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full text-base font-semibold transition-all shadow-lg"
            >
              View on GitHub
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          ) : (
            <Link
              href="/organizations"
              className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full text-base font-semibold transition-all shadow-lg"
            >
              Get Started — It&apos;s Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Workflow className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              © 2026 Typeflow. Open Source under MIT License.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/HenryBuilds/typeflow" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
