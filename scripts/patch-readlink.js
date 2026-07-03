// Node 24 on Windows regression: fs.readlink on a regular (non-symlink) file
// returns EISDIR instead of the canonical EINVAL. webpack/enhanced-resolve and
// Next.js treat EINVAL as "not a symlink" but crash on EISDIR. Remap it.
const fs = require("fs");

function remap(err) {
  if (err && err.code === "EISDIR") {
    err.code = "EINVAL";
    err.errno = -4071; // UV_EINVAL on Windows
  }
  return err;
}

const origSync = fs.readlinkSync;
fs.readlinkSync = function (...args) {
  try {
    return origSync.apply(this, args);
  } catch (e) {
    throw remap(e);
  }
};

const origCb = fs.readlink;
fs.readlink = function (...args) {
  const cb = args[args.length - 1];
  if (typeof cb === "function") {
    args[args.length - 1] = function (err, ...rest) {
      cb(err ? remap(err) : err, ...rest);
    };
  }
  return origCb.apply(this, args);
};

if (fs.promises && fs.promises.readlink) {
  const origP = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = function (...args) {
    return origP(...args).catch((e) => {
      throw remap(e);
    });
  };
}
