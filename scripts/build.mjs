import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });

const srcJs = join(root, "src/xsp-mind.js");
const srcCss = join(root, "src/xsp-mind.css");
const srcThemes = join(root, "src/xsp-mind-themes.css");

copyFileSync(srcJs, join(dist, "xsp-mind.js"));
copyFileSync(srcCss, join(dist, "xsp-mind.css"));
copyFileSync(srcThemes, join(dist, "xsp-mind-themes.css"));
copyFileSync(join(root, "src/xsp-mind.d.ts"), join(dist, "xsp-mind.d.ts"));

await esbuild.build({
  entryPoints: [srcJs],
  outfile: join(dist, "xsp-mind.min.js"),
  minify: true,
  bundle: false,
  allowOverwrite: true
});

const esmBody = readFileSync(srcJs, "utf8")
  .replace(/^\(function \(global\) \{/, "")
  .replace(/\}\)\(typeof window !== "undefined" \? window : globalThis\);\s*$/, "");

writeFileSync(
  join(dist, "xsp-mind.esm.js"),
  `(function (global) {\n${esmBody}})(globalThis);\nexport default globalThis.XSPMindJS;\nexport const XSPMindJS = globalThis.XSPMindJS;\n`
);

const cjsBody = readFileSync(srcJs, "utf8").replace(
  /\}\)\(typeof window !== "undefined" \? window : globalThis\);/,
  "})(typeof globalThis !== 'undefined' ? globalThis : this);"
);

writeFileSync(
  join(dist, "xsp-mind.cjs.js"),
  cjsBody +
    "\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = globalThis.XSPMindJS;\n}\n"
);

console.log("Built dist/: xsp-mind.js, xsp-mind.min.js, xsp-mind.esm.js, xsp-mind.cjs.js, css, d.ts");
