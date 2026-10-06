---
name: apply-upgrade-diff
description: Use when upgrading a React Native app to a new version and its native/template files (android/, ios/, package.json, Gradle, Podfile, AppDelegate, MainApplication, Info.plist) must follow the React Native Upgrade Helper / rn-diff-purge diff, or when that diff fails to apply because the project was customized.
argument-hint: <target-version> [app-root] [from-version]
context: fork
agent: rn-upgrade-applier
---

# Apply the React Native Upgrade Helper diff

You are upgrading the native/template files of a React Native app by applying the official
Upgrade Helper diff (https://react-native-community.github.io/upgrade-helper). Your ONLY job is to
apply that diff to this project, and to explain every part of it that does not apply cleanly.

## Inputs

Arguments: `$ARGUMENTS` — in order: TARGET_VERSION, APP_ROOT, FROM_VERSION.
(Pasting this prompt into another tool? Replace the arguments line with the values below.)

- TARGET_VERSION: `<e.g. 0.86.3>`
- APP_ROOT: `<path to the folder with the app's package.json, android/ and ios/ — "." if it is the repo root>`
- FROM_VERSION (optional): `<e.g. 0.79.0>` — if omitted, detect it.
- REPORT_PATH (optional): `<where to save the report>` — if omitted, save it as `rn-upgrade-report.md` next to the downloaded diff, outside the repo.

If TARGET_VERSION or APP_ROOT is missing or still a `<placeholder>`, stop before touching anything
and report which input is missing. Do not infer them from branch names, commits or the latest release.

## Out of scope — do NOT do these

- Upgrading third-party libraries, installing dependencies, running `pod install`, building or running the app.
- Fixing JS/native code that breaks because of React Native API changes.
- Committing, pushing, or opening PRs. Leave every change uncommitted for human review.
- "Fixing" a conflict by overwriting the project's file with the template version.

## Step 1 — Preflight

1. Confirm the git working tree is clean. If it is not, stop and report.
2. Detect the version React Native actually resolves to — from the lockfile (`package-lock.json`,
   `yarn.lock`, `pnpm-lock.yaml`, `bun.lock`) or `node_modules/react-native/package.json`, and the
   `React-Core` entry in `ios/Podfile.lock`. The semver range in `package.json` is NOT the version.
3. If FROM_VERSION was given and differs from the resolved version, use the resolved version and
   flag the mismatch at the top of your report. A wrong base makes hunks fail for reasons that have
   nothing to do with the project.
4. Collect the project's identifiers, which replace the template's placeholders:
   - app name (`app.json` `name`, the `ios/*.xcodeproj` name) → replaces `RnDiffApp`
   - Android `namespace`/`applicationId` and the source path of `MainActivity`/`MainApplication` → replaces `com.rndiffapp` / `com/rndiffapp`
   - whether the app lives in a subfolder or monorepo (affects paths and where `react-native` is declared)
   - whether the project uses Kotlin or Java, Swift or Objective-C, and Expo prebuild (in which case `android/`/`ios/` may be generated and the diff may not apply at all — report and stop if so).

## Step 2 — Get and adapt the diff

1. Download the raw diff the Upgrade Helper uses:
   `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/<FROM>..<TARGET>.diff`
   Save it outside the repo. If the URL 404s, the version pair does not exist — stop and report.
2. Rewrite it for this project: strip the `RnDiffApp/` path prefix (and add APP_ROOT if needed), and
   replace `RnDiffApp`, `rndiffapp`, `com.rndiffapp` and `com/rndiffapp` with the project's identifiers.
   Keep the original diff too; you will reference it in the report.
3. List every file the diff touches. Each one must appear in your final report.

## Step 3 — Apply file by file

Split the diff per file and apply each one separately (e.g. `git apply --reject --whitespace=nowarn`),
so one failing file never blocks the rest. Then handle these special cases by intent, not by patch:

- `package.json`: bump only `react-native`, `react`, `@react-native/*` and the template's tooling
  devDependencies to the target template's versions. Keep everything else the project has.
  Also bump the packages that must move in lockstep with `react` even if the template does not list
  them (`react-dom`, `@types/react`, `react-test-renderer`, …) — a `react`/`react-dom` mismatch breaks
  web and test setups. If a lockstep package forces a third-party upgrade (e.g. `react-native-web`
  needs a new major for the new `react`), do not upgrade it: list it under "Needs a human".
- Monorepos/workspaces: check every sibling workspace and the root `package.json` for `react`,
  `react-native` and `@react-native/*` versions, plus `overrides`/`resolutions`. Do not change them,
  but report every conflict — mixed versions in one workspace usually mean duplicate React at runtime.
- Binary files (e.g. `gradle-wrapper.jar`): download the target file from
  `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/release/<TARGET>/RnDiffApp/<path>`.
- `project.pbxproj`: never regenerate it. If hunks fail, apply the semantic change (the build setting,
  the phase, the flag) by hand in the right place.
- New, deleted and renamed files: create/delete/rename them only if the project uses the template's
  version of that file. Otherwise treat them as a failed hunk and investigate (Step 4).

## Step 4 — Investigate EVERY failed or skipped hunk, one at a time

For each hunk that did not apply cleanly (every `.rej`, every missing file, every special case you
could not apply), find out WHY this project differs from a standard React Native template:

1. Read the current code around the hunk.
2. Dig into history: `git log --follow -p -- <file>`, `git log -L <start>,<end>:<file>`, `git blame`,
   and read the commit messages (and the linked PRs/issues, if `gh` is available).
3. Classify the cause with evidence (file:line + commit SHA + one-line summary of the commit):
   - **Customized** — the project changed this on purpose (native module setup, flavors, signing,
     Podfile hooks, build tweaks…). Apply the template's intent by hand and keep the customization.
   - **Already applied** — the project already has this change (partial upgrade, cherry-pick). Skip.
   - **Moved/rewritten** — the file was renamed, converted (Java→Kotlin, ObjC→Swift) or relocated.
     Apply the equivalent change in the new place.
   - **Not used** — the project does not use this template file (sample `App.tsx`, template tests,
     lint config, README). Skip, unless it affects the build.
   - **Base mismatch** — the project never had the FROM template's version of this code. Apply by intent.
   - **Needs a human** — you cannot decide safely. Do NOT guess: leave it unapplied and write the
     exact question a human must answer.

Then review the hunks that applied CLEANLY too. A clean apply only means the project still had the
template's old code — not that the new default fits this app. For every clean hunk that removes or
restricts something (supported orientations, permissions, manifest attributes, build flags, deleted
files), check whether the app relies on it — e.g. a video player that goes fullscreen in landscape
needs landscape orientations. If it does, keep the hunk applied but list it under "Needs a human"
with the evidence (where the app uses it).

## Step 5 — Verify (static checks only, no build)

- No `.rej`/`.orig` files and no conflict markers left anywhere.
- No leftover `RnDiffApp`, `rndiffapp` or `HelloWorld` strings in changed files.
- All changed JSON files parse; `plutil -lint` passes on changed `.plist`/`.pbxproj` files (macOS).
- Every file from the diff is in the report, and `git diff --stat` matches what the report claims.

## Step 6 — Report

Save the report to REPORT_PATH as Markdown with these sections:

1. Version used (FROM → TARGET), mismatches found, and the diff URL.
2. A table with one row per file of the diff:
   `file | result (applied clean / applied by hand / skipped / needs human) | cause | evidence`.
3. Every hunk applied by hand: what you changed and why it is equivalent to the template's intent.
4. Open questions for a human, including lockstep packages that need a third-party upgrade,
   workspace version conflicts, and clean hunks that remove something the app relies on.
5. Next steps that were out of scope (install, pods, library upgrades, build), as a short list.

Then reply with the report's path and a short summary: the count of files per result (taken from the
saved table, not recounted from memory) and the open questions.
