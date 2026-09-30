import assert from "node:assert/strict";

const stored = new Map();
globalThis.window = { location: { hostname: "localhost" } };
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
globalThis.fetch = async () => ({
  ok: true,
  headers: { get: () => "application/json" },
  json: async () => ({}),
});
const { getCurrentUser, loginWithGoogle, updateCurrentUser } = await import("./authService.js");

await loginWithGoogle({ uid: "uid-1", email: "student@example.com", displayName: "Student" });

assert.deepEqual(getCurrentUser(), {
  username: "student@example.com",
  studentName: "Student",
  email: "student@example.com",
});

await loginWithGoogle({ uid: "uid-2", email: null, displayName: null });
assert.deepEqual(getCurrentUser(), { username: "uid-2", studentName: "Student", email: "" });

assert.equal(updateCurrentUser({ studentName: "  New Name  ", email: " user@example.com " }), true);
assert.deepEqual(getCurrentUser(), { username: "uid-2", studentName: "New Name", email: "user@example.com" });
assert.equal(updateCurrentUser({ studentName: " " }), false);
