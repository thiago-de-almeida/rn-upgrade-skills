> **About this example.** Real output of `apply-upgrade-diff` (v0.1.2) on
> [react-native-video](https://github.com/TheWidlarzGroup/react-native-video)'s `example/` app, at
> commit `52696ef5`, run with `/rn-upgrade:apply-upgrade-diff 0.86.3 example`.
> An independent review checked every changed file against the 0.86.3 template and found no wrong
> or missing change. Edits after that review: local paths removed, two line numbers corrected
> (`settings.gradle`, `metro.config.js`), item 10 rewritten (it was wrong), one cause relabeled
> (`MainApplication.kt`), results normalized to the skill's four values, and the Android
> manifest-merge consequence added to item 1. Nothing was built.

# Upgrade report: example app, React Native 0.77.3 → 0.86.3

## 1. Version used
- **FROM:** 0.77.3, detected. No FROM was passed in, so there is no mismatch to flag.
  - `bun.lock:3311` resolves `react-native@0.77.3`, and `example/ios/Podfile.lock` has `React-Core (0.77.3)` at line 73.
  - `node_modules` is not installed, so the lockfiles were the source. The `^0.77.0` in `package.json` was not used.
- **TARGET:** 0.86.3.
- **Diff URL:** `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.77.3..0.86.3.diff` (HTTP 200, 21 files).
- **Placeholders mapped:**
  - App name: `RnDiffApp` → `VideoExample`.
  - Android package: `com.rndiffapp` → `com.twg.videoexample`. The source folder is `com/videoexample`, so the folder and the package name differ.
- **Project shape:** Kotlin and Swift, bun monorepo with `example` as a workspace, not Expo.
- **Branch and tree:** the working tree was clean on `chore/example-rn-0.86.3`.

## 2. Per-file table

| file | result | cause | evidence |
|---|---|---|---|
| `.gitignore` | applied clean | n/a | `example/.gitignore` +1 line (`.kotlin/`) |
| `.prettierrc.js` | skipped | Not used | `example/` has no `.prettierrc.js` |
| `App.tsx` | skipped | Not used | the app entry is `example/src/App.tsx` and `index.js` registers it |
| `Gemfile` | applied by hand | Base mismatch | file created in `30d58d3a` (monorepo move) without the template's `concurrent-ruby` line, so the hunk context failed |
| `android/app/build.gradle` | applied clean | n/a | only comments and the `jscFlavor` string changed |
| `android/app/src/debug/AndroidManifest.xml` | applied clean | n/a (file deleted) | the project's copy was identical to the template. The RN Gradle plugin now supplies the `usesCleartextTraffic` placeholder (checked in `AgpConfiguratorUtils.kt` at v0.86.3) |
| `android/app/src/main/AndroidManifest.xml` | applied by hand | Customized | the project's PiP and foreground-service attributes sit between the context lines; see §3 |
| `…/MainApplication.kt` | applied by hand | Diff artifact: whitespace | the project's file is identical to the 0.77.3 template; the helper diff's context is indented differently; see §3 |
| `android/build.gradle` | applied by hand | Base mismatch | `ndkVersion` 26.1 and `kotlinVersion` 1.9.24 have been there since `30d58d3a`, not the 0.77.3 values |
| `android/gradle.properties` | applied clean | n/a | adds `edgeToEdgeEnabled=false` |
| `android/gradle/wrapper/gradle-wrapper.jar` | applied by hand | Binary | downloaded from `release/0.86.3`; `git hash-object` gives `61285a65…`, matching the diff's `index` line |
| `android/gradle/wrapper/gradle-wrapper.properties` | applied clean | n/a | `gradle-8.10.2-all.zip` → `gradle-9.3.1-bin.zip` |
| `android/gradlew` | applied clean | n/a | mode 755 kept |
| `android/gradlew.bat` | applied by hand | Customized (line endings) | the file is CRLF (94 lines) and the patch is LF, so `git apply` rejected it |
| `ios/Podfile` | applied clean | n/a | removes one comment line |
| `ios/VideoExample.xcodeproj/project.pbxproj` | applied by hand | Customized | the project still has a live test target; see §3 |
| `ios/VideoExample/AppDelegate.swift` | applied by hand | Customized (header comment) | the project has an 8-line header comment the template lacks; the rest matched 0.77.3 |
| `ios/VideoExample/Info.plist` | applied clean | n/a | removes iPhone landscape; flagged in §4 |
| `jest.config.js` | skipped | Not used | `example/` has no jest dependency or config |
| `package.json` | applied by hand | Base mismatch / monorepo | see §3 |
| `tsconfig.json` | applied by hand | Customized | the project extends an array plus `../config/tsconfig.json` |

## 3. Hunks applied by hand
- **`Gemfile`:** appended the Ruby 3.4 block (`bigdecimal`, `logger`, `benchmark`, `mutex_m`, `nkf`). The project never had the `concurrent-ruby` pin, and the diff does not touch it, so I left it out.
- **`AndroidManifest.xml` (main):** added `android:usesCleartextTraffic="${usesCleartextTraffic}"` after `android:theme`. The project's `supportsPictureInPicture` attributes, background-audio permissions and `VideoPlaybackService` are untouched. That service entry was added in `235bc3be`.
- **`MainApplication.kt`:** the project's file is byte-identical to the 0.77.3 template after substitution. The helper diff's context is indented 4 spaces less than the release file, so `git apply` failed (it passes with `--ignore-whitespace`). I wrote the 0.86.3 template content with `package com.twg.videoexample`.
- **`AppDelegate.swift`:** kept the project's 8-line header comment and wrote the 0.86.3 template body. The two files differ only by that header comment; the body is the new `UIResponder`/`RCTReactNativeFactory` structure.
- **`android/build.gradle`:**
  - `buildToolsVersion` → "36.0.0".
  - `compileSdkVersion` → 36.
  - `targetSdkVersion` 34 → 36.
  - `ndkVersion` → "27.1.12297006". This matches `RNVideo_ndkversion` in the library's `gradle.properties`.
  - `kotlinVersion` → "2.1.20". The library accepts any Kotlin version at or above 1.8.0 (`RNVideo_minKotlinVersion`).
- **`gradlew.bat`:** edited with a script that keeps CRLF. I added the 4-line Meta header, removed the `set CLASSPATH` line, and switched to `-jar "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar"`.
- **`project.pbxproj`:** I never regenerated it, and `plutil -lint` passes.
  - Applied the `shellScript` quoting change on the bundle phase.
  - Added `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"` and `TARGETED_DEVICE_FAMILY = "1,2"` to the app target Debug and Release.
  - Deliberately skipped the hunks that delete the test target pieces. `git apply --reject` had already removed the `00E356EC…` Resources phase, so I reverted that. The `VideoExampleTests` target is live: the scheme has a `TestableReference` for it, and the target depends on `00E356F51…`.
- **`package.json`** (`react-dom` is not in the template but moved with `react`; each bullet is a change I made):
  - `react` and `react-dom` → 19.2.3.
  - `react-native` → 0.86.3, pinned exactly as in the template.
  - `@react-native/{babel-preset,eslint-config,metro-config,typescript-config}` → 0.86.3.
  - The three `@react-native-community/cli*` packages → 20.1.0.
  - `@types/react` → ^19.2.0.
  - `typescript` → ^5.8.3.
  - `engines.node` → ">= 22.11.0".
  - Left alone: `prettier` (template pins 2.8.8, project uses ^3.0.3), `eslint`, and the webpack and web-only packages.
  - Not added: `@react-native/new-app-screen`, `react-native-safe-area-context`, `@react-native/jest-preset`, `@types/jest` and the other jest or template-app-only packages. The example has no jest and its own `App.tsx`.
- **`tsconfig.json`:** `"@react-native/typescript-config/tsconfig.json"` → `"@react-native/typescript-config"`. That package now has `exports` with only `.` and `./strict` (checked on npm for 0.86.3), so the subpath no longer resolves. I kept the project's `include` and `types`.

## 4. Needs a human
1. **Build blocker, hoisted `react-native`.** Root, `packages/react-native-video`, `packages/drm-plugin` and `test-app` stay on 0.77 (`test-app` pins 0.77.3 exactly), and I did not change them. The native builds resolve `react-native` from the hoisted root `node_modules`:
   - Android: `example/android/settings.gradle:1` and `:6`, plus `reactNativeDir`, `codegenDir`, `cliFile` and `hermesCommand` in `example/android/app/build.gradle`.
   - After a bun install, `example` will likely have a nested 0.86.3 while Gradle reads the hoisted 0.77.3, and CocoaPods may read the nested 0.86.3. That means native builds are likely to mix versions.
   - iOS: the Podfile resolves `react-native` from `__dir__` (`example/ios`) upward, which is why CocoaPods may pick a different version than Gradle. This is likely, not confirmed, because nothing is installed yet.
   - The new `${usesCleartextTraffic}` placeholder in the main manifest is only supplied by the 0.86 Gradle plugin (0.77.3's `AgpConfiguratorUtils.kt` has none), so with the hoisted 0.77.3 plugin the Android manifest merge will fail.
   - Decide whether to bump the other workspaces or repoint the paths.
2. **`react-native-web` ^0.19.13 (peer `react ^18`) conflicts with React 19.2.3.** I did not upgrade it. npm shows 0.21.3 accepts React 18 or 19 (not tested against the web build). The example's web target is `example/web/webpack.config.js`.
3. **Info.plist now drops iPhone landscape.** The template hunk applied clean and removes `LandscapeLeft` and `LandscapeRight` for iPhone. The orientations came from the monorepo move (`30d58d3a`). The app has a fullscreen player (`example/src/App.tsx:52`) and the library has `AVPlayerViewController+Fullscreen.swift`. The library's iOS code never forces an orientation, so fullscreen landscape on iPhone depends on this list. Restore them if landscape fullscreen should work.
4. **Android `targetSdkVersion` 36 and `edgeToEdgeEnabled=false`.** Both are template values and both applied. The app uses PiP (`supportsPictureInPicture` in the manifest) and fullscreen, so check system-bar and edge-to-edge behavior on Android 16.
5. **Kotlin 2.1.20 with the library.** The library accepts any Kotlin version at or above 1.8.0, but its default is 1.9.24. It has not been compiled with 2.1 here.
6. **iOS test target.** The template removed it, but the project keeps `VideoExampleTests`, referenced from the scheme. Decide whether to keep it or remove the whole target.
7. **Stale Podfile TODO.** The fmt C++17 workaround says "remove after updating RN to 0.84 or later" (`Podfile`, post_install). It is now on 0.86; re-test before removing. `ENV['RCT_NEW_ARCH_ENABLED'] = '1'` in the Podfile also looks redundant, because `react_native_pods.rb` already sets it to "1" when unset. Neither was changed.
8. **Node 22.11+.** The new engines value will fail on older Node. I did not find a Node version pin in `.github/workflows/*.yml` or `.github/actions/*/action.yml`.
9. **`metro.config.js` imports `metro-config/src/defaults/exclusionList`** (`example/metro.config.js:4`). That deep import may not survive the newer Metro; I did not check it. It is a JS fix, so it is out of scope.
10. **Cleartext traffic.** The debug manifest is deleted; the RN Gradle plugin now sets `usesCleartextTraffic` to true for debug/debugOptimized and false for release, the same effective behavior as before. I found no `http://` URLs in `example/src`.

## 5. Out of scope, still to do
- Reconcile the workspace versions (item 1), then run `bun install` and refresh `bun.lock`.
- Run `bundle install` and `pod install`.
- Upgrade the third-party libraries: `react-native-web`, plus a compatibility check of `react-native-nitro-modules` 0.35.0 and `@react-native-community/slider` against RN 0.86.
- Fix any JS or native breakage, then build and run on both platforms.

## Verification
- No `.rej` or `.orig` files and no conflict markers remain.
- No `RnDiffApp`, `rndiffapp` or `HelloWorld` strings in the added lines.
- `package.json` and `tsconfig.json` parse as JSON.
- `plutil -lint` passes on `Info.plist` and `project.pbxproj`.
- `git diff --stat` matches the table: 18 files changed, 98 insertions, 82 deletions. The other three diff files were skipped.

## Counts, from the table
- Applied clean: 8
- Applied by hand: 10
- Skipped: 3
- Needs human (left unapplied): 0
- Total: 21

The 10 open questions are in §4.
