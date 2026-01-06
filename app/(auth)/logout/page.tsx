"use client";

import { useEffect } from "react";
import { useLogout } from "@/hooks/use-auth";

export default function LogoutPage() {
  const logoutMutation = useLogout();

  useEffect(() => {
    logoutMutation.mutate();
  }, []);

  return null;
}
