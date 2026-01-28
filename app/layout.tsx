import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/lib/trpc-client";
import { ThemeProvider } from "./components/theme-provider";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Typeflow - Visual Workflow Automation for Developers",
  description: "Build powerful workflows with TypeScript code nodes, npm package support, and VS Code-style debugging. Automate anything with the power of Node.js.",
  keywords: ["workflow automation", "typescript", "visual editor", "node.js", "developer tools", "automation platform"],
  authors: [{ name: "HenryBuilds" }],
  openGraph: {
    title: "Typeflow - Visual Workflow Automation for Developers",
    description: "Build powerful workflows with TypeScript code nodes, npm package support, and VS Code-style debugging.",
    type: "website",
    url: "https://github.com/HenryBuilds/typeflow",
  },
  twitter: {
    card: "summary_large_image",
    title: "Typeflow - Visual Workflow Automation for Developers",
    description: "Build powerful workflows with TypeScript code nodes, npm package support, and VS Code-style debugging.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <Navbar />
            {children}
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
