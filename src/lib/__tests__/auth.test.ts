// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  cookies: new Map<string, { value: string; options: Record<string, unknown> }>(),
  get(name: string) {
    return this.cookies.get(name);
  },
  set(name: string, value: string, options: Record<string, unknown>) {
    this.cookies.set(name, { value, options });
  },
  delete(name: string) {
    this.cookies.delete(name);
  },
};

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  mockCookieStore.cookies.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("createSession sets an auth-token cookie", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "test@example.com");

  expect(mockCookieStore.cookies.has("auth-token")).toBe(true);
});

test("createSession stores a valid JWT with correct payload", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-42", "hello@example.com");

  const token = mockCookieStore.cookies.get("auth-token")!.value;
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

test("createSession sets cookie as httpOnly", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "test@example.com");

  const { options } = mockCookieStore.cookies.get("auth-token")!;
  expect(options.httpOnly).toBe(true);
});

test("createSession sets cookie sameSite to lax", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "test@example.com");

  const { options } = mockCookieStore.cookies.get("auth-token")!;
  expect(options.sameSite).toBe("lax");
});

test("createSession sets cookie expiry approximately 7 days from now", async () => {
  const before = Date.now();
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const { options } = mockCookieStore.cookies.get("auth-token")!;
  const expires = (options.expires as Date).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession sets cookie path to /", async () => {
  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "test@example.com");

  const { options } = mockCookieStore.cookies.get("auth-token")!;
  expect(options.path).toBe("/");
});

test("createSession sets secure flag in production", async () => {
  const original = process.env.NODE_ENV;
  vi.stubEnv("NODE_ENV", "production");

  const { createSession } = await import("@/lib/auth");
  await createSession("user-1", "test@example.com");

  const { options } = mockCookieStore.cookies.get("auth-token")!;
  expect(options.secure).toBe(true);

  vi.stubEnv("NODE_ENV", original);
});
