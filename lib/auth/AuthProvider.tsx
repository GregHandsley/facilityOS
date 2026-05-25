"use client";

import {
  type AuthError,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { firebaseAuth, googleAuthProvider } from "@/lib/firebase/client";
import { getOrCreateUserProfile } from "@/lib/auth/user-profile";
import type { AppUser } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";
const PROFILE_LOAD_TIMEOUT_MS = 4000;

type AuthContextValue = {
  status: AuthStatus;
  user: AppUser | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function createFallbackProfile(currentUser: User): AppUser {
  return {
    id: currentUser.uid,
    name: currentUser.displayName ?? "FacilityOS user",
    email: currentUser.email ?? "",
    role: "staff",
    facilityId: "demo-facility",
    createdAt: new Date().toISOString(),
  };
}

function isAuthError(error: unknown): error is AuthError {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && typeof (error as { code: unknown }).code === "string";
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!isAuthError(error)) {
    return fallback;
  }

  switch (error.code) {
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled in Firebase Authentication.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment before trying again.";
    default:
      return `${fallback} (${error.code})`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (currentUser: User) => {
    setError(null);

    try {
      const profile = await Promise.race([
        getOrCreateUserProfile(currentUser),
        new Promise<AppUser>((resolve) => {
          window.setTimeout(() => {
            resolve(createFallbackProfile(currentUser));
          }, PROFILE_LOAD_TIMEOUT_MS);
        }),
      ]);
      setUser(profile);
      setStatus("authenticated");
    } catch {
      setUser(createFallbackProfile(currentUser));
      setStatus("authenticated");
      setError(
        "You are signed in with a temporary staff profile because your FacilityOS profile could not be loaded yet.",
      );
    }
  }, []);

  useEffect(() => {
    const loadingFallback = window.setTimeout(() => {
      if (!firebaseAuth.currentUser) {
        setUser(null);
        setStatus("unauthenticated");
      }
    }, 2500);

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      window.clearTimeout(loadingFallback);
      setStatus("loading");

      if (!currentUser) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      await loadProfile(currentUser);
    });

    return () => {
      window.clearTimeout(loadingFallback);
      unsubscribe();
    };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
      await loadProfile(result.user);
    } catch (error) {
      setStatus("unauthenticated");
      setError(getAuthErrorMessage(error, "Google sign-in was not completed."));
    }
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth);
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!firebaseAuth.currentUser) {
      return;
    }

    await loadProfile(firebaseAuth.currentUser);
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      signInWithGoogle,
      logout,
      refreshProfile,
    }),
    [error, logout, refreshProfile, signInWithGoogle, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
