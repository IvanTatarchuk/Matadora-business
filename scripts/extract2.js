// Reify-free installer v2: reads package-lock.json, packs each pinned package
// via `npm pack`, and extracts to its exact node_modules path. Logs progress
// to scripts/extract.log after every package so it can be monitored for hangs.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.cwd();
const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));
const tmpPkgs = path.join(root, ".tmp_pkgs");
const logFile = path.join(root, "scripts", "extract.log");
fs.mkdirSync(tmpPkgs, { recursive: true });
fs.writeFileSync(logFile, "");

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";

function log(msg) {
  fs.appendFileSync(logFile, msg + "\n");
}
function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
function nameFromPath(p) {
  const tail = p.slice(p.lastIndexOf("node_modules/") + "node_modules/".length);
  const parts = tail.split("/");
  return parts[0].startsWith("@") ? parts[0] + "/" + parts[1] : parts[0];
}
function tarballName(name, version) {
  return name.replace(/^@/, "").replace(/\//g, "-") + "-" + version + ".tgz";
}

const entries = Object.entries(lock.packages || {})
  .filter(([k, v]) => k.startsWith("node_modules/") && v.version && !v.link)
  .map(([k, v]) => ({ destRel: k, version: v.version, name: nameFromPath(k) }))
  .filter((e) => e.name && e.name.trim() !== "");

log(`Total packages: ${entries.length}`);

let done = 0, failed = 0;
for (const e of entries) {
  const tb = tarballName(e.name, e.version);
  const tbPath = path.join(tmpPkgs, tb);
  try {
    if (!fs.existsSync(tbPath)) {
      execFileSync(npmCli, ["pack", `${e.name}@${e.version}`, "--prefer-offline",
        "--no-audit", "--no-fund", "--pack-destination", tmpPkgs,
        "--fetch-timeout=900000", "--fetch-retries=5"],
        { stdio: "ignore", timeout: 600000, shell: true });
    }
    if (!fs.existsSync(tbPath)) {
      failed++; log(`MISSING TARBALL ${e.name}@${e.version} (expected ${tb})`); continue;
    }
    const dest = path.join(root, e.destRel.split("/").join(path.sep));
    rmrf(dest);
    fs.mkdirSync(dest, { recursive: true });
    execFileSync("tar", ["-xzf", tbPath, "-C", dest, "--strip-components=1"],
      { stdio: "ignore", timeout: 600000 });
    done++;
    log(`[${done + failed}/${entries.length}] OK ${e.name}@${e.version} -> ${e.destRel}`);
  } catch (err) {
    failed++;
    log(`[${done + failed}/${entries.length}] FAIL ${e.name}@${e.version}: ${String(err.message).split("\n")[0]}`);
  }
}
log(`\nDONE. extracted=${done} failed=${failed} total=${entries.length}`);
