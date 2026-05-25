"use client";

import { Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const { signInWithGoogle, status } = useAuth();

  return (
    <Button
      className="w-full"
      disabled={status === "loading"}
      onClick={() => void signInWithGoogle()}
      type="button"
    >
      <Chrome className="h-4 w-4" />
      Continue with Google
    </Button>
  );
}
