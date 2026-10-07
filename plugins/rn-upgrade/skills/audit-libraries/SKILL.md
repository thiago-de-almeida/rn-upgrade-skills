---
name: audit-libraries
description: Use when planning a React Native upgrade and you need to know which third-party libraries must be upgraded, replaced or patched for the target RN version, and which of their breaking changes affect the app.
argument-hint: <target-version> <app-root> [from-version]
context: fork
agent: rn-upgrade:rn-upgrade-auditor
---

# Audit the app's libraries for a React Native upgrade

You are auditing the dependencies of a React Native app before an upgrade. For every library that
depends on React Native, decide with evidence whether it supports the target version, which version
to move to, and which of its breaking changes affect this app. Your ONLY output is a report.

## Inputs

Arguments: `$ARGUMENTS` — in order: TARGET_VERSION, APP_ROOT, FROM_VERSION.
(Pasting this prompt into another tool? Replace the arguments line with the values below. You may
also add REPORT_PATH, a file outside the repo to save the report to.)

- TARGET_VERSION: `<e.g. 0.86.3>`
- APP_ROOT: `<path to the folder with the app's package.json, android/ and ios/ — "." if it is the repo root>`
- FROM_VERSION (optional): `<e.g. 0.79.0>` — if omitted, detect it.

If TARGET_VERSION or APP_ROOT is missing or still a `<placeholder>`, stop before doing anything
and report which input is missing. Do not infer them from branch names, commits or the latest release.

## Out of scope — do NOT do these

- Changing any file in the repository: no `package.json` edits, no installs, no `pod install`, no
  builds, no commits. Scratch files go in a temporary directory outside the repo.
- Upgrading React Native itself, its template files or the packages the template owns (`react`,
  `@react-native/*`, the CLI, babel, eslint, typescript). The `apply-upgrade-diff` skill handles those.
- Fixing the app's code for a library's breaking changes. Report them; do not fix them.

## Step 1 — Preflight

1. Record `git status --porcelain` for the repository. You will compare it at the end.
2. Detect the version React Native resolves to (lockfile, or `React-Core` in `ios/Podfile.lock`).
   If FROM_VERSION was given and differs, use the resolved version and flag the mismatch.
3. If the inventory (Step 2) reports `app.expo.mode: "managed"` (no committed `android/`/`ios/`),
   stop: report that managed Expo apps should move to the SDK in `app.expo.targetSdk` and run
   `npx expo install --check`. Bare apps that use Expo modules continue.

## Step 2 — Inventory

Run the inventory script that ships with this skill, from the repository root, and save its output
to a temporary file outside the repo:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/inventory.mjs" --app-root <APP_ROOT> --target <TARGET_VERSION> > <tmp>/inventory.json
```

It needs Node 18 or newer and network access (npm registry, jsDelivr, React Native Directory,
GitHub raw). If it exits non-zero, stop and report its error message. Read the JSON from the file,
not from the terminal output, which may be truncated. It contains facts only; you make every decision.

What it gives you:

- `target`: the target `react` version (from the template), React Native's peers and Node engines.
- `workspacePins`: other workspaces pinning `react`/`react-native`/`react-dom`, with `conflicts`
  (pins that do not accept the target).
- `patches`: every `patches/*.patch` in the repo, with the library and version it is tied to.
- `app`: the app's `enginesNode`, the `lockfile` versions were read from, and `expo` (null without
  Expo): `mode`, the `installed` `expo` version, and `targetSdk`, the Expo SDK that bundles the target
  React Native.
- `dependencies[]`: one record per dependency of the app, plus the `dependencies` and
  `peerDependencies` of first-party workspace packages the app uses, directly or through other
  workspaces (`via`). A library installed at two versions (e.g. the app on 2.x, a workspace on 1.x),
  or from npm and from a git fork, has one record each: audit both. `declaredBy` lists every owner
  that shares a record, with its range. Each has a `class`:
  - `candidate` — native code, a `react-native` peer, or a `react` peer that rejects the target `react`. **Audit these.**
  - `companion` — tied to a candidate (same repository or name). It moves with that candidate.
  - `handled-by-diff` — owned by the RN template or in lockstep with `react`. Not audited here.
  - `expo-sdk` — the target Expo SDK pins its version (`expoRecommended`); `npx expo install --fix`
    moves it. **Audit these too**, with `expoRecommended` as the recommended version (Step 4).
  - `first-party` — a workspace package of this repo. Not audited; its dependencies are.
  - `js-only` — no native code and no React Native coupling. Not audited.
- `section`: `dependencies`, `devDependencies` or `peerDependencies`, as declared by its `owner`.
- `source` (`git`, `tarball` or `file`) means the package is not installed from npm: `lockedRef` is
  what is installed, `resolvedVersion` is null and `latest` is the npm package of the same name, which
  may be a different project. Audit the fork's repository at that ref; npm facts say nothing about it.
- `override` means a root `overrides`/`resolutions`/`pnpm.overrides` forces the version: report it,
  and check the override still makes sense on the target.
- `resolvedFrom: "range"` means the version was not read from a lockfile: say so in the report.
  `lockStale: true` means the lockfile does not satisfy a `package.json` (e.g. after
  `apply-upgrade-diff` bumped it without an install): audit the locked version and flag it.
  `declaredBy` says which owners' ranges it breaks.
- `directory`: React Native Directory data. It describes the library's **latest** version only.
- `errors` and `warnings`: sources that failed. A candidate with missing facts needs more evidence, not a guess.

## Step 3 — Global constraints

Before looking at single libraries, report what affects the whole upgrade, each with evidence:

1. **React.** The target needs `react` `target.react`. List every candidate whose installed `react`
   peer rejects it. These cannot stay as they are.
2. **Node.** Compare the app's `engines.node` range with `target.reactNativeEnginesNode`. Report
   the Node versions the app's range allows but the target rejects. The Node installed on this
   machine is not evidence: CI and other developers may run a different one.
3. **Workspaces.** Every `workspacePins` entry with `conflicts`. If the native build or the bundler
   resolves `react`/`react-native` from a hoisted `node_modules` shared with those workspaces
   (check `settings.gradle`, `app/build.gradle`, the Podfile and `metro.config.js`), a mixed version
   means duplicate React or React Native: report it as a build blocker.
4. **Patches.** Every patch is tied to an exact version. Patches on a candidate get handled in
   Step 6; patches on libraries of other workspaces belong here, next to that workspace's pins.

## Step 4 — Investigate every candidate, one at a time

Climb this ladder only as far as you need to reach a verdict with evidence. The highest rung you
reached is the candidate's **confidence** (1, 2 or 3).

1. **Rung 1 — inventory facts.** Peers of the installed and the latest version, native files,
   `directory`, dates. Supporting the target means: accepts the target `react`, and runs on the New
   Architecture (mandatory since RN 0.82). A native module with no `codegenConfig` and no TurboModule
   or Fabric implementation is a **legacy module**: it runs only through the interop layer, which is
   a stopgap, not support. The Directory's `newArchitecture` is evidence about the latest version,
   never about the installed one.
2. **Rung 2 — changelog and releases** between the installed version and the latest:
   the package's `CHANGELOG.md` (`https://cdn.jsdelivr.net/npm/<name>@<version>/CHANGELOG.md`, when
   `native.*.changelog` is set) or the GitHub releases (`gh release list` / `gh api repos/<owner>/<repo>/releases`).
   Extract breaking changes, "requires React Native ≥ x", and minSdk/compileSdk/iOS-target changes.
3. **Rung 3 — only when the candidate is heading to `needs human`, or rungs 1–2 contradict each
   other:** issues and commits (`gh search issues "<target minor>" --repo <repo>`, the commit that
   bumped React Native in the library's example app), and the code of the version you recommend.

For every native candidate, read the `build.gradle` and the podspec of the version you recommend
(`https://cdn.jsdelivr.net/npm/<name>@<version>/<path>`, paths from `native.latest`) and record the
raw values of minSdk, compileSdk, Kotlin, AGP and the iOS deployment target. If a value comes from
`rootProject.ext` or a default, record that instead of guessing a number.

Recommended version: the minimum version that supports the target when the changelog says so;
otherwise the latest, with the minimum recorded as `unknown`. Companions follow their candidate's
recommendation; check that a matching version exists.

For `expo-sdk` libraries the recommended version is `expoRecommended`, and the work is
`npx expo install --fix`. Skip rungs 1–3 for support, which the SDK guarantees, but when the bump
crosses a breaking line, read the changelog between the installed and the recommended version for
breaking changes (Step 5). An app dependency that the inventory classed `candidate` but whose
package the target SDK deprecated or removed (e.g. `expo-av`) is `replace`: name the SDK's replacement.

## Step 5 — Usage in the app

For every candidate with breaking changes, find how the app uses it, under APP_ROOT and excluding
`node_modules`: the files that import it and the symbols they use. For native breaking changes
(Gradle, podspec, `MainApplication`, `AppDelegate`), check the app's `android/` and `ios/`.
Mark each breaking change `affects` (with the files), `does not affect`, or `unknown`.

## Step 6 — Patches

Every patched library that moves gets "re-verify the patch on the new version", with the patch
path: candidates and companions with a recommended bump, `expo-sdk` libraries whose
`expoRecommended` differs from the installed version, and `handled-by-diff` packages (including
`react-native` itself) that the template moves. Say which upstream release, if any, makes the patch
unnecessary.

## Step 7 — Verdict and need

Give every candidate, companion and `expo-sdk` library exactly one verdict, which says what to do:

- `ok as is` — evidence that the **installed** version accepts the target `react` and runs on the
  New Architecture natively. A legacy module is `ok as is` only in the maintained case below.
- `minor bump` — a newer version in the same breaking line (same major, or same minor for 0.x).
- `major bump` — a new breaking line is needed.
- `replace` — unmaintained or without support; list the alternatives. When a small patch to the
  installed version (e.g. dropping `jcenter()`) unblocks the build, list it as the interim option.
- `patch/fork` — no released version works and replacing is not reasonable.
- `needs human` — the evidence does not settle it, and you can point to where it may break: a
  file:line in the library's code, or an open issue about the target. Write the exact question to
  answer. Doubt alone is not enough: without such a point, the rules here decide.

A legacy module gets `minor bump`/`major bump` to the first version that implements the New
Architecture. If no version does, it gets `replace` when it has had no release in two years or the
Directory marks it unmaintained. Otherwise it is `ok as is`, with "runs through the interop layer;
test it on a device" in the evidence, unless you found a removed API it uses.

A build failure reported in an issue blocks this app only when the app has the same setup (Podfile,
Gradle and package-manager settings) and none of the issue's workarounds; quote the matching lines.

A removed API counts only where code that is compiled or run uses it. A mention in a comment, a
doc, a test or the library's example app is not a use.

Then give every verdict other than `ok as is` and `needs human` a **need**, which says how urgent it is:

- `required` — the app does not build or run correctly on the target without it. Only these count:
  it blocks the build (with evidence); the installed version uses an API the target removed; it is
  an `expo-sdk` library whose installed version belongs to an older SDK; its installed `react` peer
  rejects the target and the package manager enforces peers (npm 7+ without `legacy-peer-deps`,
  pnpm with `strict-peer-dependencies`); or a `required` change of another library needs it.
  A library in `devDependencies`, or one only such a library pulls in (Storybook, test and lint
  tooling), is `required` only when it breaks the app's build or its test command.
- `recommended` — the installed version works on the target, but should move: a legacy module
  running through the interop layer, an unmaintained library, a peer mismatch the package manager
  only warns about, or a newer release with relevant fixes.

No support claim without cited evidence (URL, file:line, command output). A fact you could not
fetch means `needs human`, never a guess.

## Step 8 — Verify

Run `git status --porcelain` again. It must match Step 1. If it does not, report what changed.

## Step 9 — Report

Write the report in Markdown with these sections:

1. **Summary**: "Of M audited libraries, N must change for the target, R more are recommended, K
   need a human", where M counts candidates, companions and `expo-sdk` libraries, N counts need
   `required`, R counts need `recommended`, and K counts `needs human`. Then the count per verdict,
   the build blockers, and the `required` libraries by name.
2. **Global constraints** from Step 3, each with "blocks the build: yes/no/unknown", the targets it
   blocks, and evidence.
3. **Libraries**, one row per candidate, companion and `expo-sdk` library:
   `library | installed | recommended (minimum / latest) | verdict | need | work | blocks build | targets | depends on | affects app | confidence | evidence`.
   Need is `required`, `recommended`, or empty for `ok as is` and `needs human`. List the
   `required` rows first.
   Work is one of `bump only`, `code change (N files)`, `replace`, `patch/fork`. Blocks build is
   `yes`, `no` or `unknown`; `unknown` needs an open question. Targets lists what it blocks:
   `android`, `ios`, `web` (empty when it blocks nothing).
4. **Details** for every library that is not `ok as is`: each breaking change with
   affects / does not affect / unknown, the files, and the evidence.
5. **Native constraints** (feeds the Android and iOS target checks): one row per native candidate with
   minSdk, compileSdk, Kotlin, AGP, iOS deployment target and the file each value came from.
6. **Patches** to re-verify.
7. **Not audited**: the names of the `handled-by-diff`, `first-party` and `js-only` dependencies.
8. **Open questions** for a human.
9. **Data**: a fenced `json` block with exactly this shape, for tools that read the report:

```json
{
  "schemaVersion": 1,
  "rn": { "from": "", "to": "" },
  "summary": { "audited": 0, "required": 0, "recommended": 0, "needsHuman": 0, "byVerdict": {} },
  "globalConstraints": [{ "id": "", "description": "", "blocksBuild": false, "targets": [], "evidence": "" }],
  "libraries": [{
    "name": "", "installed": "", "recommended": "", "minimumSupporting": null, "latest": "",
    "verdict": "", "need": null, "work": "", "filesAffected": 0, "blocksBuild": false, "targets": [], "dependsOn": [],
    "confidence": 1,
    "breakingChanges": [{ "summary": "", "affects": "yes", "files": [] }],
    "native": { "minSdk": null, "compileSdk": null, "kotlin": null, "agp": null, "iosDeploymentTarget": null },
    "openQuestions": []
  }]
}
```

`affects` is `yes`, `no` or `unknown`. `need` is `"required"`, `"recommended"` or `null`. `blocksBuild` is `true`, `false` or `"unknown"`, and
`targets` holds `android`, `ios` and `web`. Values that come from the table must match it.

Return the full report, all sections, as your final message. If REPORT_PATH was given and your
environment allows writing it, also save the report there; otherwise state that it was not saved.
