import { test, expect } from "vitest";
import { cn } from "@/lib/utils";

test("returns empty string when called with no arguments", () => {
  expect(cn()).toBe("");
});

test("returns a single class name unchanged", () => {
  expect(cn("foo")).toBe("foo");
});

test("joins multiple class names with spaces", () => {
  expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
});

test("ignores falsy conditional classes", () => {
  expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  expect(cn("foo", 0 && "bar")).toBe("foo");
});

test("includes truthy conditional classes", () => {
  const isActive = true;
  expect(cn("base", isActive && "active")).toBe("base active");
});

test("supports object syntax — includes keys where value is truthy", () => {
  expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
});

test("supports array syntax", () => {
  expect(cn(["foo", "bar"])).toBe("foo bar");
});

test("resolves conflicting Tailwind classes — last one wins", () => {
  expect(cn("p-4", "p-2")).toBe("p-2");
  expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  expect(cn("mt-2", "mt-4")).toBe("mt-4");
});

test("does not resolve non-conflicting Tailwind classes", () => {
  const result = cn("p-4", "m-2");
  expect(result).toContain("p-4");
  expect(result).toContain("m-2");
});

test("handles mixed inputs — strings, objects, and arrays together", () => {
  const result = cn("base", { active: true, disabled: false }, ["extra"]);
  expect(result).toContain("base");
  expect(result).toContain("active");
  expect(result).toContain("extra");
  expect(result).not.toContain("disabled");
});

test("trims and deduplicates redundant classes via twMerge", () => {
  expect(cn("flex", "flex")).toBe("flex");
});
