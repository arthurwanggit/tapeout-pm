const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

let html = read("index.html");
const css = read("styles.css");
html = html.replace(
  '<link rel="stylesheet" href="styles.css">',
  "<style>\n" + css + "\n</style>"
);

const scripts = [
  "js/rng.js",
  "js/content/teams.js",
  "js/content/projects.js",
  "js/content/events.js",
  "js/content/waivers.js",
  "js/content/endings.js",
  "js/engine.js",
  "js/platform.js",
  "js/ui.js"
];

scripts.forEach((rel) => {
  const code = read(rel).replace(/<\/script>/gi, "<\\/script>");
  html = html.replace(
    '<script src="' + rel + '"></script>',
    "<script>\n" + code + "\n</script>"
  );
});

fs.mkdirSync(DIST, { recursive: true });
const out = path.join(DIST, "index.html");
fs.writeFileSync(out, html, "utf8");

const bytes = Buffer.byteLength(html, "utf8");
console.log("built " + out);
console.log("size: " + (bytes / 1024).toFixed(1) + " KB");
console.log("external tags left: " + (html.match(/<script src=|<link rel="stylesheet"/g) || []).length);
