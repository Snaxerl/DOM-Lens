import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const build = join(root, ".build");
rmSync(dist, {recursive:true, force:true});
rmSync(build, {recursive:true, force:true});
mkdirSync(dist, {recursive:true});
mkdirSync(build, {recursive:true});
cpSync(join(root,"public"), dist, {recursive:true});

const dependencyFiles = [
  "src/core/accessibility.ts",
  "src/core/selector.ts",
  "src/core/playwright.ts",
  "src/core/inspect.ts",
  "src/content/index.ts"
];
let bundle = dependencyFiles.map((file) => readFileSync(join(root,file),"utf8"))
  .join("\n\n")
  .replace(/^import .*?;\s*$/gm, "")
  .replace(/\bexport\s+(?=(interface|type|function|const|class)\b)/g, "");
const tempBundle = join(build,"content.bundle.ts");
writeFileSync(tempBundle,bundle);

const runTsc = (args) => execFileSync("tsc", args, {cwd:root, stdio:"inherit"});
runTsc(["src/chrome.d.ts",tempBundle,"--target","ES2022","--module","None","--lib","ES2022,DOM,DOM.Iterable","--skipLibCheck","--outFile",join(dist,"content.js")]);
runTsc(["src/popup/index.ts","src/background/index.ts","src/core/selector.ts","src/core/accessibility.ts","src/core/playwright.ts","src/chrome.d.ts","--target","ES2022","--module","ES2022","--lib","ES2022,DOM,DOM.Iterable","--skipLibCheck","--rootDir","src","--outDir",build]);
cpSync(join(build,"popup","index.js"), join(dist,"popup.js"));
cpSync(join(build,"background","index.js"), join(dist,"background.js"));
console.log("Built DOM Lens into dist/");
