import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NavbarClient } from "./navbar-client";

export async function Navbar() {
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl">Typeflow</span>
          </Link>
        </div>

        <NavbarClient isAuthenticated={isAuthenticated} />
      </div>
    </nav>
  );
}

