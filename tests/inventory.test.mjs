// Run with: node --test tests/*.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  breakingLine, majorsBehind, maxSatisfying, namesMatch, nonRegistrySource, parseBunLock, parseLockId,
  parsePnpmLock, parseYarnLock, satisfies,
} from "../plugins/rn-upgrade/skills/audit-libraries/scripts/inventory.mjs";

test("satisfies: caret, tilde, partial and x-ranges", () => {
  assert.ok(satisfies("19.2.3", "^19.2.3"));
  assert.ok(!satisfies("19.2.3", "^19.3.0"));
  assert.ok(satisfies("18.3.1", "^18"));
  assert.ok(!satisfies("19.0.0", "^18"));
  assert.ok(satisfies("0.19.13", "^0.19.13"));
  assert.ok(!satisfies("0.20.0", "^0.19.13"));
  assert.ok(satisfies("0.0.3", "^0.0.3"));
  assert.ok(!satisfies("0.0.4", "^0.0.3"));
  assert.ok(satisfies("1.2.9", "~1.2.3"));
  assert.ok(!satisfies("1.3.0", "~1.2.3"));
  assert.ok(satisfies("18.0.5", "18.x"));
  assert.ok(satisfies("5.0.0", "*"));
  assert.ok(satisfies("5.0.0", ""));
});

test("satisfies: comparators, unions and hyphen ranges", () => {
  assert.ok(satisfies("19.2.3", ">= 16.8.0 < 20.0.0"));
  assert.ok(!satisfies("20.0.0", ">= 16.8.0 < 20.0.0"));
  assert.ok(satisfies("19.2.3", "^16.8.4 || ^17 || ^18 || ^19"));
  assert.ok(satisfies("19.2.3", "^18.0.0 || ^19.0.0"));
  assert.ok(satisfies("1.5.0", "1.2.3 - 1.6"));
  assert.ok(!satisfies("1.7.0", "1.2.3 - 1.6"));
  assert.ok(satisfies("0.86.3", ">=0.71"));
  assert.ok(!satisfies("0.86.3", "<0.80"));
  assert.ok(satisfies("2.0.0", ">1"));
  assert.ok(!satisfies("1.9.0", ">1"));
});

test("satisfies: prereleases only match ranges that name them", () => {
  assert.ok(!satisfies("20.0.0-rc.1", "^19 || ^20"));
  assert.ok(!satisfies("19.3.0-canary.1", "^19.0.0"));
  assert.ok(satisfies("7.0.0-beta.12", ">=7.0.0-beta.11"));
  assert.ok(satisfies("0.28.1-0", "^0.28.1-0"));
  assert.ok(satisfies("0.28.0", "^0.28.0"));
  assert.ok(!satisfies("0.29.0-0", "^0.28.0"));
  assert.ok(!satisfies("2.0.0-0", "<2"));
  assert.ok(!satisfies("garbage", "^1"));
  assert.ok(!satisfies("1.0.0", "not a range"));
});

test("maxSatisfying picks the highest stable match", () => {
  const versions = ["4.5.6", "4.5.7", "4.6.0-rc.0", "5.0.0", "5.2.1"];
  assert.equal(maxSatisfying(versions, "^4.5.6"), "4.5.7");
  assert.equal(maxSatisfying(versions, "*"), "5.2.1");
  assert.equal(maxSatisfying(versions, "^6"), null);
});

test("breaking lines and majorsBehind treat 0.x minors as majors", () => {
  assert.equal(breakingLine("0.19.13"), "0.19");
  assert.equal(breakingLine("4.5.7"), "4");
  assert.equal(breakingLine("0.0.3"), "0.0.3");
  const web = ["0.19.13", "0.20.0", "0.20.1", "0.21.0", "0.21.3", "0.22.0-rc.1"];
  assert.equal(majorsBehind("0.19.13", "0.21.3", web), 2);
  assert.equal(majorsBehind("4.5.7", "5.2.1", ["4.5.7", "4.6.0", "5.0.0", "5.2.1"]), 1);
  assert.equal(majorsBehind("5.2.1", "5.2.1", ["5.2.1"]), 0);
});

test("bun.lock parsing and lock ids", () => {
  const lock = parseBunLock('{ "packages": { "a": ["a@1.0.0", "", {},], }, }');
  assert.deepEqual(lock.packages.a[0], "a@1.0.0");
  assert.deepEqual(parseLockId("@react-native-community/slider@4.5.7"),
    { name: "@react-native-community/slider", version: "4.5.7", workspace: null });
  assert.deepEqual(parseLockId("react-native-video@workspace:packages/react-native-video"),
    { name: "react-native-video", version: null, workspace: "packages/react-native-video" });
  assert.equal(parseLockId("alias@npm:@scope/real@2.1.0").version, "2.1.0");
});

test("pnpm-lock importers: peer suffixes, workspaces and git tarballs", () => {
  const lock = parsePnpmLock(`lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@react-native-community/slider':
        specifier: ^4.5.6
        version: 4.5.7(react-native@0.81.5(@babel/core@7.26.0))(react@19.1.0)
      lib:
        specifier: workspace:*
        version: link:packages/lib
      fork:
        specifier: github:Org/fork#abc123
        version: https://codeload.github.com/Org/fork/tar.gz/abc123

packages:

  lib@1.0.0:
    resolution: {integrity: sha512-x}
`);
  assert.deepEqual(lock["."]["@react-native-community/slider"],
    { specifier: "^4.5.6", version: "4.5.7(react-native@0.81.5(@babel/core@7.26.0))(react@19.1.0)" });
  assert.equal(lock["."].lib.version, "link:packages/lib");
  assert.equal(lock["."].fork.version, "https://codeload.github.com/Org/fork/tar.gz/abc123");
});

test("yarn.lock: classic and berry entries", () => {
  const classic = parseYarnLock(`# yarn lockfile v1

"@scope/a@^1.0.0", "@scope/a@^1.1.0":
  version "1.2.0"
  resolved "https://registry.yarnpkg.com/@scope/a/-/a-1.2.0.tgz"

b@~2.0.0:
  version "2.0.3"
`);
  assert.equal(classic["@scope/a@^1.0.0"], "1.2.0");
  assert.equal(classic["@scope/a@^1.1.0"], "1.2.0");
  assert.equal(classic["b@~2.0.0"], "2.0.3");
  const berry = parseYarnLock(`__metadata:
  version: 8

"c@npm:^3.0.0":
  version: 3.1.0
  resolution: "c@npm:3.1.0"
`);
  assert.equal(berry["c@npm:^3.0.0"], "3.1.0");
});

test("non-registry sources", () => {
  assert.equal(nonRegistrySource("RocketChat/react-native-image-crop-picker#5346870"), "git");
  assert.equal(nonRegistrySource("github:Org/repo"), "git");
  assert.equal(nonRegistrySource("git+https://github.com/org/repo.git#v1"), "git");
  assert.equal(nonRegistrySource("https://example.com/pkg.tgz"), "tarball");
  assert.equal(nonRegistrySource("file:../lib"), "file");
  assert.equal(nonRegistrySource("^1.2.3"), null);
  assert.equal(nonRegistrySource("npm:@scope/real@2"), null);
});

test("companion names ignore scopes and generic names", () => {
  assert.ok(namesMatch("babel-plugin-react-native-web", "react-native-web"));
  assert.ok(namesMatch("@types/react-native-background-timer", "react-native-background-timer"));
  assert.ok(!namesMatch("react-native-animatable", "@bugsnag/react-native"));
  assert.ok(!namesMatch("react-native-easy-grid", "react-native"));
});
