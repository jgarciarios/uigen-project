// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import type { VirtualFileSystem } from "@/lib/file-system";

const mockFileSystem = {
  rename: vi.fn(),
  deleteFile: vi.fn(),
} as unknown as VirtualFileSystem;

beforeEach(() => {
  vi.clearAllMocks();
});

// --- rename ---

test("rename returns success message when rename succeeds", async () => {
  (mockFileSystem.rename as ReturnType<typeof vi.fn>).mockReturnValue(true);

  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({
    command: "rename",
    path: "/src/old.js",
    new_path: "/src/new.js",
  });

  expect(result).toEqual({
    success: true,
    message: "Successfully renamed /src/old.js to /src/new.js",
  });
  expect(mockFileSystem.rename).toHaveBeenCalledWith("/src/old.js", "/src/new.js");
});

test("rename returns error when the underlying rename fails", async () => {
  (mockFileSystem.rename as ReturnType<typeof vi.fn>).mockReturnValue(false);

  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({
    command: "rename",
    path: "/src/old.js",
    new_path: "/src/new.js",
  });

  expect(result).toEqual({
    success: false,
    error: "Failed to rename /src/old.js to /src/new.js",
  });
});

test("rename returns error when new_path is not provided", async () => {
  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({
    command: "rename",
    path: "/src/old.js",
    new_path: undefined,
  });

  expect(result).toEqual({
    success: false,
    error: "new_path is required for rename command",
  });
  expect(mockFileSystem.rename).not.toHaveBeenCalled();
});

test("rename can move a file to a different directory", async () => {
  (mockFileSystem.rename as ReturnType<typeof vi.fn>).mockReturnValue(true);

  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({
    command: "rename",
    path: "/Button.jsx",
    new_path: "/components/Button.jsx",
  });

  expect(result).toMatchObject({ success: true });
  expect(mockFileSystem.rename).toHaveBeenCalledWith(
    "/Button.jsx",
    "/components/Button.jsx"
  );
});

// --- delete ---

test("delete returns success message when deletion succeeds", async () => {
  (mockFileSystem.deleteFile as ReturnType<typeof vi.fn>).mockReturnValue(true);

  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({ command: "delete", path: "/unused.js" });

  expect(result).toEqual({
    success: true,
    message: "Successfully deleted /unused.js",
  });
  expect(mockFileSystem.deleteFile).toHaveBeenCalledWith("/unused.js");
});

test("delete returns error when the file does not exist", async () => {
  (mockFileSystem.deleteFile as ReturnType<typeof vi.fn>).mockReturnValue(false);

  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({
    command: "delete",
    path: "/missing.js",
  });

  expect(result).toEqual({
    success: false,
    error: "Failed to delete /missing.js",
  });
});

test("delete path is passed through exactly as given", async () => {
  (mockFileSystem.deleteFile as ReturnType<typeof vi.fn>).mockReturnValue(true);

  const tool = buildFileManagerTool(mockFileSystem);
  await tool.execute!({ command: "delete", path: "/components/Button/index.tsx" });

  expect(mockFileSystem.deleteFile).toHaveBeenCalledWith(
    "/components/Button/index.tsx"
  );
});

// --- invalid command ---

test("returns an error for an unrecognised command", async () => {
  const tool = buildFileManagerTool(mockFileSystem);
  const result = await tool.execute!({
    command: "copy" as "rename",
    path: "/file.js",
  });

  expect(result).toEqual({ success: false, error: "Invalid command" });
});
