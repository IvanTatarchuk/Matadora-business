// Reify-free installer: reads package-lock.json and extracts every package
// at its pinned version directly from the npm cache via `npm pack` + `tar`.
// This bypasses `npm install`'s reify step, which hangs on this Windows
// machine while extracting large packages / `resolve` symlink test fixtures.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.cwd();
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const tmpPkgs = path.join(root, ".tmp_pkgs");
const tmpExtract = path.join(root, ".tmp_extract");
fs.mkdirSync(tmpPkgs, { recursive: true });

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

// Collect target packages: every entry under node_modules/ that has a version.
const entries = Object.entries(lock.packages || {})
  .filter(([k, v]) => k.startsWith("node_modules/") && v.version && !v.link)
  .map(([k, v]) => ({ destRel: k, version: v.version, name: pkgNameFromPath(k) }));

function pkgNameFromPath(p) {
  // last "node_modules/<name>" segment; <name> may be scoped (@scope/pkg)
  const idx = p.lastIndexOf("node_modules/");
  const tail = p.slice(idx + "node_modules/".length);
  const parts = tail.split("/");
  return parts[0].startsWith("@") ? parts[0] + "/" + parts[1] : parts[0];
}

console.log(`Total packages to ensure: ${entries.length}`);

let packed = 0, extracted = 0, skipped = 0, failed = [];

// 1) Pack any tarballs not already in .tmp_pkgs (dedupe by name@version).
const wanted = new Map();
for (const e of entries) wanted.set(`${e.name}@${e.version}`, e);

for (const [spec, e] of wanted) {
  const safe = spec.replace(/[@/]/g, "_");
  // Skip if we already have a matching tarball for this spec.
  const existing = fs.readdirSync(tmpPkgs).find((f) => tarballMatches(f, e));
  if (existing) { skipped++; continue; }
  try {
    execFileSync(npmCli, ["pack", spec, "--prefer-offline", "--silent",
      "--no-audit", "--no-fund", "--pack-destination", tmpPkgs,
      "--fetch-timeout=900000", "--fetch-retries=5"],
      { stdio: ["ignore", "ignore", "inherit"] });
    packed++;
    if (packed % 20 === 0) console.log(`  packed ${packed} tarballs...`);
  } catch (err) {
    failed.push(`pack ${spec}: ${err.message.split("\n")[0]}`);
  }
}
console.log(`Packed ${packed} new tarballs (skipped ${skipped} already present).`);

// 2) Extract each entry to its exact path.
const tarballs = fs.readdirSync(tmpPkgs).filter((f) => f.endsWith(".tgz"));

for (const e of entries) {
  const tb = tarballs.find((f) => tarballMatches(f, e));
  if (!tb) { failed.push(`no tarball for ${e.name}@${e.version}`); continue; }
  const dest = path.join(root, e.destRel.split("/").join(path.sep));
  if (!e.name || e.name.trim() === "") { failed.push(`empty name for ${e.destRel}`); continue; }
  try {
    rmrf(dest);
    fs.mkdirSync(dest, { recursive: true });
    execFileSync("tar", ["-xzf", path.join(tmpPkgs, tb), "-C", dest, "--strip-components=1"],
      { stdio: ["ignore", "ignore", "inherit"] });
    extracted++;
    if (extracted % 25 === 0) console.log(`  extracted ${extracted}/${entries.length}...`);
  } catch (err) {
    failed.push(`extract ${e.name}@${e.version}: ${err.message.split("\n")[0]}`);
  }
}

rmrf(tmpExtract);

console.log(`\nExtracted ${extracted}/${entries.length} packages.`);
if (failed.length) {
  console.log(`\n${failed.length} issues:`);
  for (const f of failed.slice(0, 40)) console.log("  - " + f);
} else {
  console.log("All packages extracted successfully.");
}

// Tarball name matching: npm pack names files like
// "<name-with-slashes-as-dashes>-<version>.tgz", scope '@' stripped.
function tarballMatches(file, e) {
  if (!file.endsWith(".tgz")) return false;
  const base = file.slice(0, -4); // strip .tgz
  const suffix = "-" + e.version;
  if (!base.endsWith(suffix)) return false;
  const namePart = base.slice(0, -suffix.length);
  const expected = e.name.replace(/^@/, "").replace(/\//g, "-");
  return namePart === expected;
}
