import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NavbarClient } from "./navbar-client";
import { Workflow, Github } from "lucide-react";

export async function Navbar() {
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Workflow className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl">Typeflow</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <a 
            href="https://github.com/HenryBuilds/typeflow" 
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
          <NavbarClient isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </nav>
  );
}

