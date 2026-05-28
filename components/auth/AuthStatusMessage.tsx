"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AuthStatusMessage() {
  const { error, message } = useAuth();

  if (!error && !message) {
    return null;
  }

  if (message) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-facility-green/20 bg-facility-green/10 p-4 text-sm text-facility-green">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-facility-amber/20 bg-facility-amber/10 p-4 text-sm text-facility-amber">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{error}</p>
    </div>
  );
}
