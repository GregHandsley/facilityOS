import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";

const mockSignInWithEmail = vi.fn();
const mockSignUpWithEmail = vi.fn();

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
    status: "unauthenticated",
  }),
}));

describe("EmailPasswordForm", () => {
  beforeEach(() => {
    mockSignInWithEmail.mockReset();
    mockSignUpWithEmail.mockReset();
  });

  it("uses email sign-in as the default method", () => {
    render(<EmailPasswordForm />);

    expect(screen.getByRole("button", { name: "Sign in with email" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("collects confirmation password when creating an account", () => {
    render(<EmailPasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });
});
