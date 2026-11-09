// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AuthGate } from "./auth-gate";

const mock = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
  unsubscribe: vi.fn(), listener: null as null | ((event: AuthChangeEvent, session: Session | null) => void)
}));
vi.mock("@/lib/supabase/client", () => ({
  hasSupabaseConfig: () => true,
  createBrowserClient: () => ({ auth: { ...mock, onAuthStateChange: (listener: typeof mock.listener) => {
    mock.listener = listener;
    return { data: { subscription: { unsubscribe: mock.unsubscribe } } };
  } } })
}));
vi.mock("./brand-mark", () => ({ BrandMark: () => <span>Timbre Pro Audio</span> }));
beforeEach(() => {
  vi.clearAllMocks();
  mock.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mock.signInWithPassword.mockResolvedValue({ error: null });
  mock.resetPasswordForEmail.mockResolvedValue({ error: null });
  mock.updateUser.mockResolvedValue({ error: null });
});
afterEach(cleanup);

it("uses password sign-in and sends recovery to the app origin", async () => {
  render(<AuthGate><div>Workspace</div></AuthGate>);
  await screen.findByRole("button", { name: "Sign in" });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(mock.signInWithPassword).toHaveBeenCalledWith({ email: "cameron@timbrepa.com.au", password: "example-password" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Forgot password?" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  await waitFor(() => expect(mock.resetPasswordForEmail).toHaveBeenCalledWith("cameron@timbrepa.com.au", { redirectTo: window.location.origin }));
  expect(await screen.findByRole("status")).toBeTruthy();
});

it("keeps recovery ahead of the workspace and rejects mismatched passwords", async () => {
  render(<AuthGate><div>Workspace</div></AuthGate>);
  await screen.findByLabelText("Password");
  act(() => mock.listener?.("PASSWORD_RECOVERY", { user: { id: "test-user" } } as Session));
  expect(screen.queryByText("Workspace")).toBeNull();
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "different-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  expect(mock.updateUser).not.toHaveBeenCalled();
  expect(screen.getByRole("status").textContent).toContain("do not match");
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "new-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  await screen.findByText("Workspace");
  expect(mock.updateUser).toHaveBeenCalledWith({ password: "new-password" });
});

it("recovers from failed session loading instead of leaving a spinner", async () => {
  mock.getSession.mockRejectedValue(new Error("offline"));
  render(<AuthGate><div>Workspace</div></AuthGate>);
  expect((await screen.findByRole("status")).textContent).toContain("Unable to connect");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
});

it("re-enables recovery after network failure", async () => {
  mock.resetPasswordForEmail.mockRejectedValue(new Error("offline"));
  render(<AuthGate><div>Workspace</div></AuthGate>);
  fireEvent.click(await screen.findByRole("button", { name: "Forgot password?" }));
  expect((await screen.findByRole("status")).textContent).toContain("Unable to send");
  expect(screen.getByRole("button", { name: "Forgot password?" }).hasAttribute("disabled")).toBe(false);
});
