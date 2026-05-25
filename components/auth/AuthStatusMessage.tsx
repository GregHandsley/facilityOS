"use client";

import { AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AuthStatusMessage() {
  const { error } = useAuth();

  if (!error) {
    return null;
  }

  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-facility-amber/20 bg-facility-amber/10 p-4 text-sm text-facility-amber">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{error}</p>
    </div>
  );
}
