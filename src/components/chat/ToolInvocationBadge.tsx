"use client";

import { Loader2 } from "lucide-react";

interface StrReplaceArgs {
  command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
  path: string;
  new_path?: string;
}

interface FileManagerArgs {
  command: "rename" | "delete";
  path: string;
  new_path?: string;
}

interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  state: "partial-call" | "call" | "result";
  args: StrReplaceArgs | FileManagerArgs | Record<string, unknown>;
  result?: unknown;
}

function basename(path: string): string {
  return path.split("/").pop() || path;
}

function getLabel(toolName: string, args: ToolInvocation["args"]): string {
  if (toolName === "str_replace_editor") {
    const { command, path } = args as StrReplaceArgs;
    const file = basename(path);
    switch (command) {
      case "create":     return `Creating ${file}`;
      case "str_replace":
      case "insert":     return `Editing ${file}`;
      case "view":       return `Reading ${file}`;
      case "undo_edit":  return `Reverting ${file}`;
    }
  }

  if (toolName === "file_manager") {
    const { command, path, new_path } = args as FileManagerArgs;
    const file = basename(path);
    switch (command) {
      case "rename": return `Renaming ${file} → ${basename(new_path || "")}`;
      case "delete": return `Deleting ${file}`;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const { toolName, args, state, result } = toolInvocation;
  const label = getLabel(toolName, args);
  const isDone = state === "result" && result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
