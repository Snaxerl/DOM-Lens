import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = new URL("..", import.meta.url).pathname;
const out = join(root,"dom-lens-1.0.0-chrome.zip");
try { execFileSync("zip", ["-qr", out, "."], {cwd:join(root,"dist")}); }
catch { throw new Error("zip command is required to create the release archive"); }
const hash=createHash("sha256").update(readFileSync(out)).digest("hex");
writeFileSync(join(root,"SHA256SUMS.txt"),`${hash}  dom-lens-1.0.0-chrome.zip\n`);
console.log(`Created ${out}`);
