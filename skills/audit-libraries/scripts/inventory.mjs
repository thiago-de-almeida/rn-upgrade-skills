#!/usr/bin/env node
// Collects the facts the audit-libraries skill needs about an app's dependencies. It never decides a
// verdict. Usage: node inventory.mjs --app-root <dir> --target <version> [--from <version>]
// Prints one JSON document on stdout. No dependencies; needs Node >= 18 and network access.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------------------------
// Minimal semver: enough for npm peer ranges (||, hyphen, ^, ~, x, comparators, partial versions).

const VERSION_RE = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseVersion(text) {
  const m = VERSION_RE.exec(String(text).trim());
  if (!m || m[2] === undefined || m[3] === undefined) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split(".") : [] };
}

function comparePre(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1;
    if (b[i] === undefined) return 1;
    const na = /^\d+$/.test(a[i]), nb = /^\d+$/.test(b[i]);
    if (na && nb && +a[i] !== +b[i]) return +a[i] < +b[i] ? -1 : 1;
    if (na !== nb) return na ? -1 : 1;
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function compare(a, b) {
  const x = typeof a === "string" ? parseVersion(a) : a;
  const y = typeof b === "string" ? parseVersion(b) : b;
  for (const k of ["major", "minor", "patch"]) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  return comparePre(x.pre, y.pre);
}

// A partial version ("18", "0.19", "1.x") as [major, minor, patch] with null for wildcards.
function parsePartial(text) {
  const m = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text);
  if (!m) return null;
  const num = (s) => (s === undefined || /^[xX*]$/.test(s) ? null : +s);
  const parts = [num(m[1]), num(m[2]), num(m[3])];
  // Everything after the first wildcard is a wildcard too ("1.x.3" means "1.x").
  const firstWild = parts.indexOf(null);
  if (firstWild !== -1) for (let i = firstWild; i < 3; i++) parts[i] = null;
  return { parts, pre: m[4] ? m[4].split(".") : [] };
}

const v = (maj, min, pat, pre = []) => ({ major: maj, minor: min, patch: pat, pre });
// The lowest version of a line, "x.y.z-0": an exclusive upper bound that keeps x.y.z's prereleases out.
const below = (maj, min, pat) => ({ ...v(maj, min, pat, ["0"]), synthetic: true });

// One comparator set ("space-separated AND") as a list of [operator, version].
function desugar(token) {
  const op = /^(>=|<=|>|<|=|\^|~)?\s*(.*)$/.exec(token);
  const [operator = "", rest] = [op[1], op[2]];
  if (rest === "" || rest === "*" || /^[xX]$/.test(rest)) return [[">=", v(0, 0, 0)]];
  const p = parsePartial(rest);
  if (!p) throw new Error(`invalid range token: ${token}`);
  const [M, m, pt] = p.parts;
  const full = v(M ?? 0, m ?? 0, pt ?? 0, p.pre);
  if (M === null) return [[">=", v(0, 0, 0)]];
  switch (operator || "=") {
    case "^": {
      const upper =
        M > 0 || m === null ? v(M + 1, 0, 0) : m > 0 || pt === null ? v(0, m + 1, 0) : v(0, 0, pt + 1);
      return [[">=", full], ["<", below(upper.major, upper.minor, upper.patch)]];
    }
    case "~": {
      const upper = m === null ? v(M + 1, 0, 0) : v(M, m + 1, 0);
      return [[">=", full], ["<", below(upper.major, upper.minor, upper.patch)]];
    }
    case "=":
      if (m === null) return [[">=", v(M, 0, 0)], ["<", below(M + 1, 0, 0)]];
      if (pt === null) return [[">=", v(M, m, 0)], ["<", below(M, m + 1, 0)]];
      return [["=", full]];
    case ">":
      if (m === null) return [[">=", v(M + 1, 0, 0)]];
      if (pt === null) return [[">=", v(M, m + 1, 0)]];
      return [[">", full]];
    case ">=":
      return [[">=", full]];
    case "<":
      return [["<", p.pre.length ? full : below(full.major, full.minor, full.patch)]];
    case "<=":
      if (m === null) return [["<", below(M + 1, 0, 0)]];
      if (pt === null) return [["<", below(M, m + 1, 0)]];
      return [["<=", full]];
  }
  throw new Error(`invalid range token: ${token}`);
}

function parseSet(text) {
  const hyphen = /^\s*(\S+)\s+-\s+(\S+)\s*$/.exec(text);
  if (hyphen) {
    const lo = desugar(">=" + hyphen[1]);
    const hi = parsePartial(hyphen[2]);
    if (!hi) throw new Error(`invalid range: ${text}`);
    const [M, m, pt] = hi.parts;
    const upper =
      M === null ? [] : m === null ? [["<", below(M + 1, 0, 0)]] : pt === null
        ? [["<", below(M, m + 1, 0)]] : [["<=", v(M, m, pt, hi.pre)]];
    return [...lo, ...upper];
  }
  const tokens = text.trim().replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(/\s+/).filter(Boolean);
  if (!tokens.length) return [[">=", v(0, 0, 0)]];
  return tokens.flatMap(desugar);
}

export function parseRange(range) {
  return String(range).split("||").map(parseSet);
}

function testComparator([op, ref], ver) {
  const c = compare(ver, ref);
  return op === "=" ? c === 0 : op === ">" ? c > 0 : op === ">=" ? c >= 0 : op === "<" ? c < 0 : c <= 0;
}

export function satisfies(version, range) {
  const ver = typeof version === "string" ? parseVersion(version) : version;
  if (!ver) return false;
  let sets;
  try {
    sets = parseRange(range);
  } catch {
    return false;
  }
  return sets.some((set) => {
    if (!set.every((c) => testComparator(c, ver))) return false;
    if (!ver.pre.length) return true;
    // A prerelease only matches a set that names a prerelease of the same major.minor.patch.
    return set.some(([, r]) => r.pre.length && !r.synthetic &&
      r.major === ver.major && r.minor === ver.minor && r.patch === ver.patch);
  });
}

export function maxSatisfying(versions, range) {
  let best = null;
  for (const ver of versions) {
    if (satisfies(ver, range) && (best === null || compare(ver, best) > 0)) best = ver;
  }
  return best;
}

// The "breaking line" of a version: 2.x.x → "2", 0.19.x → "0.19", 0.0.3 → "0.0.3".
export function breakingLine(version) {
  const p = typeof version === "string" ? parseVersion(version) : version;
  if (p.major > 0) return `${p.major}`;
  if (p.minor > 0) return `0.${p.minor}`;
  return `0.0.${p.patch}`;
}

// How many breaking lines with stable releases lie after `from`, up to and including `to`.
export function majorsBehind(from, to, versions) {
  const fromLine = breakingLine(from);
  const lines = new Set();
  for (const ver of versions) {
    const p = parseVersion(ver);
    if (!p || p.pre.length) continue;
    if (compare(ver, from) > 0 && compare(ver, to) <= 0 && breakingLine(p) !== fromLine) lines.add(breakingLine(p));
  }
  return lines.size;
}

// ---------------------------------------------------------------------------------------------
// Files

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// bun.lock is JSON with trailing commas.
export function parseBunLock(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

// "name@version", "name@workspace:path", "@scope/name@npm:other@1.0.0" → { name, version, workspace }
export function parseLockId(id) {
  const at = id.indexOf("@", 1);
  const name = id.slice(0, at);
  let version = id.slice(at + 1);
  if (version.startsWith("workspace:")) return { name, version: null, workspace: version.slice(10) };
  if (version.startsWith("npm:")) version = version.slice(version.lastIndexOf("@") + 1);
  return { name, version, workspace: null };
}

// The version part of a pnpm lock entry: "15.0.3(expo-font@14.0.10(...))" → "15.0.3".
const stripPeerSuffix = (version) => version.replace(/\(.*$/, "");
const unquote = (text) => text.trim().replace(/^(['"])(.*)\1$/, "$2");

// pnpm-lock.yaml (v6 and v9): the importers section only, as { importer: { name: { specifier, version } } }.
export function parsePnpmLock(text) {
  const importers = {};
  let inImporters = false, importer = null, name = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      inImporters = line.startsWith("importers:");
      continue;
    }
    if (!inImporters) continue;
    const m = /^\s*(.+?):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = unquote(m[1]);
    if (indent === 2) importers[(importer = key)] = {};
    else if (indent === 6 && importer) importers[importer][(name = key)] ??= {};
    else if (indent === 8 && name && (key === "specifier" || key === "version")) {
      importers[importer][name][key] = unquote(m[2]);
    }
  }
  return importers;
}

// yarn.lock, classic (v1) and berry: { "name@range": version } for every spec of every entry.
export function parseYarnLock(text) {
  const specs = {};
  let current = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = line.replace(/:\s*$/, "").split(/,\s*/).map(unquote);
      continue;
    }
    const m = /^\s+version:?\s+(.+)$/.exec(line);
    if (m) for (const spec of current) specs[spec] = unquote(m[1]);
  }
  return specs;
}

// One lookup over every supported lockfile: (owner, name, range) → { version, workspace } or null.
// owner is { name, dir } of the package that declares the dependency.
function loadLock(repoRoot, appRoot) {
  for (const dir of [...new Set([appRoot, repoRoot])]) {
    const read = (file) => readFileSync(join(dir, file), "utf8");
    if (existsSync(join(dir, "bun.lock"))) {
      const lock = parseBunLock(read("bun.lock"));
      return {
        file: "bun.lock",
        lookup: (owner, name) => {
          const entry = (owner.name && lock.packages[`${owner.name}/${name}`]) || lock.packages[name];
          return entry ? parseLockId(entry[0]) : null;
        },
      };
    }
    if (existsSync(join(dir, "pnpm-lock.yaml"))) {
      const importers = parsePnpmLock(read("pnpm-lock.yaml"));
      return {
        file: "pnpm-lock.yaml",
        lookup: (owner, name) => {
          const entry = importers[relative(dir, owner.dir) || "."]?.[name];
          if (!entry?.version) return null;
          if (entry.version.startsWith("link:")) return { name, version: null, workspace: entry.version.slice(5) };
          return { name, version: stripPeerSuffix(entry.version), workspace: null };
        },
      };
    }
    if (existsSync(join(dir, "package-lock.json"))) {
      const lock = JSON.parse(read("package-lock.json"));
      return {
        file: "package-lock.json",
        lookup: (owner, name) => {
          const rel = relative(dir, owner.dir);
          const entry = (rel && lock.packages?.[`${rel}/node_modules/${name}`]) ??
            lock.packages?.[`node_modules/${name}`] ?? lock.dependencies?.[name];
          if (!entry) return null;
          if (entry.link) return { name, version: null, workspace: entry.resolved };
          return entry.version ? { name, version: entry.version, workspace: null } : null;
        },
      };
    }
    if (existsSync(join(dir, "yarn.lock"))) {
      const specs = parseYarnLock(read("yarn.lock"));
      return {
        file: "yarn.lock",
        lookup: (owner, name, range) => {
          if (String(range).startsWith("workspace:")) return { name, version: null, workspace: range.slice(10) };
          const version = specs[`${name}@${range}`] ?? specs[`${name}@npm:${range}`];
          if (!version) return null;
          return version.includes("-use.local") || version === "0.0.0-use.local"
            ? { name, version: null, workspace: "local" } : { name, version, workspace: null };
        },
      };
    }
  }
  return null;
}

function findRepoRoot(appRoot) {
  let dir = appRoot;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return appRoot;
    dir = parent;
  }
}

function expandWorkspaces(root, pkg) {
  const patterns = [...(Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces?.packages ?? [])];
  // pnpm keeps its workspaces in pnpm-workspace.yaml: "packages:" followed by "- pattern" lines.
  const pnpmWorkspace = join(root, "pnpm-workspace.yaml");
  if (existsSync(pnpmWorkspace)) {
    let inPackages = false;
    for (const line of readFileSync(pnpmWorkspace, "utf8").split("\n")) {
      if (/^\S/.test(line)) inPackages = line.startsWith("packages:");
      const m = /^\s+-\s+(.+)$/.exec(line);
      if (inPackages && m && !unquote(m[1]).startsWith("!")) patterns.push(unquote(m[1]));
    }
  }
  const dirs = [];
  for (const pattern of patterns) {
    if (pattern.endsWith("/*") || pattern.endsWith("/**")) {
      const base = join(root, pattern.replace(/\/\*\*?$/, ""));
      if (!existsSync(base)) continue;
      for (const entry of readdirSync(base)) {
        const dir = join(base, entry);
        if (statSync(dir).isDirectory() && existsSync(join(dir, "package.json"))) dirs.push(dir);
      }
    } else if (existsSync(join(root, pattern, "package.json"))) {
      dirs.push(join(root, pattern));
    }
  }
  return dirs;
}

function findPatches(root) {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 6) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const sub = join(dir, entry.name);
      if (entry.name === "patches") {
        for (const file of readdirSync(sub)) {
          const m = /^(.+)\+(\d[^+]*)\.patch$/.exec(file);
          if (m) found.push({ path: relative(root, join(sub, file)), library: m[1].replace("+", "/"), version: m[2] });
        }
      } else {
        walk(sub, depth + 1);
      }
    }
  };
  walk(root, 0);
  return found;
}

// A companion's name contains its candidate's (babel-plugin-react-native-web, @types/react-native-x).
// Scopes and generic names like "react-native" would match half the ecosystem, so they never count.
const GENERIC_NAMES = new Set(["react", "react-native", "native", "core", "expo"]);
export function namesMatch(name, candidate) {
  const short = (n) => n.replace(/^@[^/]+\//, "");
  const c = short(candidate);
  return !GENERIC_NAMES.has(c) && short(name).includes(c);
}

// Where a declared dependency comes from when it is not an npm range: "git", "tarball", "file" or null.
export function nonRegistrySource(range) {
  const r = String(range);
  if (/^(git\+|git:|github:|gitlab:|bitbucket:)/.test(r) || /^[\w.-]+\/[\w.-]+(#.*)?$/.test(r) || /\.git(#.*)?$/.test(r)) return "git";
  if (/^https?:/.test(r)) return "tarball";
  if (/^(file:|link:|portal:)/.test(r)) return "file";
  return null;
}

// ---------------------------------------------------------------------------------------------
// Network

const TIMEOUT_MS = 20000;
const cache = new Map();

async function fetchText(url, headers = {}) {
  const key = `${url} ${JSON.stringify(headers)}`;
  if (cache.has(key)) return cache.get(key);
  const promise = (async () => {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { notFound: true });
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return await res.text();
      } catch (error) {
        lastError = error;
        if (error.notFound) break;
      }
    }
    throw lastError;
  })();
  cache.set(key, promise);
  return promise;
}

const fetchJson = async (url, headers) => JSON.parse(await fetchText(url, headers));
const npmName = (name) => name.replace("/", "%2f");
const abbreviated = (name) =>
  fetchJson(`https://registry.npmjs.org/${npmName(name)}`, { Accept: "application/vnd.npm.install-v1+json" });
const manifest = (name, version) => fetchJson(`https://registry.npmjs.org/${npmName(name)}/${version}`);
const fullPackument = (name) => fetchJson(`https://registry.npmjs.org/${npmName(name)}`);

async function nativeFiles(name, version) {
  const listing = await fetchJson(`https://data.jsdelivr.com/v1/packages/npm/${name}@${version}?structure=flat`);
  const files = listing.files.map((f) => f.name);
  return {
    android: files.some((f) => f.startsWith("/android/")),
    ios: files.some((f) => f.startsWith("/ios/") || f.startsWith("/apple/")),
    podspec: files.filter((f) => f.endsWith(".podspec")).map((f) => f.slice(1)),
    buildGradle: files.filter((f) => /^\/android\/(app\/)?build\.gradle(\.kts)?$/.test(f)).map((f) => f.slice(1)),
    changelog: files.find((f) => /^\/CHANGELOG\.md$/i.test(f))?.slice(1) ?? null,
  };
}

async function pool(items, size, worker) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) await worker(queue.shift());
  }));
}

const normalizeRepo = (repo) => {
  const url = typeof repo === "string" ? repo : repo?.url;
  if (!url) return null;
  const m = /github\.com[/:]([^/]+\/[^/#.]+)/.exec(url) ?? /^(?:github:)?([\w.-]+\/[\w.-]+)$/.exec(url);
  return m ? m[1].toLowerCase() : url.toLowerCase();
};

// Expo: the SDK whose bundledNativeModules.json pins the target React Native minor.
async function findExpoSdk(target) {
  const t = parseVersion(target);
  const tags = Object.entries((await abbreviated("expo"))["dist-tags"] ?? {})
    .filter(([tag]) => /^sdk-\d+$/.test(tag))
    .sort(([a], [b]) => +b.slice(4) - +a.slice(4))
    .slice(0, 8);
  for (const [, version] of tags) {
    const url = `https://cdn.jsdelivr.net/npm/expo@${version}/bundledNativeModules.json`;
    const bundled = await fetchJson(url);
    const rn = parseVersion(/\d+\.\d+\.\d+/.exec(bundled["react-native"] ?? "")?.[0] ?? "");
    if (rn && rn.major === t.major && rn.minor === t.minor) {
      return { version, reactNative: bundled["react-native"], bundledNativeModulesUrl: url, bundled };
    }
  }
  return null;
}

// An Expo app without committed native folders is managed (Continuous Native Generation).
function expoMode(appRoot, repoRoot) {
  const ignored = new Set();
  for (const dir of new Set([appRoot, repoRoot])) {
    const file = join(dir, ".gitignore");
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\/?(android|ios)\/?\s*$/.exec(line.trim());
      if (m) ignored.add(m[1]);
    }
  }
  const native = ["android", "ios"].filter((d) => existsSync(join(appRoot, d)) && !ignored.has(d));
  return native.length ? "bare" : "managed";
}

// ---------------------------------------------------------------------------------------------
// Main

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, "");
    if (!["app-root", "target", "from"].includes(key) || argv[i + 1] === undefined) {
      throw new Error(`unknown or incomplete argument: ${argv[i]}`);
    }
    args[key] = argv[++i];
  }
  if (!args["app-root"] || !args.target) throw new Error("usage: inventory.mjs --app-root <dir> --target <version> [--from <version>]");
  if (!parseVersion(args.target)) throw new Error(`--target must be an exact version, got ${args.target}`);
  return args;
}

export async function inventory({ appRoot: appRootArg, target, from }) {
  const appRoot = resolve(appRootArg);
  const appPkgPath = join(appRoot, "package.json");
  if (!existsSync(appPkgPath)) throw new Error(`no package.json in ${appRoot}`);
  const appPkg = readJson(appPkgPath);
  const repoRoot = findRepoRoot(appRoot);
  const rootPkg = existsSync(join(repoRoot, "package.json")) ? readJson(join(repoRoot, "package.json")) : {};
  const warnings = [];

  // Target facts. Without them the classification is meaningless, so failures are fatal.
  const rnManifest = await manifest("react-native", target).catch((e) => {
    throw new Error(`cannot read react-native@${target} from npm (${e.message}); is the target version right?`);
  });
  const templateUrl =
    `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/release/${target}/RnDiffApp/package.json`;
  const template = await fetchJson(templateUrl).catch((e) => {
    throw new Error(`cannot read the ${target} template package.json (${e.message})`);
  });
  const templateDeps = { ...template.dependencies, ...template.devDependencies };
  const targetReact = template.dependencies?.react ?? null;
  const LOCKSTEP = ["react-dom", "react-test-renderer", "@types/react-dom", "@types/react-test-renderer"];

  // Expo apps: the target SDK decides the versions of the packages it bundles.
  const usesExpo = Boolean(appPkg.dependencies?.expo ?? appPkg.devDependencies?.expo);
  let expo = null;
  if (usesExpo) {
    expo = { mode: expoMode(appRoot, repoRoot), installed: null, targetSdk: null };
    try {
      expo.targetSdk = await findExpoSdk(target);
      if (!expo.targetSdk) warnings.push(`no released Expo SDK bundles react-native ${target}; Expo packages are classified like any other`);
    } catch (e) {
      warnings.push(`could not find the Expo SDK for react-native ${target} (${e.message})`);
    }
  }
  // The SDK's bundledNativeModules.json, plus the packages `expo` itself depends on (babel-preset-expo, expo-asset...).
  const expoBundled = { ...expo?.targetSdk?.bundled };
  if (expo?.targetSdk) {
    try {
      Object.assign(expoBundled, (await manifest("expo", expo.targetSdk.version)).dependencies);
    } catch (e) {
      warnings.push(`could not read expo@${expo.targetSdk.version}'s dependencies (${e.message})`);
    }
  }

  // Workspaces.
  const workspaceDirs = expandWorkspaces(repoRoot, rootPkg);
  const workspaces = new Map(); // name → dir
  for (const dir of workspaceDirs) {
    const pkg = readJson(join(dir, "package.json"));
    if (pkg.name) workspaces.set(pkg.name, dir);
  }

  // Lockfile (bun.lock, pnpm-lock.yaml, package-lock.json or yarn.lock).
  let lock = null;
  try {
    lock = loadLock(repoRoot, appRoot);
    if (!lock) warnings.push("no lockfile found; versions are the highest published versions matching the package.json ranges");
  } catch (e) {
    warnings.push(`could not parse the lockfile (${e.message}); versions come from package.json ranges`);
  }
  const lockLookup = (owner, name, range) => {
    try {
      return lock?.lookup(owner, name, range) ?? null;
    } catch {
      return null;
    }
  };

  // Dependency records.
  const appOwner = { name: appPkg.name, dir: appRoot };
  const overrides = { ...rootPkg.resolutions, ...rootPkg.overrides, ...rootPkg.pnpm?.overrides };
  const records = new Map();
  const addRecord = (name, range, section, owner, via) => {
    const existing = records.get(name);
    if (existing) {
      if (via && !existing.via.includes(via)) existing.via.push(via);
      return;
    }
    records.set(name, {
      name, section, declaredRange: range, owner: owner.name ?? null, ownerDir: owner.dir, via: via ? [via] : [],
      resolvedVersion: null, resolvedFrom: null, lockStale: false, class: null, reason: null,
      native: null, peers: null, latest: null, majorsBehind: null, dates: null, directory: null,
      repository: null, companionOf: null, expoRecommended: null, source: nonRegistrySource(range),
      lockedRef: null, override: null, errors: [],
    });
  };
  for (const section of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(appPkg[section] ?? {})) addRecord(name, range, section, appOwner, null);
  }

  // First-party packages: their peers and dependencies are audited on their behalf.
  for (const record of [...records.values()]) {
    const locked = lockLookup(appOwner, record.name, record.declaredRange);
    if (!workspaces.has(record.name) && !locked?.workspace && !String(record.declaredRange).startsWith("workspace:")) continue;
    record.class = "first-party";
    record.reason = "workspace package of this repo";
    const dir = workspaces.get(record.name) ?? (locked?.workspace ? join(repoRoot, locked.workspace) : null);
    if (!dir) continue;
    const pkg = readJson(join(dir, "package.json"));
    for (const section of ["peerDependencies", "dependencies"]) {
      for (const [name, range] of Object.entries(pkg[section] ?? {})) {
        if (workspaces.has(name)) continue;
        addRecord(name, range, `${section} of ${record.name}`, { name: record.name, dir }, record.name);
      }
    }
  }

  // Resolve versions.
  await pool([...records.values()].filter((r) => r.class !== "first-party"), 8, async (record) => {
    const locked = lockLookup({ name: record.owner, dir: record.ownerDir }, record.name, record.declaredRange);
    record.override = typeof overrides[record.name] === "string" ? overrides[record.name] : null;
    if (!record.source && locked?.version && !parseVersion(locked.version)) record.source = "tarball";
    if (record.source) {
      // A fork, a tarball or a local package: npm facts describe the upstream package, not what is installed.
      record.lockedRef = locked?.version ?? null;
      record.resolvedFrom = lock?.file ?? null;
    }
    try {
      const packument = await abbreviated(record.name);
      const versions = Object.keys(packument.versions);
      record.latest = { version: packument["dist-tags"]?.latest ?? null };
      if (record.source) {
        // Nothing to resolve: only the latest npm version is reported, for comparison.
      } else if (locked?.version) {
        record.resolvedVersion = locked.version;
        record.resolvedFrom = lock.file;
        if (!record.override && !satisfies(locked.version, record.declaredRange) &&
          /^[~^<>=\w\s|*.-]+$/.test(record.declaredRange)) {
          record.lockStale = true;
        }
      } else {
        record.resolvedVersion = maxSatisfying(versions, record.declaredRange);
        record.resolvedFrom = "range";
      }
      const peersOf = (ver) => {
        const peers = packument.versions[ver]?.peerDependencies ?? {};
        return { react: peers.react ?? null, "react-native": peers["react-native"] ?? null };
      };
      record.peers = {
        installed: record.resolvedVersion ? peersOf(record.resolvedVersion) : null,
        latest: record.latest.version ? peersOf(record.latest.version) : null,
      };
      if (record.resolvedVersion && record.latest.version) {
        record.majorsBehind = majorsBehind(record.resolvedVersion, record.latest.version, versions);
      }
    } catch (e) {
      if (!record.source) record.errors.push(`npm: ${e.message}`);
      else record.latest = null; // a fork with no npm package of the same name
    }
  });

  // Classify (first match wins): first-party, handled-by-diff, expo-sdk, candidate, companion, js-only.
  for (const record of records.values()) {
    if (record.class) continue;
    if (record.name === "react-native" || record.name in templateDeps) {
      record.class = "handled-by-diff";
      record.reason = "in the target template package.json; apply-upgrade-diff bumps it";
    } else if (record.name.startsWith("@react-native/")) {
      record.class = "handled-by-diff";
      record.reason = "published with react-native; pin it to the target version";
    } else if (LOCKSTEP.includes(record.name)) {
      record.class = "handled-by-diff";
      record.reason = "moves in lockstep with react; apply-upgrade-diff pins it to the target react";
    } else if (expo?.targetSdk && (record.name === "expo" || record.name in expoBundled)) {
      record.class = "expo-sdk";
      record.expoRecommended = record.name === "expo" ? `~${expo.targetSdk.version}` : expoBundled[record.name];
      record.reason = `Expo SDK ${expo.targetSdk.version.split(".")[0]} pins it (${record.expoRecommended}); npx expo install --fix moves it`;
    }
  }
  await pool([...records.values()].filter((r) => !r.class && r.resolvedVersion), 8, async (record) => {
    const versions = [...new Set([record.resolvedVersion, record.latest?.version].filter(Boolean))];
    record.native = {};
    for (const ver of versions) {
      const key = ver === record.resolvedVersion ? "installed" : "latest";
      try {
        const [files, pkg] = await Promise.all([nativeFiles(record.name, ver), manifest(record.name, ver)]);
        record.native[key] = { ...files, codegenConfig: Boolean(pkg.codegenConfig) };
        record.repository ??= normalizeRepo(pkg.repository);
      } catch (e) {
        record.errors.push(`files of ${ver}: ${e.message}`);
      }
    }
    if (versions.length === 1) record.native.latest = record.native.installed;
  });
  const isNative = (n) => n && (n.android || n.ios || n.podspec.length > 0 || n.codegenConfig);
  for (const record of records.values()) {
    if (record.class) continue;
    if (record.source) {
      record.class = "candidate";
      record.reason = `installed from a ${record.source === "git" ? "git URL" : record.source} (${record.lockedRef ?? record.declaredRange}), not from npm; audit the fork by hand`;
      continue;
    }
    if (!record.resolvedVersion) {
      record.class = "candidate";
      record.reason = "could not resolve a version; audit by hand";
      continue;
    }
    const peers = record.peers ?? {};
    const reasons = [];
    if (isNative(record.native?.installed) || isNative(record.native?.latest)) reasons.push("has native code");
    if (peers.installed?.["react-native"] || peers.latest?.["react-native"]) reasons.push("has a react-native peer");
    if (peers.installed?.react && targetReact && !satisfies(targetReact, peers.installed.react)) {
      reasons.push(`installed version's react peer (${peers.installed.react}) rejects react ${targetReact}`);
    }
    if (record.errors.length && !reasons.length) reasons.push("facts incomplete (see errors)");
    if (reasons.length) {
      record.class = "candidate";
      record.reason = reasons.join("; ");
    }
  }
  const candidates = [...records.values()].filter((r) => r.class === "candidate");
  for (const record of records.values()) {
    if (record.class) continue;
    const partner = candidates.find((c) =>
      (record.repository && record.repository === c.repository) || namesMatch(record.name, c.name));
    if (partner) {
      record.class = "companion";
      record.companionOf = partner.name;
      record.reason = `same repository or name as ${partner.name}; usually moves with it`;
    } else {
      record.class = "js-only";
      record.reason = "no native code and no react-native coupling";
    }
  }

  // Candidate extras: publish dates and the React Native Directory.
  await pool(candidates.filter((r) => r.resolvedVersion), 4, async (record) => {
    try {
      const time = (await fullPackument(record.name)).time ?? {};
      record.dates = { installed: time[record.resolvedVersion] ?? null, latest: time[record.latest?.version] ?? null };
    } catch (e) {
      record.errors.push(`dates: ${e.message}`);
    }
  });
  if (candidates.length) {
    try {
      const names = candidates.map((r) => r.name).join(",");
      const directory = await fetchJson(`https://reactnative.directory/api/library?name=${encodeURIComponent(names)}`);
      for (const record of candidates) {
        const entry = directory[record.name];
        record.directory = entry
          ? {
              describes: "latest version only",
              newArchitecture: entry.newArchitecture ?? entry.github?.newArchitecture ?? null,
              unmaintained: entry.unmaintained ?? false,
              alternatives: entry.alternatives ?? [],
            }
          : null;
      }
    } catch (e) {
      warnings.push(`React Native Directory unavailable: ${e.message}`);
    }
  }

  // Other workspaces that pin react / react-native.
  const pins = [];
  for (const dir of [repoRoot, ...workspaceDirs]) {
    if (resolve(dir) === appRoot) continue;
    const pkg = readJson(join(dir, "package.json"));
    const pinned = {};
    for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
      for (const name of ["react", "react-native", "react-dom"]) {
        if (pkg[section]?.[name]) pinned[`${section}.${name}`] = pkg[section][name];
      }
    }
    if (!Object.keys(pinned).length) continue;
    const wanted = { react: targetReact, "react-native": target, "react-dom": targetReact };
    const conflicts = Object.entries(pinned)
      .filter(([key, range]) => !key.startsWith("peerDependencies") && wanted[key.split(".")[1]] &&
        !satisfies(wanted[key.split(".")[1]], range))
      .map(([key]) => key);
    pins.push({ workspace: relative(repoRoot, dir) || ".", name: pkg.name ?? null, pinned, conflicts });
  }

  return {
    schemaVersion: 1,
    generatedBy: "audit-libraries/inventory.mjs",
    appRoot: relative(repoRoot, appRoot) || ".",
    repoRoot,
    app: {
      name: appPkg.name ?? null,
      enginesNode: appPkg.engines?.node ?? null,
      lockfile: lock?.file ?? null,
      expo: expo && {
        mode: expo.mode,
        installed: records.get("expo")?.resolvedVersion ?? null,
        targetSdk: expo.targetSdk && {
          version: expo.targetSdk.version,
          reactNative: expo.targetSdk.reactNative,
          bundledNativeModulesUrl: expo.targetSdk.bundledNativeModulesUrl,
        },
      },
    },
    target: {
      reactNative: target,
      from: from ?? null,
      react: targetReact,
      reactNativePeers: rnManifest.peerDependencies ?? {},
      reactNativeEnginesNode: rnManifest.engines?.node ?? null,
      templateEnginesNode: template.engines?.node ?? null,
      templateUrl,
    },
    workspacePins: pins,
    patches: findPatches(repoRoot).map((p) => ({
      ...p,
      inAppRoot: p.path.startsWith(relative(repoRoot, appRoot) ? relative(repoRoot, appRoot) + "/" : ""),
      auditedHere: records.has(p.library),
    })),
    dependencies: [...records.values()].map(({ ownerDir, ...record }) => record),
    counts: [...records.values()].reduce((acc, r) => ({ ...acc, [r.class]: (acc[r.class] ?? 0) + 1 }), {}),
    warnings,
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await inventory({ appRoot: args["app-root"], target: args.target, from: args.from });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    process.stderr.write(`inventory: ${error.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
