// Installs an explicit list of packages (name@version -> node_modules dest),
// force re-extracting to repair incomplete folders and fill lockfile gaps.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.cwd();
const tmpPkgs = path.join(root, ".tmp_pkgs");
const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
fs.mkdirSync(tmpPkgs, { recursive: true });

// [name, version, destRelative]
const list = [
  ["@supabase/ssr", "0.10.3", "node_modules/@supabase/ssr"],
  ["cookie", "1.0.2", "node_modules/@supabase/ssr/node_modules/cookie"],
];

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
function tarballName(name, version) {
  return name.replace(/^@/, "").replace(/\//g, "-") + "-" + version + ".tgz";
}

for (const [name, version, destRel] of list) {
  const tb = tarballName(name, version);
  const tbPath = path.join(tmpPkgs, tb);
  // always re-pack to ensure a complete tarball
  rmrf(tbPath);
  execFileSync(npmCli, ["pack", `${name}@${version}`, "--no-audit", "--no-fund",
    "--pack-destination", tmpPkgs, "--fetch-timeout=1800000", "--fetch-retries=8"],
    { stdio: "ignore", timeout: 1800000, shell: true });
  if (!fs.existsSync(tbPath)) {
    console.log(`MISSING TARBALL ${name}@${version} (${tb})`);
    continue;
  }
  const dest = path.join(root, destRel.split("/").join(path.sep));
  rmrf(dest);
  fs.mkdirSync(dest, { recursive: true });
  execFileSync("tar", ["-xf", tbPath, "-C", dest, "--strip-components=1"],
    { stdio: "ignore", timeout: 600000 });
  console.log(`OK ${name}@${version} -> ${destRel}`);
}
console.log("DONE");
