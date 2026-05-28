"use client";

import {
  createUserWithEmailAndPassword,
  type AuthError,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
  message: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (input: {
    confirmPassword: string;
    email: string;
    name: string;
    password: string;
  }) => Promise<void>;
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
      return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/email-already-in-use":
      return "An account already exists for this email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "The email or password is not correct.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use a stronger password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment before trying again.";
    default:
      return `${fallback} (${error.code})`;
  }
}

function requiresEmailVerification(currentUser: User) {
  return currentUser.providerData.some((provider) => provider.providerId === "password")
    && !currentUser.emailVerified;
}

async function sendVerificationEmail(currentUser: User) {
  await sendEmailVerification(currentUser, {
    url: `${window.location.origin}/login`,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async (currentUser: User) => {
    setError(null);
    setMessage(null);

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

      await currentUser.reload();

      if (requiresEmailVerification(currentUser)) {
        setUser(null);
        setStatus("unauthenticated");
        setError("Please verify your email address before signing in.");
        await signOut(firebaseAuth);
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
    setMessage(null);

    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
      await loadProfile(result.user);
    } catch (error) {
      setStatus("unauthenticated");
      setError(getAuthErrorMessage(error, "Google sign-in was not completed."));
    }
  }, [loadProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    setError(null);
    setMessage(null);

    try {
      const result = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );
      await result.user.reload();

      if (!result.user.emailVerified) {
        await sendVerificationEmail(result.user);
        await signOut(firebaseAuth);
        setUser(null);
        setStatus("unauthenticated");
        setError(
          "Please verify your email address before signing in. We have sent a fresh verification email.",
        );
        return;
      }

      await loadProfile(result.user);
    } catch (error) {
      setStatus("unauthenticated");
      setError(getAuthErrorMessage(error, "Email sign-in was not completed."));
    }
  }, [loadProfile]);

  const signUpWithEmail = useCallback(
    async ({
      confirmPassword,
      email,
      name,
      password,
    }: {
      confirmPassword: string;
      email: string;
      name: string;
      password: string;
    }) => {
      setStatus("loading");
      setError(null);
      setMessage(null);

      if (password !== confirmPassword) {
        setStatus("unauthenticated");
        setError("Passwords do not match.");
        return;
      }

      if (password.length < 8) {
        setStatus("unauthenticated");
        setError("Use a password with at least 8 characters.");
        return;
      }

      try {
        const result = await createUserWithEmailAndPassword(
          firebaseAuth,
          email.trim(),
          password,
        );

        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }

        await sendVerificationEmail(result.user);
        await signOut(firebaseAuth);
        setUser(null);
        setStatus("unauthenticated");
        setMessage(
          "Account created. Check your inbox and verify your email before signing in.",
        );
      } catch (error) {
        setStatus("unauthenticated");
        setError(getAuthErrorMessage(error, "Account creation was not completed."));
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut(firebaseAuth);
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
    setMessage(null);
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
      message,
      signInWithEmail,
      signInWithGoogle,
      signUpWithEmail,
      logout,
      refreshProfile,
    }),
    [
      error,
      logout,
      message,
      refreshProfile,
      signInWithEmail,
      signInWithGoogle,
      signUpWithEmail,
      status,
      user,
    ],
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
