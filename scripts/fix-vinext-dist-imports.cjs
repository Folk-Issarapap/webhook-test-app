"use strict";

const fs = require("node:fs");
const path = require("node:path");

const serverDir = path.join(process.cwd(), "dist", "server");
const patches = [
	{ file: path.join(serverDir, "index.mjs"), from: "./ssr/index.js", to: "./ssr/index.mjs" },
	{ file: path.join(serverDir, "ssr", "index.mjs"), from: "../index.js", to: "../index.mjs" },
];

for (const { file, from, to } of patches) {
	if (!fs.existsSync(file)) {
		console.warn(`[fix-vinext-dist] skip missing ${path.relative(process.cwd(), file)}`);
		continue;
	}
	const src = fs.readFileSync(file, "utf8");
	if (!src.includes(from)) {
		console.warn(`[fix-vinext-dist] skip ${path.relative(process.cwd(), file)}: "${from}" not found`);
		continue;
	}
	fs.writeFileSync(file, src.split(from).join(to));
	console.log(`[fix-vinext-dist] patched ${path.relative(process.cwd(), file)}`);
}
