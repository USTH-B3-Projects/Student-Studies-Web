import assert from "node:assert/strict";

globalThis.window = { location: { hostname: "localhost" } };
const { setProfileMenuOpen } = await import("./shell.js");

const attributes = new Map();
const button = { setAttribute: (name, value) => attributes.set(name, value) };
const dropdown = { hidden: true };

setProfileMenuOpen(button, dropdown, true);
assert.equal(attributes.get("aria-expanded"), "true");
assert.equal(dropdown.hidden, false);

setProfileMenuOpen(button, dropdown, false);
assert.equal(attributes.get("aria-expanded"), "false");
assert.equal(dropdown.hidden, true);

console.log("profile menu state checks passed");
