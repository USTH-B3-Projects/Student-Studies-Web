import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const api = await import("./apiClient.js");
const courses = await import("./courseService.js");
const tasks = await import("./taskService.js");
const auth = await import("./authService.js");
let status = 200;
let contentType = "application/json";
globalThis.fetch = async (url, options) => {
  assert.ok(url.startsWith("http://localhost:5000/api/v1/"));
  assert.equal(options.credentials, "include");
  if (options.body) assert.deepEqual(JSON.parse(options.body), { value: 1 });
  return {
    ok: status < 400,
    status,
    statusText: "Server error",
    headers: { get: () => contentType },
    json: async () =>
      status >= 400 ? { error: "Request failed" } : { value: 1 },
  };
};
for (const method of ["get", "post", "put", "patch", "del"]) {
  assert.deepEqual(await api[method]("/test", { value: 1 }), { value: 1 });
}
status = 204;
contentType = null;
assert.equal(await api.del("/test"), null);
contentType = "application/json";
status = 404;
assert.equal(await courses.getCourseById("missing"), null);
assert.equal(await tasks.getTaskById("missing"), null);
status = 500;
for (const lookup of [
  () => courses.getCourseById("id"),
  () => tasks.getTaskById("id"),
  auth.restoreSession,
]) {
  await assert.rejects(lookup, { status: 500, message: "Request failed" });
}
status = 401;
assert.equal(await auth.restoreSession(), null);
