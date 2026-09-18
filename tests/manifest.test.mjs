import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const manifest=JSON.parse(await readFile(new URL("../dist/manifest.json",import.meta.url),"utf8"));
test("uses Manifest V3",()=>assert.equal(manifest.manifest_version,3));
test("requests page access for inspection",()=>assert.ok(manifest.host_permissions.includes("<all_urls>")));
test("content script runs on normal web pages",()=>assert.ok(manifest.content_scripts[0].matches.includes("<all_urls>")));
