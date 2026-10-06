> **About this example.** Output of `apply-upgrade-diff` (v0.1.3) on
> [react-native-video](https://github.com/TheWidlarzGroup/react-native-video)'s `example/` app, at
> commit `52696ef5`, run in Claude Code with `/rn-upgrade:apply-upgrade-diff 0.86.3 example`.
> The only edits are the removal of the agent's local scratch-file paths and of a line about the
> session's local state. The changes were left uncommitted; nothing was installed or built.

# React Native Upgrade Helper diff applied to `example/` (0.77.3 → 0.86.3)

## 1. Version used

- **FROM was not given, so I detected it.**
  - `bun.lock` resolves `react-native` to 0.77.3 (line 3311).
  - `example/ios/Podfile.lock:73` has `React-Core (0.77.3)`.
  - `example/package.json` said `^0.77.0`, and no `node_modules` is installed.
  - FROM is therefore 0.77.3, and there was no mismatch to flag.
- **TARGET:** 0.86.3.
- **Diff URL:** `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.77.3..0.86.3.diff`. It downloaded fine.
- **Identifiers used:**
  - iOS app and Xcode project: `VideoExample`.
  - Android namespace and applicationId: `com.twg.videoexample`.
  - Source directory: `com/videoexample` (it does not match the package name).
  - Kotlin and Swift. This is not Expo.
  - The app lives in the `example/` workspace of a bun monorepo.

## 2. Per-file results (21 files in the diff)

| file | result | cause | evidence |
|---|---|---|---|
| `.gitignore` | applied clean | none | adds `.kotlin/` |
| `.prettierrc.js` | skipped | Not used | `example/.prettierrc.js` does not exist. It was deleted in `4ba3b7a6` "chore: publish package". No prettier config exists in the repo. |
| `App.tsx` | skipped | Not used | `example/App.tsx` does not exist; the app is `example/src/App.tsx`. |
| `Gemfile` | applied by hand | Base mismatch | The project Gemfile never had `gem 'concurrent-ruby'`, which is the hunk's context line. Created in `30d58d3a` "chore(infra): move to monorepo". I added the five Ruby 3.4 gems (`bigdecimal`, `logger`, `benchmark`, `mutex_m`, `nkf`). |
| `android/app/build.gradle` | applied clean | none | comment updates and the `jsc-android:2026004.+` flavor |
| `android/app/src/debug/AndroidManifest.xml` | applied clean (deleted) | none | The file was the template's. Its `usesCleartextTraffic="true"` moves to the main manifest (next row). |
| `android/app/src/main/AndroidManifest.xml` | applied by hand | Customized | The project manifest has PiP, foreground-service and `VideoPlaybackService` additions, so the context lines did not match. I inserted `android:usesCleartextTraffic="${usesCleartextTraffic}"` after `android:theme`. |
| `…/com/videoexample/MainApplication.kt` | applied clean | Diff artifact: whitespace | It failed plain and applied with `--ignore-whitespace`. The result was misindented, so I replaced it with the 0.86.3 template file with the package swapped to `com.twg.videoexample`. |
| `android/build.gradle` | applied by hand | Base mismatch | The project had `ndkVersion 26.1.10909125` and `kotlinVersion 1.9.24`, not the 0.77.3 template's `27.1.12297006` and `2.0.21`. These came from `30d58d3a`. |
| `android/gradle.properties` | applied clean | none | adds `edgeToEdgeEnabled=false` (offset 3) |
| `gradle/wrapper/gradle-wrapper.jar` | applied by hand | Binary file | Downloaded from the `release/0.86.3` branch. `git hash-object` gives `61285a659d17295f1de7c53e24fdf13ad755c379`, which matches the diff's `index` line. |
| `gradle-wrapper.properties` | applied clean | none | Gradle 8.10.2-all becomes 9.3.1-bin. |
| `android/gradlew` | applied clean | none | Identical to the 0.86.3 template. |
| `android/gradlew.bat` | applied by hand | Diff artifact: line endings | The file is CRLF. I added the Meta header, removed the `CLASSPATH` line and switched to `-jar`. CRLF is kept, and the content equals the template modulo CR. |
| `ios/Podfile` | applied clean | none | removes one comment line (offset 8) |
| `…/project.pbxproj` | applied by hand | Customized | See section 3. |
| `ios/VideoExample/AppDelegate.swift` | applied by hand | Diff artifact | See section 3. |
| `ios/VideoExample/Info.plist` | applied clean | none | See the orientation question in section 4. |
| `jest.config.js` | skipped | Not used | The project has no jest config and no `jest` in `example/package.json`. |
| `package.json` | applied by hand | by intent | See section 3. |
| `tsconfig.json` | applied by hand | Customized | See section 3. |

**Counts:** applied clean 9, applied by hand 9, skipped 3, needs human 0. That totals 21, and the tally matches the table.

## 3. Hunks applied by hand

- **`Gemfile`:** appended the template's Ruby 3.4 gem block after `xcodeproj`. I did not add `concurrent-ruby`, because the diff only uses it as context.
- **Main `AndroidManifest.xml`:** I checked that the placeholder exists in 0.86.3. `AgpConfiguratorUtils.kt` sets `usesCleartextTraffic` to `"true"` for `debug` and `debugOptimized` and `"false"` for `release`. This is equivalent to the old debug-only manifest.
- **`android/build.gradle`:**
  - `buildTools` is 36.0.0, and `compileSdk` and `targetSdk` are 36.
  - `kotlinVersion` is 2.1.20.
  - `ndkVersion` is 27.1.12297006, the 0.86.3 template value (the diff did not touch it).
  - The library reads these from `rootProject.ext`, and its `RNVideo_ndkversion` is already 27.1.12297006.
- **`gradlew.bat`:** details in the table.
- **`project.pbxproj`:** I reverted the one hunk `git apply` had taken and applied three changes by hand.
  - The reverted hunk removed `00E356EC… /* Resources */`, which the project's `VideoExampleTests` target still references (`project.pbxproj:152`). Leaving it would have left a dangling reference.
  - The other test-target removals (proxy, `Supporting Files` group, target dependency) were skipped for the same reason. The project keeps its test target, so those hunks are Customized and not applied.
  - Applied: the new `shellScript` quoting (matches the diff's `+` line byte for byte) and `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"` on the Debug and Release app configs.
  - Applied: `TARGETED_DEVICE_FAMILY = "1,2"` on the Debug and Release app configs.
  - Both were inserted in sorted order around the project's own `SWIFT_OBJC_BRIDGING_HEADER` and PiP bundle-id lines.
  - `plutil -lint` passes.
- **`AppDelegate.swift`:**
  - The hunk does not apply even to the pristine 0.77.3 template file, so the diff itself is the problem. I tested this in a scratch repo.
  - The project body equals the 0.77.3 template. The only difference is the project's 8-line Xcode header comment.
  - I replaced the body with the 0.86.3 template and kept that header.
- **`package.json`:**
  - `react` and `react-dom` go to 19.2.3.
  - `react-native` and `@react-native/{babel-preset,eslint-config,metro-config,typescript-config}` go to `^0.86.3`. I kept the project's caret style.
  - The three `@react-native-community/cli*` packages go to 20.1.0.
  - `@types/react` goes to `^19.2.0`, `typescript` to `^5.8.3`, and `engines.node` to `>= 22.11.0`.
  - Not touched: `prettier` (project `^3.0.3`, the template pins 2.8.8) and `eslint`.
  - Not added: `@react-native/new-app-screen`, `react-native-safe-area-context`, `@react-native/jest-preset`, `@types/jest`, `jest` and `react-test-renderer`, since the project does not use them.
- **`tsconfig.json`:** I changed only `extends[0]` to `"@react-native/typescript-config"`. The 0.86.3 package's `exports` map is `{".": "./tsconfig.json", "./strict": …}`, so the old `/tsconfig.json` subpath no longer resolves. The project's own `include` and `compilerOptions` stay, and the template's jest types are not added.

## 4. Open questions for a human

1. **Build blocker: mixed React Native versions in the monorepo.**
   - These still pin 0.77:
     - Root `package.json`: `react-native ^0.77.0` and `react 18.3.1`.
     - `packages/react-native-video` and `packages/drm-plugin`: `react-native ^0.77.0` and `react 18.3.1`.
     - `test-app`: `react-native` 0.77.3, `@react-native/*` 0.77.3 and `react` 18.3.1.
   - Native builds resolve React Native from the hoisted repo-root `node_modules`:
     - `example/android/settings.gradle` uses `../../node_modules/@react-native/gradle-plugin`.
     - `example/android/app/build.gradle:14-18` points `reactNativeDir`, `codegenDir` and `cliFile` at `../../../node_modules/…`.
     - `example/android/app/build.gradle:48` points `hermesCommand` at the same root.
   - The Podfile resolves from the example directory.
   - After install the root will likely stay on 0.77.3 and `example` will get a nested 0.86.3, so Gradle and CocoaPods may pick different copies and duplicate React could appear at runtime.
   - Do you want to bump the other workspaces in lockstep (including the root `@react-native/eslint-config`)?
   - `docs` already uses react `^19.0.0` and `@types/react ^19.2.0`.
2. **Third-party lockstep package:** `react-native-web ^0.19.13` has peer `react ^18` (npm registry). With `react` and `react-dom` at 19.2.3 it needs 0.21.x (peers `^18 || ^19`), which is a major bump I did not make. `babel-plugin-react-native-web ^0.19.13` is likely tied to it. Will you approve upgrading the web stack, or should the web target stay on React 18?
3. **iPhone landscape removed (clean hunk, kept applied).**
   - `Info.plist:48-52` now allows only Portrait on iPhone; landscape moved to `UISupportedInterfaceOrientations~ipad`. Before, iPhone had Portrait, LandscapeLeft and LandscapeRight.
   - The example has an "Enter Fullscreen" action (`example/src/App.tsx:415-418`) and an `onFullscreenChange` handler (`:52-55`).
   - Does fullscreen on iPhone need landscape? If so, restore LandscapeLeft and LandscapeRight to the iPhone array.
4. **`concurrent-ruby '< 1.3.4'` is not in the Gemfile.** The 0.86.3 template has it and the project never did. Add it, or keep the project's Gemfile as is?
5. **Test target kept.** `VideoExampleTests` is still in `project.pbxproj`, while the template's orphan cleanup was not applied. Is the Xcode test target still wanted?
6. **Other template changes to know about:** Gradle goes from `-all` to `-bin`, `edgeToEdgeEnabled=false` is added, and `CADisableMinimumFrameDurationOnPhone` is added to `Info.plist`. The 0.86 Gradle plugin also creates a `debugOptimized` build type.

## 5. Next steps (out of scope)

- Resolve questions 1 and 2, then run `bun install` and regenerate `bun.lock`.
- Run `cd example/ios && bundle install && pod install` to refresh the stale `Podfile.lock`.
- Confirm Android NDK 27.1.12297006 and the Android 36 SDK are installed, and that JDK 17 or newer is available for Gradle 9.3.1.
- Build and run on both platforms. Run `tsc` and lint for the example workspace.
- Check native libraries for 0.86 compatibility: `react-native-nitro-modules` 0.35.0, `@react-native-community/slider` and the local `packages/*`.
- Check the JS code for React 19 and RN 0.86 API breakage, including the `MainApplication`/`AppDelegate` changes. Review the diff, then commit.

## Verification (static)

- No `.rej` or `.orig` files remain.
- No conflict markers and no `RnDiffApp`, `rndiffapp` or `HelloWorld` strings in the added lines.
- `package.json` and `tsconfig.json` parse as JSON.
- `plutil -lint` is OK on `Info.plist` and `project.pbxproj`.
- `git diff --stat` shows 18 files changed (98 insertions, 82 deletions), which matches the 9 applied clean plus 9 applied by hand (the deleted debug manifest is among the clean ones).
