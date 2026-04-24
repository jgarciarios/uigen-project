import { test, expect, beforeEach } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "@/lib/anon-work-tracker";

const STORAGE_KEY = "uigen_has_anon_work";
const DATA_KEY = "uigen_anon_data";

beforeEach(() => {
  sessionStorage.clear();
});

// --- setHasAnonWork ---

test("setHasAnonWork sets flag when messages array is non-empty", () => {
  setHasAnonWork([{ id: "1", content: "hello" }], {});
  expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
});

test("setHasAnonWork sets flag when fileSystemData has more than just root", () => {
  setHasAnonWork([], { "/": {}, "/App.jsx": "content" });
  expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
});

test("setHasAnonWork stores serialised messages and file system data", () => {
  const messages = [{ id: "1", role: "user", content: "hello" }];
  const fsData = { "/": {}, "/App.jsx": "export default function App() {}" };

  setHasAnonWork(messages, fsData);

  const stored = JSON.parse(sessionStorage.getItem(DATA_KEY)!);
  expect(stored.messages).toEqual(messages);
  expect(stored.fileSystemData).toEqual(fsData);
});

test("setHasAnonWork does not set flag when messages are empty and only root exists", () => {
  setHasAnonWork([], { "/": {} });
  expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
});

test("setHasAnonWork does not set flag for empty messages and empty fileSystemData", () => {
  setHasAnonWork([], {});
  expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
});

test("setHasAnonWork overwrites a previously stored value", () => {
  setHasAnonWork([{ id: "1" }], {});
  const newMessages = [{ id: "2", content: "updated" }];
  setHasAnonWork(newMessages, { "/": {}, "/index.js": "" });

  const stored = JSON.parse(sessionStorage.getItem(DATA_KEY)!);
  expect(stored.messages).toEqual(newMessages);
});

// --- getHasAnonWork ---

test("getHasAnonWork returns true when flag is set to 'true'", () => {
  sessionStorage.setItem(STORAGE_KEY, "true");
  expect(getHasAnonWork()).toBe(true);
});

test("getHasAnonWork returns false when flag is absent", () => {
  expect(getHasAnonWork()).toBe(false);
});

test("getHasAnonWork returns false for any non-'true' string value", () => {
  sessionStorage.setItem(STORAGE_KEY, "yes");
  expect(getHasAnonWork()).toBe(false);

  sessionStorage.setItem(STORAGE_KEY, "1");
  expect(getHasAnonWork()).toBe(false);
});

// --- getAnonWorkData ---

test("getAnonWorkData returns parsed data when storage is populated", () => {
  const payload = {
    messages: [{ id: "1", content: "hi" }],
    fileSystemData: { "/App.jsx": "code" },
  };
  sessionStorage.setItem(DATA_KEY, JSON.stringify(payload));

  expect(getAnonWorkData()).toEqual(payload);
});

test("getAnonWorkData returns null when storage key is absent", () => {
  expect(getAnonWorkData()).toBeNull();
});

test("getAnonWorkData returns null for corrupted JSON", () => {
  sessionStorage.setItem(DATA_KEY, "{ broken json ]");
  expect(getAnonWorkData()).toBeNull();
});

test("getAnonWorkData round-trips data written by setHasAnonWork", () => {
  const messages = [{ id: "a", role: "user", content: "create a button" }];
  const fsData = { "/": {}, "/Button.jsx": "export default function Button() {}" };

  setHasAnonWork(messages, fsData);

  const result = getAnonWorkData();
  expect(result?.messages).toEqual(messages);
  expect(result?.fileSystemData).toEqual(fsData);
});

// --- clearAnonWork ---

test("clearAnonWork removes both storage keys", () => {
  sessionStorage.setItem(STORAGE_KEY, "true");
  sessionStorage.setItem(DATA_KEY, "{}");

  clearAnonWork();

  expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(sessionStorage.getItem(DATA_KEY)).toBeNull();
});

test("clearAnonWork is a no-op when nothing is stored", () => {
  expect(() => clearAnonWork()).not.toThrow();
});

test("getHasAnonWork returns false after clearAnonWork", () => {
  setHasAnonWork([{ id: "1" }], {});
  clearAnonWork();
  expect(getHasAnonWork()).toBe(false);
});

test("getAnonWorkData returns null after clearAnonWork", () => {
  setHasAnonWork([{ id: "1" }], {});
  clearAnonWork();
  expect(getAnonWorkData()).toBeNull();
});
