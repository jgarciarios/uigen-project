// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((modelId: string) => ({ _tag: "anthropic-model", modelId })),
}));

import { MockLanguageModel, getLanguageModel } from "@/lib/provider";
import { anthropic } from "@ai-sdk/anthropic";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// --- MockLanguageModel class properties ---

test("MockLanguageModel has the correct specification version", () => {
  const model = new MockLanguageModel("test-id");
  expect(model.specificationVersion).toBe("v1");
});

test("MockLanguageModel has provider set to 'mock'", () => {
  const model = new MockLanguageModel("test-id");
  expect(model.provider).toBe("mock");
});

test("MockLanguageModel stores the modelId passed to the constructor", () => {
  const model = new MockLanguageModel("my-custom-model");
  expect(model.modelId).toBe("my-custom-model");
});

test("MockLanguageModel has defaultObjectGenerationMode set to 'tool'", () => {
  const model = new MockLanguageModel("test-id");
  expect(model.defaultObjectGenerationMode).toBe("tool");
});

// --- doGenerate: initial request (toolMessageCount === 0) ---

test("doGenerate creates App.jsx on the first message (no tool history)", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(1);
  expect(result.toolCalls[0].toolName).toBe("str_replace_editor");

  const args = JSON.parse(result.toolCalls[0].args);
  expect(args.command).toBe("create");
  expect(args.path).toBe("/App.jsx");
});

test("doGenerate uses Counter component when prompt mentions nothing specific", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "make something" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  const args = JSON.parse(result.toolCalls[0].args);
  expect(args.file_text).toContain("Counter");
});

test("doGenerate creates ContactForm when prompt mentions 'form'", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "create a contact form" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  const args = JSON.parse(result.toolCalls[0].args);
  expect(args.file_text).toContain("ContactForm");
});

test("doGenerate creates Card component when prompt mentions 'card'", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "build a card" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  const args = JSON.parse(result.toolCalls[0].args);
  expect(args.file_text).toContain("Card");
});

// --- doGenerate: subsequent steps ---

test("doGenerate creates the component file when toolMessageCount is 1", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [
      { role: "user", content: [{ type: "text", text: "create a counter" }] },
      { role: "tool", content: [{ type: "tool-result", toolCallId: "x", toolName: "y", result: "ok" }] },
    ],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(1);
  const args = JSON.parse(result.toolCalls[0].args);
  expect(args.command).toBe("create");
  expect(args.path).toContain("Counter");
});

test("doGenerate enhances the component file when toolMessageCount is 2", async () => {
  const model = new MockLanguageModel("test");

  const toolMessages = [
    { role: "tool", content: [{ type: "tool-result", toolCallId: "a", toolName: "b", result: "" }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "c", toolName: "d", result: "" }] },
  ];

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [
      { role: "user", content: [{ type: "text", text: "create a counter" }] },
      ...toolMessages,
    ],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(1);
  const args = JSON.parse(result.toolCalls[0].args);
  expect(args.command).toBe("str_replace");
});

test("doGenerate returns a final text summary with no tool calls when toolMessageCount >= 3", async () => {
  const model = new MockLanguageModel("test");

  const toolMessages = Array.from({ length: 3 }, (_, i) => ({
    role: "tool",
    content: [{ type: "tool-result", toolCallId: `t${i}`, toolName: "x", result: "" }],
  }));

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [
      { role: "user", content: [{ type: "text", text: "create a counter" }] },
      ...toolMessages,
    ],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(0);
  expect(result.text.length).toBeGreaterThan(0);
  expect(result.finishReason).toBe("stop");
});

// --- doGenerate: response shape ---

test("doGenerate always returns usage statistics", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doGenerate({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.usage.promptTokens).toBeGreaterThan(0);
  expect(result.usage.completionTokens).toBeGreaterThan(0);
});

// --- doStream ---

test("doStream returns a ReadableStream", async () => {
  const model = new MockLanguageModel("test");

  const promise = model.doStream({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.stream).toBeInstanceOf(ReadableStream);
});

test("doStream emits a finish part", async () => {
  const model = new MockLanguageModel("test");

  const streamPromise = model.doStream({
    inputFormat: "messages",
    mode: { type: "regular", tools: undefined, toolChoice: undefined },
    prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
  } as any);

  await vi.runAllTimersAsync();
  const { stream } = await streamPromise;

  const parts: unknown[] = [];
  const reader = stream.getReader();

  const readAllPromise = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
  })();

  await vi.runAllTimersAsync();
  await readAllPromise;

  const finishPart = parts.find((p: any) => p.type === "finish");
  expect(finishPart).toBeDefined();
});

// --- getLanguageModel ---

test("getLanguageModel returns a MockLanguageModel when ANTHROPIC_API_KEY is not set", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  const model = getLanguageModel();
  expect(model).toBeInstanceOf(MockLanguageModel);
  vi.unstubAllEnvs();
});

test("getLanguageModel returns a MockLanguageModel when ANTHROPIC_API_KEY is whitespace only", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "   ");
  const model = getLanguageModel();
  expect(model).toBeInstanceOf(MockLanguageModel);
  vi.unstubAllEnvs();
});

test("getLanguageModel calls anthropic() with the configured model when API key is present", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
  getLanguageModel();
  expect(anthropic).toHaveBeenCalledWith("claude-haiku-4-5");
  vi.unstubAllEnvs();
});

test("getLanguageModel returns the value from anthropic() when API key is present", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
  (anthropic as ReturnType<typeof vi.fn>).mockReturnValue({ _tag: "real-model" });
  const model = getLanguageModel();
  expect(model).toEqual({ _tag: "real-model" });
  vi.unstubAllEnvs();
});
