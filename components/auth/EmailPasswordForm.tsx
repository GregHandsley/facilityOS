"use client";

import React from "react";
import { type FormEvent, useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";

type AuthMode = "signin" | "signup";

export function EmailPasswordForm() {
  const { signInWithEmail, signUpWithEmail, status } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isLoading = status === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "signup") {
      await signUpWithEmail({
        confirmPassword,
        email,
        name,
        password,
      });
      return;
    }

    await signInWithEmail(email, password);
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
        <button
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "signin" ? "bg-white/[0.1] text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setMode("signin")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "signup" ? "bg-white/[0.1] text-foreground" : "text-muted-foreground"
          }`}
          onClick={() => setMode("signup")}
          type="button"
        >
          Create account
        </button>
      </div>

      <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        {mode === "signup" ? (
          <TextField
            autoComplete="name"
            label="Name"
            onChange={setName}
            placeholder="Your name"
            required
            value={name}
          />
        ) : null}

        <TextField
          autoComplete="email"
          label="Email"
          onChange={setEmail}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />

        <TextField
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          label="Password"
          onChange={setPassword}
          placeholder="At least 8 characters"
          required
          type="password"
          value={password}
        />

        {mode === "signup" ? (
          <TextField
            autoComplete="new-password"
            label="Confirm password"
            onChange={setConfirmPassword}
            placeholder="Repeat your password"
            required
            type="password"
            value={confirmPassword}
          />
        ) : null}

        <Button className="w-full" disabled={isLoading} type="submit">
          {mode === "signup" ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          {isLoading
            ? "Working"
            : mode === "signup"
              ? "Create account"
              : "Sign in with email"}
        </Button>
      </form>
    </div>
  );
}

function TextField({
  autoComplete,
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        autoComplete={autoComplete}
        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
