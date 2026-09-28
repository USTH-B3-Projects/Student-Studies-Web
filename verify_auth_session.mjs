import fs from "node:fs/promises";

const values = new Map([
  ["studyflow_current_user", JSON.stringify({ username: "account-a" })],
]);
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
globalThis.apiClient = { post: () => { throw new Error("login API was called"); } };

const source = (await fs.readFile("Frontend/js/services/authService.js", "utf8"))
  .replace('import * as apiClient from "./storageService.js";', "const apiClient = globalThis.apiClient;");
const auth = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const result = await auth.login("account-b", "password");

console.assert(!result.success, "a second login must be rejected");
console.assert(auth.getCurrentUser().username === "account-a", "the active account must not change");
auth.logout();
console.assert(auth.getCurrentUser() === null, "logout must clear the session");
console.log("Authentication session check passed");
