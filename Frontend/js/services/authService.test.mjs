import assert from "node:assert/strict";

const stored = new Map();
globalThis.window = { location: { hostname: "localhost" } };
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
const { getCurrentUser, loginWithGoogle } = await import("./authService.js");

loginWithGoogle({ uid: "uid-1", email: "student@example.com", displayName: "Student" });

assert.deepEqual(getCurrentUser(), {
  username: "student@example.com",
  studentName: "Student",
});

loginWithGoogle({ uid: "uid-2", email: null, displayName: null });
assert.deepEqual(getCurrentUser(), { username: "uid-2", studentName: "Student" });
