---
name: check-platform-targets
description: Use when planning a React Native upgrade and you need to know whether the Android SDK levels or the iOS deployment target and Xcode version must change, who requires it (React Native, a library, Google Play, the App Store), by when, and which platform behaviour changes that brings affect the app.
argument-hint: <target-version> <app-root> [from-version]
context: fork
agent: rn-upgrade:rn-upgrade-platform-checker
---

# Check the Android and iOS targets for a React Native upgrade

You are checking the platform side of a React Native upgrade. For Android and iOS, find which
versions must move for the target React Native version, who requires each value, by when, and
which platform behaviour changes that move brings into this app. Your ONLY output is a report.

## Inputs

Arguments: `$ARGUMENTS` — in order: TARGET_VERSION, APP_ROOT, FROM_VERSION.
(Pasting this prompt into another tool? Replace the arguments line with the values below. You may
also add REPORT_PATH, to save the report somewhere other than the default, and HTML=no to skip
the HTML page saved next to it.)

- TARGET_VERSION: `<e.g. 0.86.3>`
- APP_ROOT: `<path to the folder with the app's package.json, android/ and ios/ — "." if it is the repo root>`
- FROM_VERSION (optional): `<e.g. 0.79.0>` — if omitted, detect it.

If TARGET_VERSION or APP_ROOT is missing or still a `<placeholder>`, stop before doing anything
and report which input is missing. Do not infer them from branch names, commits or the latest release.

## Out of scope — do NOT do these

- Changing any file in the repository, installing, building or committing. Scratch files go in a
  temporary directory outside the repo.
- Auditing third-party libraries one by one: the `audit-libraries` skill does that. Read its report.
- Behaviour changes that reach every app on a new OS whatever its target ("all apps" changes):
  they do not depend on this upgrade.
- Fixing the app's code. Report what is affected; do not fix it.

## Step 1 — Preflight

1. Record `git status --porcelain` for the repository. You will compare it at the end.
2. Detect the React Native version the app resolves (lockfile, or `React-Core` in
   `ios/Podfile.lock`). If FROM_VERSION was given and differs, use the resolved version and flag it.
3. If APP_ROOT has no `android/` or `ios/` folder (managed Expo), stop: the target values live in
   the Expo SDK, and this skill does not apply.

## Step 2 — Current values

Record each value with its file:line. When a value comes from `rootProject.ext`, a Gradle property
or a default, record where it resolves, not a guess.

- Android: `minSdkVersion`, `compileSdkVersion`, `targetSdkVersion`, `buildToolsVersion`,
  `ndkVersion`, Kotlin, AGP (`android/build.gradle`, `android/app/build.gradle`,
  `gradle.properties`) and Gradle (`gradle/wrapper/gradle-wrapper.properties`).
- iOS: `platform :ios` in the Podfile (and what `min_ios_version_supported` resolves to),
  `IPHONEOS_DEPLOYMENT_TARGET` for every target in `project.pbxproj` (app, extensions, tests), and
  the Xcode version the team builds with: `.xcode-version`, CI workflows (`xcode-version`,
  `xcodes`, `macos-*` runner images), Fastlane. If nothing pins it, say so.

## Step 3 — What each source requires

1. **React Native.** Read the target template:
   `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/release/<TARGET>/RnDiffApp/android/build.gradle`,
   the gradle wrapper next to it, and the template Podfile. Resolve `min_ios_version_supported`
   from `https://cdn.jsdelivr.net/npm/react-native@<TARGET>/scripts/cocoapods/helpers.rb`. Find the
   minimum Xcode for the target in React Native's release notes or CHANGELOG
   (`https://github.com/facebook/react-native/blob/main/CHANGELOG.md`).
2. **Libraries.** Look for the `audit-libraries` report of the same versions in the report folder
   (`~/rn-upgrade-reports/<repo>/audit-libraries-<FROM>-to-<TARGET>.md`, or next to REPORT_PATH).
   From its json block, take `globalConstraints` and every library's `native` values (minSdk,
   compileSdk, Kotlin, AGP, iOS deployment target) for the version it recommends. If there is no
   such report, write "libraries not checked: run audit-libraries" and go on. Never audit the
   libraries yourself.
3. **Stores**, read now, never from memory:
   - Google Play: `https://developer.android.com/google/play/requirements/target-sdk` — the target
     API level new apps and updates need, from which date, and any extension.
   - App Store: `https://developer.apple.com/news/upcoming-requirements/` — the Xcode and SDK
     uploads need, from which date, and any minimum deployment target.
   Quote each rule with its date and URL.

For each value, the **required** value is the highest one any source requires, and **required by**
names every source that sets it. When the current value already meets every source, the required
value is the current one (never write a lower number), and `required by` is empty.

## Step 4 — Platform behaviour changes

A change belongs in the report only when this upgrade causes it: a value that moves. Changes
the app already gets today, because its current SDK or Xcode already brings them, are out of scope.

1. **Android.** For every API level the target SDK crosses (current + 1 up to the required one),
   read `https://developer.android.com/about/versions/<N>/behavior-changes-<N>` (the changes for
   apps that target that level).
2. **iOS.** Only when the required Xcode is newer than the one the team builds with today, read the
   release notes of the SDK it brings, as JSON (the HTML pages are rendered in JavaScript):
   `https://developer.apple.com/tutorials/data/documentation/ios-ipados-release-notes/ios-ipados-<N>-release-notes.json`.
   Keep the changes that apply to apps linked against that SDK. If the team's Xcode is unknown,
   list them, say they apply only if the team builds with an older Xcode, and add an open question.
   When the deployment target moves, list what that does: the iOS versions the app stops
   supporting, and `#available`/`@available` checks that become dead code.
3. For every change, search the app under APP_ROOT (native code, `AndroidManifest.xml`,
   `Info.plist`, entitlements, and the JS screens when the change is about layout or navigation),
   excluding `node_modules`. Mark it `yes` (with file:line), `no` (say why: the API is not used, or
   the app already handles it), or `unknown`. An `unknown` needs an open question.

Only cite what you read. A change you could not check is `unknown`, never a guess.

## Step 5 — Verify

Run `git status --porcelain` again. It must match Step 1. If it does not, report what changed.

## Step 6 — Report

Write the report in Markdown with these sections:

1. **Summary**: for each platform, the values that move (`targetSdk 34 → 36`) or "nothing has to
   move"; then "N of M platform changes affect the app, K unknown".
2. **Targets**, one table per platform:
   `value | current | required | required by | evidence`.
3. **Store rules**: `platform | rule | date | met by the required values | URL`.
4. **Platform changes**, one table per platform:
   `version | change | affects | where in the app | evidence`. When nothing moves on a platform,
   write one sentence saying why and leave its table and its `changes` list empty: no placeholder rows.
5. **Open questions** for a human.
6. **Data**: a fenced `json` block with exactly this shape, for tools that read the report:
```json
{
  "schemaVersion": 1,
  "rn": { "from": "", "to": "" },
  "platforms": [{
    "platform": "android",
    "fields": [{ "name": "", "current": "", "required": "", "requiredBy": [""], "evidence": "" }],
    "store": [{ "rule": "", "date": "", "url": "", "met": true }],
    "changes": [{ "version": "", "summary": "", "affects": "yes", "files": [""], "evidence": "" }]
  }],
  "openQuestions": [""]
}
```
`platform` is `android` or `ios`. `affects` is `yes`, `no` or `unknown`. `met` is `true`, `false`
or `null` when it cannot be told. Values that come from the tables must match them.

Save the full report, all sections, to REPORT_PATH or, by default, to
`~/rn-upgrade-reports/<repo>/check-platform-targets-<FROM>-to-<TARGET>.md`, where `<repo>` is the
name of the repository's root folder. Expand `~` to the home folder, create missing folders, and
never save inside the repository. Then, unless HTML is `no`, run
`node "${CLAUDE_SKILL_DIR}/scripts/render-html.mjs" "<report path>"`: it writes a self-contained HTML
page next to the report and prints its path. Never write the HTML yourself.

Your final message is short: section 1 (Summary) and the open questions (section 5), then
`Report: <path>` and `HTML report: <path>`. If the report could not be saved, return the full report
instead and say why. If only the HTML failed, say so in one line.
