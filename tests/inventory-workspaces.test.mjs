// Run with: node --test tests/*.test.mjs
// End-to-end inventory runs over a local monorepo fixture, with the network stubbed.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { inventory } from "../plugins/rn-upgrade/skills/audit-libraries/scripts/inventory.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "audit-libraries-"));
  mkdirSync(join(root, ".git"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), typeof content === "string" ? content : JSON.stringify(content));
  }
  return root;
}

// app → workspace a → workspace b → native-lib; app uses lib@2, workspace a uses lib@1.
const monorepo = {
  "package.json": {
    name: "app",
    dependencies: { a: "workspace:*", lib: "^2.0.0", "react-native": "0.86.3" },
  },
  "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
  "packages/a/package.json": { name: "a", dependencies: { b: "workspace:*", lib: "^1.0.0" } },
  "packages/b/package.json": { name: "b", dependencies: { "native-lib": "^3.0.0" } },
  "pnpm-lock.yaml": `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      a:
        specifier: workspace:*
        version: link:packages/a
      lib:
        specifier: ^2.0.0
        version: 2.0.0
      react-native:
        specifier: 0.86.3
        version: 0.86.3

  packages/a:
    dependencies:
      b:
        specifier: workspace:*
        version: link:../b
      lib:
        specifier: ^1.0.0
        version: 1.0.0

  packages/b:
    dependencies:
      native-lib:
        specifier: ^3.0.0
        version: 3.0.1
`,
};

const packuments = {
  lib: { "dist-tags": { latest: "2.0.0" }, versions: {
    "1.0.0": { peerDependencies: { react: "^18" } },
    "2.0.0": { peerDependencies: { react: "^19" } },
  } },
};

function stubNetwork({ failing = [] } = {}) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const json = (body) => new Response(JSON.stringify(body), { status: 200 });
    const npm = /^https:\/\/registry\.npmjs\.org\/([^/]+(?:%2f[^/]+)?)(?:\/(.+))?$/.exec(url);
    if (npm) {
      const name = decodeURIComponent(npm[1]);
      if (failing.includes(name)) return new Response("down", { status: 503 });
      if (name === "react-native" && npm[2]) return json({ peerDependencies: { react: "^19.2.3" }, engines: { node: ">=22" } });
      if (npm[2]) return json({});
      return packuments[name] ? json(packuments[name]) : new Response("", { status: 404 });
    }
    if (url.includes("rn-diff-purge")) return json({ dependencies: { react: "19.2.3", "react-native": "0.86.3" } });
    if (url.includes("data.jsdelivr.com")) return json({ files: [] });
    if (url.includes("reactnative.directory")) return json({});
    return new Response("", { status: 404 });
  };
  return () => { globalThis.fetch = original; };
}

test("chained workspaces: dependencies of a workspace used by a workspace are audited", async () => {
  const restore = stubNetwork();
  try {
    const result = await inventory({ appRoot: fixture(monorepo), target: "0.86.3" });
    const nativeLib = result.dependencies.find((d) => d.name === "native-lib");
    assert.ok(nativeLib, "native-lib missing from the inventory");
    assert.deepEqual(nativeLib.via, ["b"]);
    assert.equal(result.dependencies.find((d) => d.name === "b")?.class, "first-party");
  } finally {
    restore();
  }
});

test("one record per installed version, each with its own owner and peers", async () => {
  const restore = stubNetwork();
  try {
    const result = await inventory({ appRoot: fixture(monorepo), target: "0.86.3" });
    const libs = result.dependencies.filter((d) => d.name === "lib")
      .map((d) => ({ version: d.resolvedVersion, owner: d.owner, react: d.peers?.installed?.react }))
      .sort((x, y) => x.version.localeCompare(y.version));
    assert.deepEqual(libs, [
      { version: "1.0.0", owner: "a", react: "^18" },
      { version: "2.0.0", owner: "app", react: "^19" },
    ]);
  } finally {
    restore();
  }
});

test("a registry failure keeps the version read from the lockfile", async () => {
  const restore = stubNetwork({ failing: ["native-lib"] });
  try {
    const result = await inventory({ appRoot: fixture(monorepo), target: "0.86.3" });
    const nativeLib = result.dependencies.find((d) => d.name === "native-lib");
    assert.equal(nativeLib.resolvedVersion, "3.0.1");
    assert.equal(nativeLib.resolvedFrom, "pnpm-lock.yaml");
    assert.ok(nativeLib.errors.some((e) => e.startsWith("npm:")));
  } finally {
    restore();
  }
});

// npm workspaces: the app and workspace a share lib@1.0.0 under different ranges, and install fork
// from npm (app) and from git (a) at the same package.json version.
const npmMonorepo = {
  "package.json": {
    name: "app",
    workspaces: ["packages/*"],
    dependencies: { a: "*", lib: "^1.0.0", fork: "^1.0.0", "react-native": "0.86.3" },
  },
  "packages/a/package.json": { name: "a", dependencies: { lib: "^2.0.0", fork: "github:org/fork#abc123" } },
  "package-lock.json": {
    lockfileVersion: 3,
    packages: {
      "": { name: "app" },
      "node_modules/a": { resolved: "packages/a", link: true },
      "node_modules/lib": { version: "1.0.0" },
      "node_modules/fork": { version: "1.0.0" },
      "packages/a/node_modules/fork": { version: "1.0.0", resolved: "git+ssh://git@github.com/org/fork.git#abc123" },
    },
  },
};

test("a shared version keeps every owner's range, and flags the ones the lockfile breaks", async () => {
  const restore = stubNetwork();
  try {
    const result = await inventory({ appRoot: fixture(npmMonorepo), target: "0.86.3" });
    const libs = result.dependencies.filter((d) => d.name === "lib");
    assert.equal(libs.length, 1);
    assert.deepEqual(libs[0].declaredBy, [
      { owner: "app", section: "dependencies", range: "^1.0.0", lockStale: false },
      { owner: "a", section: "dependencies of a", range: "^2.0.0", lockStale: true },
    ]);
    assert.equal(libs[0].resolvedVersion, "1.0.0");
    assert.equal(libs[0].lockStale, true);
  } finally {
    restore();
  }
});

test("a git fork and the npm package at the same version stay separate", async () => {
  const restore = stubNetwork();
  try {
    const result = await inventory({ appRoot: fixture(npmMonorepo), target: "0.86.3" });
    const forks = result.dependencies.filter((d) => d.name === "fork")
      .map((d) => ({ owner: d.owner, source: d.source }))
      .sort((x, y) => x.owner.localeCompare(y.owner));
    assert.deepEqual(forks, [{ owner: "a", source: "git" }, { owner: "app", source: null }]);
  } finally {
    restore();
  }
});
