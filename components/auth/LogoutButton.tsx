"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <Button onClick={() => void logout()} size="sm" type="button" variant="secondary">
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
