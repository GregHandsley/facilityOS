import { Suspense } from "react";
import { Dumbbell, ShieldCheck } from "lucide-react";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import { AuthStatusMessage } from "@/components/auth/AuthStatusMessage";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { AppShell } from "@/components/layout/AppShell";

export default function LoginPage() {
  return (
    <AppShell>
      <section className="grid min-h-[70vh] place-items-center py-10">
        <PremiumCard className="w-full max-w-xl">
          <Suspense fallback={null}>
            <AuthRedirect />
          </Suspense>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Dumbbell className="h-7 w-7" />
          </div>
          <p className="mt-8 text-sm font-medium text-facility-green">
            FacilityOS access
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal">
            Sign in to your facility workspace.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Sign in with email and password, or use Google as an alternative.
            New email accounts must be verified before they can access FacilityOS.
          </p>

          <EmailPasswordForm />

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-6">
            <GoogleSignInButton />
          </div>
          <AuthStatusMessage />
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 shrink-0 text-facility-ice" />
            RBAC controls are applied before protected workspaces render.
          </div>
        </PremiumCard>
      </section>
    </AppShell>
  );
}
