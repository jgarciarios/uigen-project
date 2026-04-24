import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result",
  result: unknown = "ok"
) {
  return { toolName, toolCallId: "1", args, state, result } as any;
}

// str_replace_editor labels
test("shows 'Creating' for str_replace_editor create command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/src/components/Card.jsx" })} />);
  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/src/index.js" })} />);
  expect(screen.getByText("Editing index.js")).toBeDefined();
});

test("shows 'Reading' for str_replace_editor view command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("shows 'Reverting' for str_replace_editor undo_edit command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "undo_edit", path: "/src/App.jsx" })} />);
  expect(screen.getByText("Reverting App.jsx")).toBeDefined();
});

// file_manager labels
test("shows 'Renaming' for file_manager rename command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/src/Old.jsx", new_path: "/src/New.jsx" })} />);
  expect(screen.getByText("Renaming Old.jsx → New.jsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/src/Unused.jsx" })} />);
  expect(screen.getByText("Deleting Unused.jsx")).toBeDefined();
});

// unknown tool falls back to tool name
test("falls back to tool name for unknown tools", () => {
  render(<ToolInvocationBadge toolInvocation={makeInvocation("some_other_tool", {})} />);
  expect(screen.getByText("some_other_tool")).toBeDefined();
});

// loading vs done state
test("shows spinner when state is 'call'", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" }, "call", undefined)} />
  );
  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("shows green dot when state is 'result'", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/App.jsx" }, "result", "ok")} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(container.querySelector(".animate-spin")).toBeFalsy();
});
