> **About this example.** Output of `apply-upgrade-diff` (v0.3.0) on
> [react-native-video](https://github.com/TheWidlarzGroup/react-native-video)'s `example/` app, at
> commit `52696ef5`. It was run in Claude Code by a general-purpose agent on Opus that followed
> `SKILL.md` exactly, not through `/rn-upgrade:apply-upgrade-diff`, whose agent runs on Sonnet. The
> report is unedited. The changes were left uncommitted; nothing was installed or built. The
> [HTML version](react-native-video-0.77.3-to-0.86.3.html) was rendered by the skill's bundled script.

# React Native upgrade diff report: `example` 0.77.3 → 0.86.3

## 1. Version used

- **FROM:** `0.77.3`, detected from what actually resolves: `bun.lock` (`"react-native": ["react-native@0.77.3", …]`) and `example/ios/Podfile.lock` (`React-Core (0.77.3)`). FROM_VERSION was not given. `example/package.json` declares the range `^0.77.0`.
- **TARGET:** `0.86.3`
- **Mismatches found:**
  - None between the resolved version and the requested base.
  - Partial earlier upgrade: the 0.76→0.77 upgrade (commit `950dde6a`, "chore(example): update react-native version") touched only iOS and `package.json`. Android still has 0.76-template values (`ndkVersion 26.1.10909125`, `kotlinVersion 1.9.24`), and the iOS project still has the `VideoExampleTests` target that the 0.77 template removed.
  - The repo is a bun workspace monorepo with `linker = "hoisted"`. The root, `test-app` and `packages/*` all pin React Native 0.77 and React 18 (see section 4).
- **Diff URL:** https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.77.3..0.86.3.diff
- **Identifiers used:**
  - `RnDiffApp` → `VideoExample`
  - `com.rndiffapp` → `com.twg.videoexample`
  - `com/rndiffapp` → `com/videoexample`. The source path differs from the package name.
  - Paths are prefixed with `example/`.
  - The app uses Kotlin and Swift, and is not Expo.

## 2. Files

| file | result | cause | evidence |
|---|---|---|---|
| `example/.gitignore` | applied clean | — | Adds `.kotlin/`. |
| `example/.prettierrc.js` | skipped | Not used | `example/` has no `.prettierrc.js`. Formatting comes from the repo's own setup (`eslint-plugin-prettier` in the root `package.json`). Does not affect the build. |
| `example/App.tsx` | skipped | Not used | `example/` has no `App.tsx`. The app entry is `example/index.js` → `src/App.tsx`, which is the project's own video demo, not the template's sample screen. |
| `example/Gemfile` | applied by hand | Base mismatch | The hunk's context line `gem 'concurrent-ruby', '< 1.3.4'` was never in this Gemfile. The file was created by `30d58d3a` (chore(infra): move to monorepo) without it. Only the Ruby 3.4 gems were added. |
| `example/android/app/build.gradle` | applied clean | — | Comment updates (`debugOptimized`) and `jscFlavor` → `io.github.react-native-community:jsc-android:2026004.+`. The custom `reactNativeDir`/`codegenDir`/`cliFile` paths are untouched. |
| `example/android/app/src/debug/AndroidManifest.xml` | applied clean | — | Deleted; identical to the template. Its `usesCleartextTraffic="true"` now comes from the `${usesCleartextTraffic}` placeholder in the main manifest. The RN Gradle Plugin 0.86.3 sets it to `true` for debug/debugOptimized and `false` for release (`AgpConfiguratorUtils.kt` lines 39–45). |
| `example/android/app/src/main/AndroidManifest.xml` | applied by hand | Customized | `android:supportsPictureInPicture="true"` sits between `theme` and `supportsRtl` (manifest line 15, commit `c165dfb3`, feat: add fullscreen & Picture in Picture API (#7)), so the context did not match. The placeholder attribute was added and the PiP attributes kept. |
| `example/android/app/src/main/java/com/videoexample/MainApplication.kt` | applied clean | Diff artifact: whitespace | The project file is byte-identical to the 0.77.3 template (verified by diff). The patch applied only with `--ignore-whitespace`, which left misaligned indentation. Indentation was normalized to the 0.86.3 template file; `package com.twg.videoexample` is kept. |
| `example/android/build.gradle` | applied by hand | Base mismatch | `ndkVersion "26.1.10909125"` / `kotlinVersion "1.9.24"` are 0.76-template values from `30d58d3a` (blame lines 7–8), so the hunk context failed. The 0.77 Android update was skipped in `950dde6a`. The file now equals the 0.86.3 template: build-tools 36.0.0, compile/target SDK 36, NDK 27.1.12297006, Kotlin 2.1.20. |
| `example/android/gradle.properties` | applied clean | — | Adds `edgeToEdgeEnabled=false` (offset +3 because of the project's `#useExoplayerHls`/`#useExoplayerDash` lines). |
| `example/android/gradle/wrapper/gradle-wrapper.jar` | applied clean | — | Binary patch applied. `git hash-object` = `61285a659d17295f1de7c53e24fdf13ad755c379`, which matches the diff's new index and the jar downloaded from `release/0.86.3`. |
| `example/android/gradle/wrapper/gradle-wrapper.properties` | applied clean | — | Gradle 8.10.2-all → 9.3.1-bin. |
| `example/android/gradlew` | applied clean | — | Switches to `-jar gradle-wrapper.jar`; the executable bit is kept. |
| `example/android/gradlew.bat` | applied by hand | Diff artifact: line endings | The file uses CRLF and the diff uses LF. Edited by hand keeping CRLF; the content now equals the 0.86.3 template (compared with CR stripped). |
| `example/ios/Podfile` | applied clean | — | Removes the stale comment line (offset +8). The project's `RCT_NEW_ARCH_ENABLED`, `USE_FRAMEWORKS` and `fmt` C++17 post_install hook are untouched. |
| `example/ios/VideoExample.xcodeproj/project.pbxproj` | applied by hand | Customized / Base mismatch | The project still has the full `VideoExampleTests` target (pbxproj lines 146–163, 317–324, 344–392; from `30d58d3a`). The context also differs (extra `VideoExampleTests.m` build file, bridging header, `.pip` bundle id). Applied by hand: the quoted `shellScript` in "Bundle React Native code and images", plus `SUPPORTED_PLATFORMS` and `TARGETED_DEVICE_FAMILY = "1,2"` in the app's Debug and Release configs. Left unapplied pending a decision: 4 hunks that delete test-target objects (`PBXContainerItemProxy`, the Supporting Files group with its Info.plist ref, the test Resources phase, `PBXTargetDependency`), because the live test target still references them (see section 4). `plutil -lint` OK. |
| `example/ios/VideoExample/AppDelegate.swift` | applied by hand | Diff artifact: whitespace | Apart from its Xcode header comment (`950dde6a`), the body is identical to the 0.77.3 template. The diff's context line shows `}` where the template has `  }`, so it failed even with `--ignore-whitespace`. Replaced the body with the 0.86.3 template (`RCTReactNativeFactory` + `ReactNativeDelegate`, module name `VideoExample`) and kept the header. |
| `example/ios/VideoExample/Info.plist` | applied clean | — | Adds `CADisableMinimumFrameDurationOnPhone`. It also **restricts iPhone to portrait only** and moves landscape to `~ipad`. This app has fullscreen video, so see section 4. `plutil -lint` OK. |
| `example/jest.config.js` | skipped | Not used | `example/` has no jest setup and no `jest.config.js`. |
| `example/package.json` | applied by hand | Customized | Special case, applied by intent: RN, React, `@react-native/*`, CLI and tooling were bumped; the lockstep `react-dom` and `@types/react` were bumped; every other package was kept. Details in section 3. |
| `example/tsconfig.json` | applied by hand | Customized | The project uses an `extends` array with `../config/tsconfig.json`, its own `include` and `compilerOptions` (`30d58d3a`, `501be406`). Only the template's key change was applied: `@react-native/typescript-config/tsconfig.json` → `@react-native/typescript-config`. 0.86.3 adds an `exports` map (`"."`, `"./strict"`) that 0.77.3 did not have, so the old subpath no longer resolves. The template's jest `types`/`include`/`exclude` were not added. |

**Count per result (21 files):** applied clean: 10 · applied by hand: 8 · skipped: 3 · needs human: 0

## 3. Hunks applied by hand

- **`example/Gemfile`:** appended the template's block: comment, then `bigdecimal`, `logger`, `benchmark`, `mutex_m`, `nkf`. This is the hunk's only change (Ruby 3.4 compatibility). The missing context line `concurrent-ruby` was not added because the diff does not add it.
- **`example/android/app/src/main/AndroidManifest.xml`:** inserted `android:usesCleartextTraffic="${usesCleartextTraffic}"` into `<application>` after `supportsPictureInPicture`. Same attribute and value as the template, so the deleted debug manifest is replaced by the RNGP placeholder (debug = true, release = false).
- **`example/android/build.gradle`:** set `buildToolsVersion "36.0.0"`, `compileSdkVersion 36`, `targetSdkVersion 36`, `kotlinVersion "2.1.20"`, and `ndkVersion "27.1.12297006"`. The NDK line is not changed by this diff, but the target template requires it and the project was stuck on the 0.76 value. The file is now identical to the 0.86.3 template's `android/build.gradle`.
- **`example/android/gradlew.bat`:** added the Meta copyright header, removed `set CLASSPATH=…`, and switched the java invocation to `-jar "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar"`. CRLF is preserved; the content equals the 0.86.3 template.
- **`example/ios/VideoExample.xcodeproj/project.pbxproj`:**
  - Replaced the bundle phase's `shellScript` with the template's quoted form (`/bin/sh -c "\"$WITH_ENVIRONMENT\" \"$REACT_NATIVE_XCODE\""`), so paths with spaces work. The line is identical to the 0.86.3 template.
  - Added `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"` and `TARGETED_DEVICE_FAMILY = "1,2"` to the VideoExample target's Debug and Release configs, keeping the project's bridging header, `DEVELOPMENT_TEAM` and `.pip` bundle-id override.
  - Did not regenerate the file.
- **`example/ios/VideoExample/AppDelegate.swift`:** replaced the `RCTAppDelegate` subclass with the 0.86.3 template's `UIResponder, UIApplicationDelegate` + `RCTReactNativeFactory` + `ReactNativeDelegate` (`sourceURL`/`bundleURL` overrides moved into it), with module name `"VideoExample"`. The project's header comment is kept. The project had no other AppDelegate customizations: its body was byte-identical to the 0.77.3 template.
- **`example/package.json`:**
  - `react` 18.3.1 → 19.2.3
  - `react-native` `^0.77.0` → `^0.86.3`
  - `@react-native-community/cli`, `cli-platform-android` and `cli-platform-ios` 15.0.1 → 20.1.0
  - `@react-native/babel-preset`, `eslint-config`, `metro-config` and `typescript-config` `^0.77.0` → `^0.86.3`
  - `typescript` `^5.2.2` → `^5.8.3`
  - `engines.node` `>=18` → `>= 22.11.0`
  - Lockstep: `react-dom` 18.3.1 → 19.2.3 and `@types/react` `^18.2.44` → `^19.2.0`.
  - The project's caret style was kept for RN packages (the template pins exact `0.86.3`).
  - Not downgraded: `eslint ^8.51.0` (template `^8.19.0`) and `prettier ^3.0.3` (template `2.8.8`).
  - Not added, because only the template's sample/test setup uses them: `@react-native/new-app-screen`, `react-native-safe-area-context`, `@react-native/jest-preset`, `jest`, `@types/jest`, `react-test-renderer`, `@types/react-test-renderer`.
  - Not touched (third-party): `react-native-web`, `babel-plugin-react-native-web`, `@react-native-community/slider`, `react-native-nitro-modules`, webpack tooling.
- **`example/tsconfig.json`:** changed the first `extends` entry to `"@react-native/typescript-config"`. That is the template's change and the only path the 0.86.3 package exports. Everything else in the project's config is kept.

## 4. Open questions for a human

1. **iPhone orientations (clean hunk that restricts something the app relies on):** `example/ios/VideoExample/Info.plist` now allows only `UIInterfaceOrientationPortrait` on iPhone; landscape moved to `UISupportedInterfaceOrientations~ipad`. The example demos fullscreen playback: `example/src/App.tsx:52-55` (`handleFullscreenChange`), `:170` (`onFullscreenChange`) and `:415-418` ("Enter Fullscreen" → `enterFullscreen()`), backed by `packages/react-native-video/ios/core/Extensions/AVPlayerViewController+Fullscreen.swift`. The previous landscape entries came from `30d58d3a`. Should iPhone keep `LandscapeLeft`/`LandscapeRight` so fullscreen video can rotate?
2. **VideoExampleTests target (4 pbxproj hunks left unapplied):** the 0.77+ template no longer has an iOS test target, and 0.86.3 deletes its leftover objects. This project still has a live `VideoExampleTests` target: pbxproj lines 146–163, the `ios/VideoExampleTests/` folder, and the TestAction in `VideoExample.xcscheme` lines 36–37. No CI workflow references it. Deleting only the leftover objects would leave the target with dangling references. Should the whole test target (target, group, products entry, build configs, scheme TestAction, `ios/VideoExampleTests/`) be removed in Xcode, or kept as is?
3. **Lockstep package needing a third-party upgrade:** `react-native-web ^0.19.13` has peer `react ^18.0.0`/`react-dom ^18.0.0` and does not support React 19.2.3. The first line that supports `^19` is 0.21.x, together with `babel-plugin-react-native-web`. The web build (`example/web/webpack.config.js`) needs this upgrade. Upgrade both to 0.21.x?
4. **Workspace version conflicts (build blocker):**
   - Other workspaces still pin React Native 0.77 and React 18:
     - root `package.json`: `react 18.3.1`, `react-native ^0.77.0`, `@react-native/eslint-config ^0.77.0`, `@types/react ^18.2.44`
     - `test-app/package.json`: `react 18.3.1`, `react-native 0.77.3`, `@react-native/* 0.77.3`, CLI `15.0.1`
     - `packages/react-native-video/package.json` devDeps: `react 18.3.1`, `react-native ^0.77.0`
     - `packages/drm-plugin/package.json` devDeps: `react 18.3.1`, `react-native ^0.77.0`, `@react-native/babel-preset 0.79.2`
     - `docs` uses `react ^19`
   - With `bunfig.toml` `linker = "hoisted"`, the repo-root `node_modules/react-native` will stay on 0.77.x and 0.86.3 will be nested under `example/node_modules`.
   - The example's Android build reads the root copy: `example/android/settings.gradle` lines 1 and 6, `includeBuild('../../node_modules/@react-native/gradle-plugin')`; and `example/android/app/build.gradle` `reactNativeDir`/`codegenDir`/`cliFile = file("../../../node_modules/…")`. So it would build against 0.77 native code with a 0.86 JS bundle.
   - The Podfile's `require.resolve` from `example/ios` would find `example/node_modules` first (0.86), so iOS and Android would diverge.
   - React 18 (root) next to React 19 (example) also risks duplicate React at runtime, since Metro watches the root.
   - Decide: bump the root, `test-app` and the `packages/*` devDeps in the same change, or point the example's native paths at `example/node_modules`?
5. **Android target SDK 36 / edge-to-edge:** raising `targetSdkVersion` to 36 makes Android 15+ enforce edge-to-edge, and Android 16 ignores the opt-out. `edgeToEdgeEnabled=false` in `gradle.properties` only stops React Native from enabling it; it does not stop the OS. Check that the example's controls and PiP/fullscreen UI are not drawn under the system bars. Is that acceptable, or should insets handling be added?
6. **Gemfile `concurrent-ruby` pin:** both the 0.77.3 and 0.86.3 templates pin `gem 'concurrent-ruby', '< 1.3.4'` (it avoids an ActiveSupport/Logger crash in CocoaPods), but this Gemfile never had it. Add it too?

## 5. Next steps (out of scope)

- Run `bun install` to refresh `bun.lock` after the workspace versions are aligned (question 4).
- Run `bundle install` and `bun example pods` (`pod install`) to regenerate `example/ios/Podfile.lock`.
- Upgrade the third-party libraries for RN 0.86 / React 19: `react-native-web` and `babel-plugin-react-native-web`, `@react-native-community/slider`, `react-native-nitro-modules`.
- Fix JS/config breakage from the new tooling. One known break: `example/metro.config.js:4` requires `metro-config/src/defaults/exclusionList`, but `metro-config@0.84` only exports `./private/*`, so that path will throw. `blacklistRE` is also deprecated in favour of `blockList`.
- Build and run Android (Gradle 9.3.1, AGP for SDK 36, NDK 27.1, Kotlin 2.1.20), iOS (Xcode) and the web target, then smoke-test fullscreen, PiP and background audio.

## 6. Data

```json
{
  "schemaVersion": 1,
  "rn": { "from": "0.77.3", "to": "0.86.3" },
  "diffUrl": "https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.77.3..0.86.3.diff",
  "summary": { "files": 21, "byResult": { "applied clean": 10, "applied by hand": 8, "skipped": 3, "needs human": 0 } },
  "files": [
    { "file": "example/.gitignore", "result": "applied clean", "cause": "", "evidence": "Adds .kotlin/." },
    { "file": "example/.prettierrc.js", "result": "skipped", "cause": "Not used", "evidence": "example/ has no .prettierrc.js; does not affect the build." },
    { "file": "example/App.tsx", "result": "skipped", "cause": "Not used", "evidence": "No example/App.tsx; entry is index.js -> src/App.tsx (project's own demo)." },
    { "file": "example/Gemfile", "result": "applied by hand", "cause": "Base mismatch", "evidence": "Context line concurrent-ruby never present; file created in 30d58d3a (chore(infra): move to monorepo). Added Ruby 3.4 gems only." },
    { "file": "example/android/app/build.gradle", "result": "applied clean", "cause": "", "evidence": "Comment updates and jscFlavor -> io.github.react-native-community:jsc-android:2026004.+; custom reactNativeDir/codegenDir/cliFile untouched." },
    { "file": "example/android/app/src/debug/AndroidManifest.xml", "result": "applied clean", "cause": "", "evidence": "Deleted; replaced by ${usesCleartextTraffic} placeholder set by RNGP 0.86.3 (AgpConfiguratorUtils.kt:39-45)." },
    { "file": "example/android/app/src/main/AndroidManifest.xml", "result": "applied by hand", "cause": "Customized", "evidence": "supportsPictureInPicture at line 15 (c165dfb3, feat: add fullscreen & Picture in Picture API (#7)) broke context; placeholder attribute added." },
    { "file": "example/android/app/src/main/java/com/videoexample/MainApplication.kt", "result": "applied clean", "cause": "Diff artifact: whitespace", "evidence": "File identical to 0.77.3 template; applied with --ignore-whitespace, indentation normalized to 0.86.3 template." },
    { "file": "example/android/build.gradle", "result": "applied by hand", "cause": "Base mismatch", "evidence": "ndk 26.1.10909125 / kotlin 1.9.24 are 0.76 values from 30d58d3a (lines 7-8); 0.77 Android update skipped in 950dde6a. File now equals 0.86.3 template." },
    { "file": "example/android/gradle.properties", "result": "applied clean", "cause": "", "evidence": "Adds edgeToEdgeEnabled=false (offset +3)." },
    { "file": "example/android/gradle/wrapper/gradle-wrapper.jar", "result": "applied clean", "cause": "", "evidence": "git hash-object 61285a659d17295f1de7c53e24fdf13ad755c379 matches diff index and release/0.86.3 jar." },
    { "file": "example/android/gradle/wrapper/gradle-wrapper.properties", "result": "applied clean", "cause": "", "evidence": "Gradle 8.10.2-all -> 9.3.1-bin." },
    { "file": "example/android/gradlew", "result": "applied clean", "cause": "", "evidence": "Switches to -jar gradle-wrapper.jar; exec bit kept." },
    { "file": "example/android/gradlew.bat", "result": "applied by hand", "cause": "Diff artifact: line endings", "evidence": "CRLF file vs LF diff; edited by hand keeping CRLF; content equals 0.86.3 template." },
    { "file": "example/ios/Podfile", "result": "applied clean", "cause": "", "evidence": "Removes stale comment (offset +8); project's new-arch, USE_FRAMEWORKS and fmt c++17 hook untouched." },
    { "file": "example/ios/VideoExample.xcodeproj/project.pbxproj", "result": "applied by hand", "cause": "Customized / Base mismatch", "evidence": "Live VideoExampleTests target (lines 146-163, from 30d58d3a) and project customizations broke context. Applied shellScript quoting + SUPPORTED_PLATFORMS + TARGETED_DEVICE_FAMILY; 4 test-target deletion hunks left unapplied pending decision. plutil OK." },
    { "file": "example/ios/VideoExample/AppDelegate.swift", "result": "applied by hand", "cause": "Diff artifact: whitespace", "evidence": "Body identical to 0.77.3 template (header comment from 950dde6a); diff context has '}' where template has '  }'. Body replaced with 0.86.3 template, header kept." },
    { "file": "example/ios/VideoExample/Info.plist", "result": "applied clean", "cause": "", "evidence": "Adds CADisableMinimumFrameDurationOnPhone; restricts iPhone to portrait (fullscreen video relies on landscape, see open questions). plutil OK." },
    { "file": "example/jest.config.js", "result": "skipped", "cause": "Not used", "evidence": "example/ has no jest setup." },
    { "file": "example/package.json", "result": "applied by hand", "cause": "Customized", "evidence": "Bumped RN/react/@react-native/*/CLI/typescript/engines and lockstep react-dom, @types/react; kept all other packages; no downgrades; no sample-only packages added." },
    { "file": "example/tsconfig.json", "result": "applied by hand", "cause": "Customized", "evidence": "extends array + ../config/tsconfig.json (30d58d3a, 501be406); changed extends to @react-native/typescript-config (0.86.3 exports only '.' and './strict')." }
  ],
  "handApplied": [
    { "file": "example/Gemfile", "change": "Appended bigdecimal, logger, benchmark, mutex_m, nkf gems with template comment.", "why": "Only change in the hunk (Ruby 3.4 compatibility); context line concurrent-ruby absent in project." },
    { "file": "example/android/app/src/main/AndroidManifest.xml", "change": "Added android:usesCleartextTraffic=\"${usesCleartextTraffic}\" to <application>, kept PiP attributes.", "why": "Same attribute as template; replaces deleted debug manifest via RNGP placeholder." },
    { "file": "example/android/build.gradle", "change": "buildTools 36.0.0, compileSdk 36, targetSdk 36, kotlin 2.1.20, ndk 27.1.12297006.", "why": "File now identical to 0.86.3 template; project was on 0.76 values." },
    { "file": "example/android/gradlew.bat", "change": "Added Meta header, removed CLASSPATH, switched to -jar gradle-wrapper.jar; kept CRLF.", "why": "Content equals 0.86.3 template; line endings preserved." },
    { "file": "example/ios/VideoExample.xcodeproj/project.pbxproj", "change": "Quoted bundle-phase shellScript; added SUPPORTED_PLATFORMS and TARGETED_DEVICE_FAMILY \"1,2\" to app Debug/Release; test-target deletions left unapplied.", "why": "Same build settings and script as the 0.86.3 template; test target still live in project." },
    { "file": "example/ios/VideoExample/AppDelegate.swift", "change": "Replaced RCTAppDelegate subclass with RCTReactNativeFactory + ReactNativeDelegate, module VideoExample; kept header comment.", "why": "Project body was byte-identical to 0.77.3 template; result equals 0.86.3 template." },
    { "file": "example/package.json", "change": "react/react-dom 19.2.3, react-native and @react-native/* ^0.86.3, CLI 20.1.0, @types/react ^19.2.0, typescript ^5.8.3, node >= 22.11.0.", "why": "Template versions plus React lockstep packages; project's other packages and caret style kept; no downgrades." },
    { "file": "example/tsconfig.json", "change": "extends[0] -> \"@react-native/typescript-config\".", "why": "Template's change; 0.86.3 package exports only '.' so the old subpath no longer resolves." }
  ],
  "openQuestions": [
    "Info.plist now allows only portrait on iPhone, but the example demos fullscreen video (example/src/App.tsx:52-55,170,415-418; AVPlayerViewController+Fullscreen.swift). Restore LandscapeLeft/LandscapeRight for iPhone?",
    "The project still has a live VideoExampleTests target (pbxproj lines 146-163, ios/VideoExampleTests/, scheme lines 36-37) that the 0.77+ template removed; 4 pbxproj hunks deleting its leftover objects were left unapplied. Remove the whole test target in Xcode, or keep it?",
    "react-native-web ^0.19.13 (and babel-plugin-react-native-web) peers react ^18 and does not support React 19.2.3; 0.21.x is needed for the web build. Upgrade?",
    "Workspace conflicts: root package.json (react 18.3.1, react-native ^0.77.0, @react-native/eslint-config ^0.77.0, @types/react ^18.2.44), test-app (react 18.3.1, react-native 0.77.3, @react-native/* 0.77.3, CLI 15.0.1), packages/react-native-video and packages/drm-plugin devDeps (react 18.3.1, react-native ^0.77.0; drm-plugin @react-native/babel-preset 0.79.2). With bun linker=hoisted, example/android/settings.gradle (lines 1,6) and app/build.gradle reactNativeDir/codegenDir/cliFile read the root node_modules (0.77), while the Podfile resolves example/node_modules first: build blocker and duplicate React risk. Bump all workspaces together, or repoint the native paths?",
    "targetSdk 36 makes Android 15+/16 enforce edge-to-edge even with edgeToEdgeEnabled=false; check the example's controls/PiP/fullscreen UI for overlap with system bars. Acceptable, or add insets handling?",
    "Both templates pin gem 'concurrent-ruby', '< 1.3.4' but example/Gemfile never had it. Add it?"
  ],
  "nextSteps": [
    "bun install to refresh bun.lock (after aligning workspace versions)",
    "bundle install and bun example pods to regenerate example/ios/Podfile.lock",
    "Upgrade third-party libraries for RN 0.86 / React 19 (react-native-web, babel-plugin-react-native-web, @react-native-community/slider, react-native-nitro-modules)",
    "Fix JS/config breakage, e.g. example/metro.config.js:4 requires metro-config/src/defaults/exclusionList, which metro-config 0.84 no longer exports",
    "Build and run Android, iOS and web; smoke-test fullscreen, PiP and background audio"
  ]
}
```
