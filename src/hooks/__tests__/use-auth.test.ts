import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

// Typed helpers to avoid repeated casting
const mockSignIn = actions.signIn as ReturnType<typeof vi.fn>;
const mockSignUp = actions.signUp as ReturnType<typeof vi.fn>;
const mockGetAnonWorkData = anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>;
const mockClearAnonWork = anonTracker.clearAnonWork as ReturnType<typeof vi.fn>;
const mockGetProjects = getProjects as ReturnType<typeof vi.fn>;
const mockCreateProject = createProject as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Safe defaults: no anon work, no existing projects, project creation succeeds
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

afterEach(() => {
  cleanup();
});

// ─── Return shape ────────────────────────────────────────────────────────────

test("exposes signIn, signUp, and isLoading", () => {
  const { result } = renderHook(() => useAuth());

  expect(result.current.signIn).toBeTypeOf("function");
  expect(result.current.signUp).toBeTypeOf("function");
  expect(result.current.isLoading).toBe(false);
});

// ─── signIn: credentials ─────────────────────────────────────────────────────

test("signIn forwards the exact email and password to the server action", async () => {
  mockSignIn.mockResolvedValue({ success: false });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("user@example.com", "s3cr3t!"); });

  expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "s3cr3t!");
  expect(mockSignIn).toHaveBeenCalledTimes(1);
});

test("signIn returns the auth result from the server action", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => { returnValue = await result.current.signIn("a@b.com", "bad"); });

  expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
});

// ─── signIn: loading state ────────────────────────────────────────────────────

test("signIn sets isLoading to true while the request is in-flight", async () => {
  let resolveSignIn!: (v: unknown) => void;
  mockSignIn.mockImplementation(
    () => new Promise((resolve) => { resolveSignIn = resolve; })
  );

  const { result } = renderHook(() => useAuth());

  act(() => { result.current.signIn("a@b.com", "pass"); });
  expect(result.current.isLoading).toBe(true);

  await act(async () => { resolveSignIn({ success: false }); });
  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false after a failed auth", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Wrong password" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "wrong"); });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false after a successful auth", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false even when the action throws", async () => {
  mockSignIn.mockRejectedValue(new Error("Network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    try { await result.current.signIn("a@b.com", "pass"); } catch { /* expected */ }
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn resets isLoading to false even when post-auth navigation throws", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetProjects.mockRejectedValue(new Error("DB error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    try { await result.current.signIn("a@b.com", "pass"); } catch { /* expected */ }
  });

  expect(result.current.isLoading).toBe(false);
});

// ─── signIn: post-auth navigation ────────────────────────────────────────────

test("signIn navigates to the user's most recent project on success", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  expect(mockPush).toHaveBeenCalledWith("/proj-1");
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("signIn creates a fresh project and navigates when the user has no existing projects", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "brand-new" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/brand-new");
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("fresh project name starts with 'New Design #'", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "x" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  const calledWith = mockCreateProject.mock.calls[0][0];
  expect(calledWith.name).toMatch(/^New Design #\d+$/);
});

test("signIn does not navigate or call getProjects/createProject when auth fails", async () => {
  mockSignIn.mockResolvedValue({ success: false, error: "Wrong password" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "bad"); });

  expect(mockPush).not.toHaveBeenCalled();
  expect(mockGetProjects).not.toHaveBeenCalled();
  expect(mockCreateProject).not.toHaveBeenCalled();
});

// ─── signIn: anonymous work migration ────────────────────────────────────────

test("signIn migrates anonymous work into a new project on success", async () => {
  const anonData = {
    messages: [{ id: "1", role: "user", content: "create a button" }],
    fileSystemData: { "/": {}, "/App.jsx": "code" },
  };
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(anonData);
  mockCreateProject.mockResolvedValue({ id: "migrated-proj" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: anonData.messages,
      data: anonData.fileSystemData,
    })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/migrated-proj");
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("anon migration project name contains 'Design from'", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ id: "1" }],
    fileSystemData: {},
  });
  mockCreateProject.mockResolvedValue({ id: "x" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  const calledWith = mockCreateProject.mock.calls[0][0];
  expect(calledWith.name).toContain("Design from");
});

test("signIn skips anon migration and falls through to getProjects when messages array is empty", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: { "/App.jsx": "code" } });
  mockGetProjects.mockResolvedValue([{ id: "fallthrough-proj" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  // No project created from anon data; navigates to existing project
  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/fallthrough-proj");
});

test("signIn does not call getProjects when anon work with messages is present", async () => {
  mockSignIn.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ id: "1", content: "hello" }],
    fileSystemData: {},
  });
  mockCreateProject.mockResolvedValue({ id: "anon-proj" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "pass"); });

  expect(mockGetProjects).not.toHaveBeenCalled();
});

test("signIn does not clear anon work when auth fails", async () => {
  mockSignIn.mockResolvedValue({ success: false });
  mockGetAnonWorkData.mockReturnValue({ messages: [{ id: "1" }], fileSystemData: {} });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signIn("a@b.com", "bad"); });

  expect(mockClearAnonWork).not.toHaveBeenCalled();
});

// ─── signUp: credentials ──────────────────────────────────────────────────────

test("signUp forwards the exact email and password to the server action", async () => {
  mockSignUp.mockResolvedValue({ success: false });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("new@example.com", "password123"); });

  expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  expect(mockSignUp).toHaveBeenCalledTimes(1);
});

test("signUp returns the auth result from the server action", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

  const { result } = renderHook(() => useAuth());

  let returnValue: unknown;
  await act(async () => { returnValue = await result.current.signUp("taken@example.com", "pass"); });

  expect(returnValue).toEqual({ success: false, error: "Email already registered" });
});

// ─── signUp: loading state ────────────────────────────────────────────────────

test("signUp sets isLoading to true while the request is in-flight", async () => {
  let resolveSignUp!: (v: unknown) => void;
  mockSignUp.mockImplementation(
    () => new Promise((resolve) => { resolveSignUp = resolve; })
  );

  const { result } = renderHook(() => useAuth());

  act(() => { result.current.signUp("a@b.com", "pass"); });
  expect(result.current.isLoading).toBe(true);

  await act(async () => { resolveSignUp({ success: false }); });
  expect(result.current.isLoading).toBe(false);
});

test("signUp resets isLoading to false after a failed auth", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("a@b.com", "pass"); });

  expect(result.current.isLoading).toBe(false);
});

test("signUp resets isLoading to false after a successful auth", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("a@b.com", "pass"); });

  expect(result.current.isLoading).toBe(false);
});

test("signUp resets isLoading to false even when the action throws", async () => {
  mockSignUp.mockRejectedValue(new Error("Network error"));

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    try { await result.current.signUp("a@b.com", "pass"); } catch { /* expected */ }
  });

  expect(result.current.isLoading).toBe(false);
});

// ─── signUp: post-auth navigation ─────────────────────────────────────────────

test("signUp navigates to the user's most recent project on success", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "existing-proj" }, { id: "older-proj" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("new@example.com", "password"); });

  expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("signUp creates a fresh project and navigates when user has no existing projects", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "signup-new" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("a@b.com", "pass"); });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: [], data: {} })
  );
  expect(mockPush).toHaveBeenCalledWith("/signup-new");
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("signUp does not navigate or call getProjects/createProject when auth fails", async () => {
  mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("a@b.com", "pass"); });

  expect(mockPush).not.toHaveBeenCalled();
  expect(mockGetProjects).not.toHaveBeenCalled();
  expect(mockCreateProject).not.toHaveBeenCalled();
});

// ─── signUp: anonymous work migration ─────────────────────────────────────────

test("signUp migrates anonymous work into a new project on success", async () => {
  const anonData = {
    messages: [{ id: "1", role: "user", content: "build a form" }],
    fileSystemData: { "/": {}, "/Form.jsx": "code" },
  };
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(anonData);
  mockCreateProject.mockResolvedValue({ id: "signup-anon-proj" });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("new@example.com", "pass"); });

  expect(mockCreateProject).toHaveBeenCalledWith(
    expect.objectContaining({ messages: anonData.messages, data: anonData.fileSystemData })
  );
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/signup-anon-proj");
  expect(mockPush).toHaveBeenCalledTimes(1);
});

test("signUp does not clear anon work when auth fails", async () => {
  mockSignUp.mockResolvedValue({ success: false });
  mockGetAnonWorkData.mockReturnValue({ messages: [{ id: "1" }], fileSystemData: {} });

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("a@b.com", "bad"); });

  expect(mockClearAnonWork).not.toHaveBeenCalled();
});

test("signUp skips anon migration when messages array is empty and falls through to getProjects", async () => {
  mockSignUp.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: { "/App.jsx": "code" } });
  mockGetProjects.mockResolvedValue([{ id: "fallthrough" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => { await result.current.signUp("a@b.com", "pass"); });

  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/fallthrough");
});
