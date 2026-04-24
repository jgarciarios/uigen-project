// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import type { VirtualFileSystem } from "@/lib/file-system";

const mockFileSystem = {
  viewFile: vi.fn(),
  createFileWithParents: vi.fn(),
  replaceInFile: vi.fn(),
  insertInFile: vi.fn(),
} as unknown as VirtualFileSystem;

beforeEach(() => {
  vi.clearAllMocks();
});

// --- shape ---

test("built tool has the expected id", () => {
  expect(buildStrReplaceTool(mockFileSystem).id).toBe("str_replace_editor");
});

// --- view ---

test("view delegates to fileSystem.viewFile", async () => {
  (mockFileSystem.viewFile as ReturnType<typeof vi.fn>).mockReturnValue("file contents");

  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({ command: "view", path: "/App.jsx" });

  expect(mockFileSystem.viewFile).toHaveBeenCalledWith("/App.jsx", undefined);
  expect(result).toBe("file contents");
});

test("view passes view_range to fileSystem.viewFile when provided", async () => {
  (mockFileSystem.viewFile as ReturnType<typeof vi.fn>).mockReturnValue("lines 1-10");

  const tool = buildStrReplaceTool(mockFileSystem);
  await tool.execute!({ command: "view", path: "/App.jsx", view_range: [1, 10] });

  expect(mockFileSystem.viewFile).toHaveBeenCalledWith("/App.jsx", [1, 10]);
});

test("view returns whatever fileSystem.viewFile returns", async () => {
  (mockFileSystem.viewFile as ReturnType<typeof vi.fn>).mockReturnValue("Error: file not found");

  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({ command: "view", path: "/missing.jsx" });

  expect(result).toBe("Error: file not found");
});

// --- create ---

test("create delegates to fileSystem.createFileWithParents", async () => {
  (mockFileSystem.createFileWithParents as ReturnType<typeof vi.fn>).mockReturnValue(
    "File created successfully"
  );

  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({
    command: "create",
    path: "/components/Button.jsx",
    file_text: "export default function Button() { return <button />; }",
  });

  expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith(
    "/components/Button.jsx",
    "export default function Button() { return <button />; }"
  );
  expect(result).toBe("File created successfully");
});

test("create uses empty string when file_text is omitted", async () => {
  (mockFileSystem.createFileWithParents as ReturnType<typeof vi.fn>).mockReturnValue("ok");

  const tool = buildStrReplaceTool(mockFileSystem);
  await tool.execute!({ command: "create", path: "/empty.js" });

  expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith("/empty.js", "");
});

// --- str_replace ---

test("str_replace delegates to fileSystem.replaceInFile with old_str and new_str", async () => {
  (mockFileSystem.replaceInFile as ReturnType<typeof vi.fn>).mockReturnValue(
    "Replaced successfully"
  );

  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({
    command: "str_replace",
    path: "/App.jsx",
    old_str: "const x = 1;",
    new_str: "const x = 2;",
  });

  expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith(
    "/App.jsx",
    "const x = 1;",
    "const x = 2;"
  );
  expect(result).toBe("Replaced successfully");
});

test("str_replace defaults old_str and new_str to empty strings when omitted", async () => {
  (mockFileSystem.replaceInFile as ReturnType<typeof vi.fn>).mockReturnValue("ok");

  const tool = buildStrReplaceTool(mockFileSystem);
  await tool.execute!({ command: "str_replace", path: "/App.jsx" });

  expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith("/App.jsx", "", "");
});

test("str_replace returns the error message from fileSystem on failure", async () => {
  (mockFileSystem.replaceInFile as ReturnType<typeof vi.fn>).mockReturnValue(
    "Error: old_str not found in file"
  );

  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({
    command: "str_replace",
    path: "/App.jsx",
    old_str: "nonexistent",
    new_str: "replacement",
  });

  expect(result).toBe("Error: old_str not found in file");
});

// --- insert ---

test("insert delegates to fileSystem.insertInFile", async () => {
  (mockFileSystem.insertInFile as ReturnType<typeof vi.fn>).mockReturnValue(
    "Inserted successfully"
  );

  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({
    command: "insert",
    path: "/App.jsx",
    insert_line: 5,
    new_str: "import React from 'react';",
  });

  expect(mockFileSystem.insertInFile).toHaveBeenCalledWith(
    "/App.jsx",
    5,
    "import React from 'react';"
  );
  expect(result).toBe("Inserted successfully");
});

test("insert defaults insert_line to 0 and new_str to empty string when omitted", async () => {
  (mockFileSystem.insertInFile as ReturnType<typeof vi.fn>).mockReturnValue("ok");

  const tool = buildStrReplaceTool(mockFileSystem);
  await tool.execute!({ command: "insert", path: "/App.jsx" });

  expect(mockFileSystem.insertInFile).toHaveBeenCalledWith("/App.jsx", 0, "");
});

// --- undo_edit ---

test("undo_edit returns an error message without touching the file system", async () => {
  const tool = buildStrReplaceTool(mockFileSystem);
  const result = await tool.execute!({ command: "undo_edit", path: "/App.jsx" });

  expect(typeof result).toBe("string");
  expect((result as string).toLowerCase()).toContain("error");
  expect(mockFileSystem.viewFile).not.toHaveBeenCalled();
  expect(mockFileSystem.createFileWithParents).not.toHaveBeenCalled();
  expect(mockFileSystem.replaceInFile).not.toHaveBeenCalled();
  expect(mockFileSystem.insertInFile).not.toHaveBeenCalled();
});
