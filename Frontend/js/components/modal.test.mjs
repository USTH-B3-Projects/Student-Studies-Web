import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const jsRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(jsRoot, { recursive: true }).filter((file) => extname(file) === ".js");
const nativeDialogs = files.filter((file) => /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(readFileSync(join(jsRoot, file), "utf8")));

assert.deepEqual(nativeDialogs, []);
console.log("native dialog audit passed");
