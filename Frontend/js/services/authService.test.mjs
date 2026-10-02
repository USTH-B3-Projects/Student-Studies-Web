import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
globalThis.localStorage = new Proxy({}, { get: () => { throw new Error("auth must not use localStorage"); } });

let user = null;
globalThis.fetch = async (url, options = {}) => {
  if (url.endsWith("/auth/google")) {
    assert.deepEqual(JSON.parse(options.body), { idToken: "firebase-token" });
    user = { id: "student-1", username: "student@example.com", studentName: "Student", email: "student@example.com" };
    return response({ success: true });
  }
  if (url.endsWith("/auth/me") && options.method === "PATCH") {
    user = { ...user, ...JSON.parse(options.body) };
    return response({ user });
  }
  if (url.endsWith("/auth/me")) return user ? response({ user }) : response({ error: "Authentication required" }, false);
  throw new Error(`Unexpected request: ${options.method} ${url}`);
};

function response(body, ok = true) {
  return {
    ok,
    status: ok ? 200 : 401,
    statusText: ok ? "OK" : "Unauthorized",
    headers: { get: () => "application/json" },
    json: async () => body,
  };
}

const { getCurrentUser, loginWithGoogle, restoreSession, updateCurrentUser } = await import("./authService.js");

assert.equal(await restoreSession(), null);
await loginWithGoogle({ getIdToken: async () => "firebase-token" });
assert.deepEqual(getCurrentUser(), user);
assert.equal(await updateCurrentUser({ studentName: "  New Name  ", email: " new@example.com " }), true);
assert.equal(getCurrentUser().studentName, "New Name");
assert.equal(getCurrentUser().email, "new@example.com");
assert.equal(await updateCurrentUser({ studentName: " " }), false);
