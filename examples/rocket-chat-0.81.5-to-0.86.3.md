> **About this example.** Output of `audit-libraries` (v0.2.0, commit `2d7a618`) on
> [Rocket.Chat.ReactNative](https://github.com/RocketChat/Rocket.Chat.ReactNative) at commit
> `8453d9a`, before the team's own upgrade to React Native 0.86.3. It was run in Claude Code by a
> general-purpose agent on Opus that followed `SKILL.md` exactly, not through
> `/rn-upgrade:audit-libraries`, whose agent runs on Sonnet. One rule was added for a blind run: no
> looking at the repository's later commits, branches, pull requests or issues. The report is
> unedited. Rocket.Chat's real upgrade is public
> ([#7691](https://github.com/RocketChat/Rocket.Chat.ReactNative/pull/7691),
> [#7693](https://github.com/RocketChat/Rocket.Chat.ReactNative/pull/7693)–[#7696](https://github.com/RocketChat/Rocket.Chat.ReactNative/pull/7696)),
> so you can compare the two.

# React Native library audit — Rocket.Chat.ReactNative, 0.81.5 → 0.86.3

_Generated 2026-10-07 by the audit-libraries skill. APP_ROOT `.`, repository at `8453d9a7`. Inventory: inventory.mjs (79 audited records: 46 candidates, 1 companion, 32 expo-sdk; Expo SDK 54.0.30 → SDK 57.0.27, which bundles RN 0.86.3)._

## 1. Summary

Of 79 audited libraries, 32 must change for the target, 14 more are recommended, 0 need a human.

- Verdicts: replace 9, minor bump 9, major bump 28, ok as is 33.
- RN detected: 0.81.5 (pnpm-lock.yaml and ios/Podfile.lock React-Core 0.81.5); FROM_VERSION not given. Bare Expo app (android/ and ios/ committed) → audit continues.
- Build blockers: **@react-native-cookies/cookies** (android), **react-native-math-view** (android), **react-native-restart** (android), **expo-av** (android), **expo** (ios), **react-native-gesture-handler** (android, ios), **react-native-reanimated** (android, ios), **react-native-worklets** (android, ios); plus global constraints **G5** (iOS deployment target 15.1 < 16.4 required by Expo SDK 57 → ios) and **G6** (Gradle 9 removes `jcenter()` → android).
- Required (32): @react-native-cookies/cookies, react-native-math-view, react-native-restart, expo-av, react-native-skeleton-placeholder, react-native-a11y-order, expo, expo-apple-authentication, expo-camera, expo-device, expo-document-picker, expo-file-system, expo-haptics, expo-image, expo-keep-awake, expo-local-authentication, expo-notifications, expo-status-bar, expo-system-ui, expo-video-thumbnails, expo-web-browser, babel-preset-expo, jest-expo, @react-native-community/datetimepicker, @react-native-community/netinfo, @react-native-community/slider, react-native-gesture-handler, react-native-keyboard-controller, react-native-reanimated, react-native-screens, react-native-svg, react-native-worklets.
- The 26 required expo-sdk rows are one action: `npx expo install --fix` (Expo SDK 57), plus the code changes in `expo` (AppDelegate.swift, Podfile), `expo-status-bar` and the re-port of the expo-file-system patch.

## 2. Global constraints

| id | constraint | blocks the build | targets | evidence |
|---|---|---|---|---|
| G1-react | Target needs react 19.2.3. Installed react peers that reject it: react-hook-form 7.34.2 ("^16.8.0 \|\| ^17 \|\| ^18") and react-redux 8.0.5 ("^16.8 \|\| ^17.0 \|\| ^18.0"). pnpm 10.33.4 with default strictPeerDependencies=false and .npmrc containing only node-linker=hoisted → install warns, does not fail. jest-expo 54.0.16 also pins react-test-renderer 19.1.0 (≠ 19.2.3); jest-expo 57.0.5 pins 19.2.3. Latest react-native-a11y-order / react-native-external-keyboard (2.x) require react-native >=0.87 and must not be taken. | no |  | inventory peers; npm registry; https://pnpm.io/settings#strictpeerdependencies ("Default: false"); package.json packageManager pnpm@10.33.4; .npmrc |
| G2-node | App engines.node ">=18" vs react-native 0.86.3 "^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0 \|\| >= 25.0.0" (template ">= 22.11.0"). Allowed by the app but rejected by the target: 18.x, 19.x, 20.0.0–20.19.3, 21.x, 22.0.0–22.12.x, 23.x, 24.0.0–24.2.x. volta pins 24.13.1 (accepted) and .github/actions/setup-node reads package.json; .github/workflows/organize_translations.yml uses Node 18 but only runs `node scripts/organize-translations.js` (no install/build). @react-native-firebase ≥23 also requires Node 20+. | no |  | package.json engines/volta; react-native@0.86.3 package.json engines; rn-diff-purge 0.86.3 package.json; .github/workflows/organize_translations.yml:23 |
| G3-workspaces | No other workspaces pin react/react-native/react-dom (workspacePins = []); single pnpm importer with node-linker=hoisted → one react-native in node_modules; no duplicate-React risk. | no |  | inventory workspacePins; pnpm-lock.yaml importers: only "."; .npmrc node-linker=hoisted |
| G4-patches | All 19 patches live in the app root (patches/*.patch, applied by postinstall patch-package); none belong to another workspace. Moving ones are listed in section 6. | no |  | inventory patches[] |
| G5-ios-deployment-target | Expo SDK 56+ raised the minimum iOS of expo and every expo-* module to 16.4 (ExpoModulesCore.podspec 57.0.21 `:ios => '16.4'`, Swift 6.0). ios/Podfile:4 has `platform :ios, '15.1'` (= RN 0.86 min_ios_version_supported) → `pod install` fails for ExpoModulesCore until the Podfile platform (and the Xcode targets' IPHONEOS_DEPLOYMENT_TARGET for Rocket.Chat, NotificationService, share/watch extensions) is raised to ≥16.4. | yes | ios | expo CHANGELOG 56.0.0 (#43296); expo-template-bare-minimum 57.0.29 ios/Podfile:23 default 16.4; ios/Podfile:4 |
| G6-gradle-9 | The 0.86.3 template moves Android to Gradle 9.3.1 (AGP 8.12.0, Kotlin 2.1.20), and Gradle 9 removed `jcenter()`. Unguarded `jcenter()` calls: @react-native-cookies/cookies 6.2.1 android/build.gradle:70, react-native-math-view 3.9.5 android/build.gradle:34,54, react-native-restart 0.0.22 android/build.gradle:48 (no other Gradle-9-removed API found in any audited package build file). | yes | android | rn-diff-purge release/0.86.3 gradle-wrapper.properties (gradle-9.3.1); react-native@0.86.3 gradle/libs.versions.toml; https://docs.gradle.org/current/userguide/upgrading_major_version_9.html |
| G7-legacy-arch-removal | New Architecture is mandatory since 0.82 (gradle.properties already newArchEnabled=true) and since 0.84 iOS builds compile with RCT_REMOVE_LEGACY_ARCH=1 by default (RCTUIManager addUIBlock/viewForReactTag become stubs; bridgeless RCTBridgeProxy still serves bridge.uiManager). Legacy modules kept "ok as is" (watermelondb, callkeep, device-info, incall-manager, linear-gradient, webrtc) run through the interop layer and must be tested on device. | no |  | RN CHANGELOG v0.82.0/v0.84.0 Breaking; facebook/react-native c7f433a413; react-native@0.86.3 React/Modules/RCTUIManager.mm:1629-1733, React/Base/RCTBridgeProxy.mm:375-451 |

## 3. Libraries

Recommended column: `recommended (minimum / latest)`; minimum is `n/a` for replacements. Work `none` = nothing to do (ok as is). Rows: required first, then recommended, then ok as is (alphabetical within each group).

| library | installed | recommended (minimum / latest) | verdict | need | work | blocks build | targets | depends on | affects app | confidence | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| @react-native-community/datetimepicker | 8.4.4 | 9.1.0 (9.1.0 / 9.2.1) | major bump | required | bump only | unknown (OQ1) |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 9.1.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. |
| @react-native-community/netinfo | 11.4.1 | 12.0.1 (12.0.1 / 12.0.1) | major bump | required | bump only | unknown (OQ1) |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 12.0.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 11.5.0 added New Architecture support. |
| @react-native-community/slider | 5.0.1 | 5.2.0 (5.2.0 / 5.2.1) | minor bump | required | bump only | unknown (OQ1) |  |  | no (not imported anywhere in the app) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 5.2.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 5.2.1 fixes the thumb image not rendering on iOS with RN ≥0.84 (release v5.2.1). No app import → candidate for removal. |
| @react-native-cookies/cookies | 6.2.1 | replace → @preeternal/react-native-cookie-manager 7.0.0 (n/a / 6.2.1) | replace | required | replace | yes | android |  | yes (app/views/JitsiMeetView/index.tsx) | 3 | android/build.gradle:70 unconditional `jcenter()` in `repositories {}` → fails on Gradle 9 (Gradle 9 removed `jcenter()` (https://docs.gradle.org/current/userguide/upgrading_major_version_9.html "The jcenter() repository API has been removed in Gradle 9.0.0"); RN 0.86.3 template wrapper = gradle-9.3.1 (rn-diff-purge release/0.86.3 android/gradle/wrapper/gradle-wrapper.properties)). Legacy module (no codegenConfig,… |
| babel-preset-expo _(dev)_ | 54.0.9 | ~57.0.14 (~57.0.14 / 57.0.14) | major bump | required | bump only | unknown (OQ1) |  | expo | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.14; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. devDependency but it is the app's Babel preset (babel.config.js:4), so it is part of the app build. |
| expo | 54.0.30 | ~57.0.27 (~57.0.27 / 57.0.27) | major bump | required | code change (2 files) | yes | ios |  | yes (ios/AppDelegate.swift:46, ios/Podfile:4; networking via expo/fetch) | 3 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) = 57.0.27, the SDK that bundles RN 0.86.3 (inventory targetSdk); installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. packages/expo/CHANGELOG.md: 55.0.0-preview.0 "[iOS] Remove bindReactNativeFactory function (#39418)", "[android] Delete ReactNativeHostWrapper", "[iOS] Remove EXAppDelegateWrapper"; 56.0.0-preview.0 "Bumped minimum iOS/tvO… |
| expo-apple-authentication | 8.0.8 | ~57.0.2 (~57.0.2 / 57.0.2) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2). |
| expo-av | 16.0.8 | replace → expo-audio ~57.0.5 + expo-video ~57.0.5 (n/a / 16.0.8) | replace | required | replace | yes | android | expo | yes (15 files: app/containers/AudioPlayer/index.tsx, app/lib/methods/AudioManager.ts, app/containers/Ringer/index.tsx, app/views/AttachmentView.tsx, app/views/ShareView/Preview.tsx, …) | 3 | Not in Expo SDK 57 bundledNativeModules.json (expo@57.0.27); expo.dev/changelog/sdk-55: "expo-av was removed from Expo Go because it has been replaced by expo-video and expo-audio … no longer receiving patches". No release after 16.0.8 (2025-12-05). android/src/main/java/expo/modules/av/video/FullscreenVideoPlayer.java:14 imports expo.modules.core.interfaces.services.KeepAwakeManager, which exists in expo-modules-… |
| expo-camera | 17.0.10 | ~57.0.6 (~57.0.6 / 57.0.6) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.6; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.6). |
| expo-device | 8.0.10 | ~57.0.2 (~57.0.2 / 57.0.2) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2). |
| expo-document-picker | 14.0.8 | ~57.0.3 (~57.0.3 / 57.0.3) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3). |
| expo-file-system | 19.0.21 | ~57.0.7 (~57.0.7 / 57.0.7) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4; patch required by SSLPinningTurboModule.java:138) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.7; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.7). |
| expo-haptics | 15.0.8 | ~57.0.3 (~57.0.3 / 57.0.3) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3). |
| expo-image | 3.0.11 | ~57.0.5 (~57.0.5 / 57.0.5) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.5; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.5). |
| expo-keep-awake | 15.0.8 | ~57.0.2 (~57.0.2 / 57.0.2) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2). |
| expo-local-authentication | 17.0.8 | ~57.0.3 (~57.0.3 / 57.0.3) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3). |
| expo-notifications | 0.32.15 | ~57.0.22 (~57.0.22 / 57.0.22) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.22; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.22). |
| expo-status-bar | 3.0.9 | ~57.0.1 (~57.0.1 / 57.0.1) | major bump | required | code change (1 file) | unknown (OQ1) |  | expo | yes (app/containers/StatusBar.tsx:18; ios/Podfile:4) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.1). |
| expo-system-ui | 6.0.9 | ~57.0.4 (~57.0.4 / 57.0.4) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.4; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.4). |
| expo-video-thumbnails | 10.0.8 | ~57.0.2 (~57.0.2 / 57.0.2) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2). |
| expo-web-browser | 15.0.10 | ~57.0.3 (~57.0.3 / 57.0.3) | major bump | required | bump only | unknown (OQ1) |  | expo | yes (ios/Podfile:4 deployment target, G5) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3). |
| jest-expo _(dev)_ | 54.0.16 | ~57.0.5 (~57.0.5 / 57.0.5) | major bump | required | bump only | no |  | expo, @react-native/jest-preset | yes (jest.preset.js) | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.5; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. jest.preset.js spreads jest-expo/jest-preset; 54.0.16 depends on react-test-renderer 19.1.0 exactly (≠ react 19.2.3), 57.0.5 on 19.2.3. jest-expo requires react-native/jest-preset, which in 0.86.3 forwards to @react-native/jest-preset (RN 0.85 "Move Jest preset to new reac… |
| react-native-a11y-order | 0.4.0 | 1.0.1 (1.0.0 / 2.0.1) | major bump | required | bump only | no |  |  | no (app uses only A11y.Order / A11y.Index with index/style/ref, unchanged in 1.x; 9 files) | 2 | README@2.0.1 "React Native compatibility": 0.87+ → @2, **0.80 – 0.86 → @1**, ≤0.79 → @0.11. Release v0.9.0: "React Native 0.85.x support — Updated iOS native layer … ensures VoiceOver focus tracking works correctly with the new default framework build configuration" (installed 0.4.0 predates it; app uses `use_frameworks! :linkage => :static`). Latest 2.0.1 peers `react-native >=0.87.0` → not usable on 0.86. |
| react-native-gesture-handler | 2.28.0 | ~2.32.0 (2.32.0 / 3.3.0) | minor bump | required | bump only | yes | android, ios |  | no | 3 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~2.32.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 2.28.0 src/RNRenderer.ts:3 imports 'react-native/Libraries/Renderer/shims/ReactNative', which exists in 0.81.5 and not in 0.86.3 (Libraries/Renderer/shims has only ReactFabric/ReactFeatureFlags/…) → Metro cannot resolve it. Release v2.32.0: "Support React Native 0.86" (#41… |
| react-native-keyboard-controller | 1.18.5 | 1.21.9 (1.21.9 / 1.22.6) | minor bump | required | bump only | unknown (OQ1) |  | react-native-reanimated | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 1.21.9; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Release 1.21.9: "Preparing for upcoming RN 0.86 release"; no breaking notes 1.19–1.21. |
| react-native-math-view | 3.9.5 | replace → render with react-native-katex (already a dependency) (n/a / 3.9.5) | replace | required | replace | yes | android | react-native-svg | yes (app/containers/markdown/components/Katex.tsx, app/externalModules.d.ts, jest.setup.js:321) | 3 | android/build.gradle:34,54 `jcenter()` in buildscript/allprojects (Gradle 9 removal); android/src/main/java/io/autodidact/rnmathview/SVGShadowNode.java:14 imports com.facebook.react.uimanager.UIManagerModuleListener, removed in RN by "Remove unused internal UIManagerModuleListener (#53404)" (facebook/react-native fb114da8a4, 2025-08-21; present in 0.81.5, absent in 0.86.3 ReactAndroid). Also relies on LayoutShadow… |
| react-native-reanimated | 4.1.3 | 4.5.1 (4.4.0 / 4.7.1) | minor bump | required | bump only | yes | android, ios | react-native-worklets | no | 3 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 4.5.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 4.1.3 compatibility.json "4.1.x": RN 0.78–0.82 only, enforced at build time by android/build.gradle:278-287 (assertMinimalReactNativeVersionTask → GradleException) and scripts/reanimated_utils.rb:67-68 (pod install abort). 4.5.1 compatibility.json: 4.4.x/4.5.x → RN 0.83–0.86… |
| react-native-restart | 0.0.22 | 0.0.29 (0.0.29 / 0.0.29) | minor bump | required | bump only | yes | android |  | no (app/views/LanguageView/index.tsx:56 uses `RNRestart.Restart()`, still exported (deprecated) in 0.0.29 lib/typescript/index.d.ts) | 3 | 0.0.22 android/build.gradle:48 unconditional `jcenter()` → Gradle 9 failure (Gradle 9 removed `jcenter()` (https://docs.gradle.org/current/userguide/upgrading_major_version_9.html "The jcenter() repository API has been removed in Gradle 9.0.0"); RN 0.86.3 template wrapper = gradle-9.3.1 (rn-diff-purge release/0.86.3 android/gradle/wrapper/gradle-wrapper.properties)). 0.0.24 replaced jcenter with mavenCentral (rele… |
| react-native-screens | 4.17.1 | ~4.26.0 (4.26.0 / 4.28.0) | minor bump | required | bump only | unknown (OQ1) |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~4.26.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Releases 4.26.0–4.26.2: "This version supports React Native 0.84+". |
| react-native-skeleton-placeholder | 5.2.4 | replace → react-native-reanimated-skeleton 1.6.0 or an in-app skeleton (n/a / 5.2.4) | replace | required | replace | no |  | react-native-linear-gradient, @react-native-masked-view/masked-view | yes (AutocompleteItemLoading.tsx, VideoConferenceSkeletonLoading.tsx) | 3 | lib/skeleton-placeholder.js:60 and :98 spread `StyleSheet.absoluteFillObject`, which RN 0.85.0 removed (CHANGELOG v0.85.0 Breaking: "Remove deprecated `StyleSheet.absoluteFillObject` API" 5681db09b8; not exported by 0.86.3 Libraries/StyleSheet/StyleSheetExports.js) → spread of undefined, shimmer/mask lose absolute positioning. Last release 2022-11-15; Directory `unmaintained: true`. |
| react-native-svg | 15.12.1 | 15.15.4 (15.15.4 / 15.15.5) | minor bump | required | bump only | unknown (OQ1) |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 15.15.4; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 15.13.0 dropped RN <0.78 (no effect). |
| react-native-worklets | 0.6.1 | 0.10.1 (0.10.1 / 0.13.0) | major bump | required | bump only | yes | android, ios |  | no (app uses only `scheduleOnRN`, 8 files; still exported in 0.10.1) | 3 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 0.10.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 0.6.1 compatibility.json "0.6.x": RN 0.78–0.82, enforced by android/build.gradle:286-291 (GradleException). 0.10.1 peer react-native "0.83 - 0.86". |
| @gorhom/bottom-sheet _(dev)_ | 5.2.8 | 5.2.14 (5.2.9 / 5.2.14) | minor bump | recommended | bump only | no |  | react-native-reanimated, react-native-gesture-handler | no (not imported by the app; peer of @storybook/react-native and @lodev09/react-native-true-sheet) | 2 | 5.2.8 lib/commonjs/components/bottomSheet/BottomSheet.js:1254 and backdrop/background/hostingContainer styles use removed `StyleSheet.absoluteFillObject` (RN 0.85.0); 5.2.9 (2026-04-08) and later contain none (dist grep). devDependency only used by Storybook → not required. |
| @react-native-firebase/analytics | 21.14.0 | 26.4.0 (26.0.0 / 26.4.0) | major bump | recommended | bump only | no |  | @react-native-firebase/app | no (app/lib/methods/helpers/log/index.ts uses instance methods still present in 26.4.0) | 2 | 21.14.0 is a legacy module (no codegenConfig) → runs through the interop layer. CHANGELOG 26.0.0: "analytics: migrate analytics to TurboModules" (first New-Architecture version). invertase/react-native-firebase#9192 "bump tests RN to 0.86" (2026-08-12). Peers react/react-native "*". |
| @react-native-firebase/app | 21.14.0 | 26.4.0 (26.0.0 / 26.4.0) | major bump | recommended | bump only | no |  |  | no | 2 | 21.14.0 is a legacy module (no codegenConfig) → runs through the interop layer. CHANGELOG 26.0.0: "App/Core modules native bridge requires New Architecture … migrate app modules to TurboModules" (first New-Architecture version). invertase/react-native-firebase#9192 "bump tests RN to 0.86" (2026-08-12). Peers react/react-native "*". |
| @react-native-firebase/crashlytics | 21.14.0 | 26.4.0 (26.0.0 / 26.4.0) | major bump | recommended | bump only | no |  | @react-native-firebase/app | no (app/lib/methods/helpers/log/index.ts uses instance methods still present in 26.4.0) | 2 | 21.14.0 is a legacy module (no codegenConfig) → runs through the interop layer. CHANGELOG 26.0.0: "crashlytics: migrate crashlytics to TurboModules" (first New-Architecture version). invertase/react-native-firebase#9192 "bump tests RN to 0.86" (2026-08-12). Peers react/react-native "*". |
| @storybook/react-native _(dev)_ | 9.0.18 | 10.6.0 (10.5.0 / 10.6.0) | major bump | recommended | code change (2 files) | no |  | storybook, @storybook/react, @gorhom/bottom-sheet, react-native-reanimated | yes (metro.config.js, .rnstorybook/storybook.requires.ts) | 2 | 9.0.18 dist/index.js:1110 (and 9.1.4, 10.0–10.4) spread removed `StyleSheet.absoluteFillObject` (loading view of the Storybook UI only); 10.5.0 is the first without it (dist grep). Used only with USE_STORYBOOK=true; metro.config.js wraps every bundle with withStorybook, which still works on 9.0.18 → not a build blocker. 10.6.0 peers pin react-native-reanimated "4.5.1" (= SDK 57) and react-native-safe-area-context … |
| @types/react-native-background-timer _(dev)_ | 2.0.2 | remove with react-native-background-timer (n/a / 2.0.2) | replace | recommended | replace | no |  | react-native-background-timer | no | 2 | Companion of react-native-background-timer (devDependency); follows its replacement. |
| react-hook-form | 7.34.2 | 7.89.0 (7.52.0 / 7.89.0) | minor bump | recommended | bump only | no |  |  | no (21 files use it; no breaking change declared within 7.x; @hookform/resolvers 2.9.11 peer `react-hook-form ^7.0.0`) | 2 | Installed peer react "^16.8.0 \|\| ^17 \|\| ^18" rejects 19.2.3; 7.52.0 (2024-06-15) is the first 7.x with "^19" (npm registry peerDependencies). pnpm `strictPeerDependencies` default false (pnpm.io/settings) and repo .npmrc sets only node-linker=hoisted → warning, not an install failure. |
| react-native-background-timer | 2.4.1 | replace (n/a / 2.4.1) | replace | recommended | replace | no |  |  | yes (app/lib/methods/videoConfTimer.ts) | 2 | Legacy module (no codegenConfig), only release line ends 2.4.1 (2020-10-01), Directory `unmaintained: true` → replace per rule. Android imports compile against 0.86.3 (hasActiveCatalystInstance still on ReactContext.java:182); runs through interop until replaced. |
| react-native-console-time-polyfill | 1.2.3 | remove (or inline the polyfill) (n/a / 1.2.3) | replace | recommended | replace | no |  |  | yes (index.js:2) | 2 | JS-only polyfill, last release 2021-04-03, Directory `unmaintained: true`. index.js already stubs console.time/timeLog in release builds. Works on Hermes (falls back to global.performance.now), so nothing breaks today. |
| react-native-easy-toast | 2.3.0 | replace → react-native-toast-message 2.5.2 (n/a / 2.3.0) | replace | recommended | replace | no |  |  | yes (app/containers/Toast.tsx) | 2 | JS-only, last release 2022-11-18, Directory `unmaintained: true`; no removed RN API found in index.js; app carries patches/react-native-easy-toast+2.3.0.patch (types only). |
| react-native-external-keyboard | 0.9.0 | 1.2.1 (1.0.0 / 2.0.1) | major bump | recommended | code change (3 files) | no |  |  | yes (canBeFocused / enableA11yFocus removed) | 2 | README@2.0.1: RN 0.80 – 0.86 → @1 (1.2.x), ≤0.79 → @0.13, 0.87+ → @2; 0.13.0/0.13.1 declare peer `react-native <0.80.0` and 2.x `>=0.87.0`. Installed 0.9.0 (peer "*", codegen) predates the split; imports compile against 0.86.3 (TurboReactPackage/ReactModuleInfo still present, deprecated). |
| react-native-file-viewer | 2.1.4 | replace → @react-native-documents/viewer 4.0.1 (n/a / 2.1.5) | replace | recommended | replace | no |  |  | yes (app/lib/methods/helpers/fileDownload.ts:41, jest.setup.js:52) | 2 | Legacy module (no codegenConfig) in 2.1.4 and latest 2.1.5 (2021-12-12); Directory `unmaintained: true` → replace. Imports compile against 0.86.3; runs through interop until replaced. |
| react-native-localize | 2.1.1 | 3.7.2 (3.0.0 / 3.7.2) | major bump | recommended | code change (1 file) | no |  |  | yes (app/i18n/index.ts:185) | 2 | 2.1.1 is a legacy module (no codegenConfig) → interop only. Release 3.0.0 "New architecture support 🎉". 3.7.2 has codegenConfig; Directory newArchitecture true. |
| react-redux | 8.0.5 | 9.3.0 (9.2.0 / 9.3.0) | major bump | recommended | bump only | no |  | redux | unknown (TypeScript only: 9.x d.ts imports `UnknownAction` from redux 5; app has redux 4.2.0, skipLibCheck: true) | 2 | Installed peer react "^16.8 \|\| ^17.0 \|\| ^18.0" rejects 19.2.3; 9.2.0 (2024-12-10) first with "^18.0 \|\| ^19"; no 8.x accepts 19. Peer-only (pnpm non-strict) → warning. v9.0.0 release notes: React 18 required, Redux 5 types, ESM packaging, `noopCheck` → `identityFunctionCheck`. |
| @bugsnag/react-native | 8.4.0 | 8.4.0 (unknown / 9.0.0) | ok as is |  | none | no |  |  | no | 2 | No react/react-native peers; codegenConfig + NativeBugsnag TurboModule in 8.4.0 (src/NativeBugsnag.ts, android/src/newarch). Android imports resolve in RN 0.86.3; `com.facebook.react:react-native:+` is substituted by RNGP 0.86.3 (DependencyUtils.kt:135-166). bugsnag-js main CI matrix runs RN 0.84. 9.0.0 (2026-09-22) adds no RN-runtime change (its RN fix #2820 is CI/fixtures). |
| @expo/vector-icons | 15.0.3 | ^15.0.2 (^15.0.2 / 15.1.1) | ok as is |  | none | no |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ^15.0.2; installed 15.0.3 already satisfies it. |
| @lodev09/react-native-true-sheet | 3.7.3 | 3.7.3 (unknown / 3.11.18) | ok as is |  | none | no |  | react-native-reanimated, react-native-worklets | no | 2 | Fabric component + codegenConfig, peers react/react-native "*", reanimated ">=4", worklets "*". Only deprecated (not removed) API: UIManagerHelper.getEventDispatcherForReactTag (TrueSheetViewManager.kt:46; still in 0.86.3 UIManagerHelper.kt:75-76). App patch patches/@lodev09+react-native-true-sheet+3.7.3.patch stays valid. |
| @nozbe/watermelondb | 0.28.1-0 | 0.28.1-0 (unknown / 0.28.0) | ok as is |  | none | no |  |  | no | 2 | Legacy module + JSI (no codegenConfig, no New-Arch version exists); maintained (0.28.1-0 released 2025-07-24, Directory not unmaintained) → ok as is; runs through the interop layer; test it on a device. Android imports all resolve in RN 0.86.3 (JavaScriptContextHolder, ReactContextBaseJavaModule). App wires it manually: android/settings.gradle:5-6 (:watermelondb-jsi), MainApplication.kt:46, Podfile simdjson. |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0 (2.2.0 / 3.1.1) | ok as is |  | none | no |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 2.2.0; installed 2.2.0 already satisfies it. |
| @react-native-camera-roll/camera-roll | 7.10.2 | 7.10.2 (unknown / 7.10.2) | ok as is |  | none | no |  |  | no | 1 | codegenConfig, peer react-native ">=0.59"; latest = installed; Android imports resolve in RN 0.86.3. |
| @react-native-clipboard/clipboard | 1.16.3 | 1.16.3 (unknown / 1.16.3) | ok as is |  | none | no |  |  | no | 1 | codegenConfig + TurboModule (dist/NativeClipboardModule), peers react ">= 16.9.0"; latest = installed; Android imports resolve in RN 0.86.3. |
| @react-native-community/hooks | 100.1.0 | 100.1.0 (unknown / 100.1.0) | ok as is |  | none | no |  |  | no | 1 | JS-only, peers react ">=18.0.0", react-native ">=0.70"; uses InteractionManager (deprecated in 0.82, not removed). |
| @react-native-masked-view/masked-view | 0.3.2 | 0.3.2 (0.3.2 / 0.3.2) | ok as is |  | none | no |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 0.3.2; installed 0.3.2 already satisfies it. |
| @react-native-picker/picker | 2.11.4 | 2.11.4 (2.11.4 / 2.11.4) | ok as is |  | none | no |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 2.11.4; installed 2.11.4 already satisfies it. |
| @react-navigation/drawer | 7.12.2 | 7.12.2 (unknown / 7.14.3) | ok as is |  | none | no |  | @react-navigation/native, react-native-screens, react-native-safe-area-context | no | 1 | JS-only, peers react ">= 18.2.0", react-native "*", screens/safe-area ">= 4.0.0" (satisfied by SDK 57 versions); no removed RN API found. patches/@react-navigation+core+7.21.1.patch unaffected (core does not move). |
| @react-navigation/elements | 2.9.25 | 2.9.25 (unknown / 2.9.44) | ok as is |  | none | no |  | @react-navigation/native, react-native-screens, react-native-safe-area-context | no | 1 | JS-only, peers react ">= 18.2.0", react-native "*", screens/safe-area ">= 4.0.0" (satisfied by SDK 57 versions); no removed RN API found. patches/@react-navigation+core+7.21.1.patch unaffected (core does not move). |
| @react-navigation/native | 7.3.3 | 7.3.3 (unknown / 7.5.0) | ok as is |  | none | no |  |  | no | 1 | JS-only, peers react ">= 18.2.0", react-native "*", screens/safe-area ">= 4.0.0" (satisfied by SDK 57 versions); no removed RN API found. patches/@react-navigation+core+7.21.1.patch unaffected (core does not move). |
| @react-navigation/native-stack | 7.17.5 | 7.17.5 (unknown / 7.20.0) | ok as is |  | none | no |  | @react-navigation/native, react-native-screens, react-native-safe-area-context | no | 1 | JS-only, peers react ">= 18.2.0", react-native "*", screens/safe-area ">= 4.0.0" (satisfied by SDK 57 versions); no removed RN API found. patches/@react-navigation+core+7.21.1.patch unaffected (core does not move). |
| @rocket.chat/mobile-crypto | git RocketChat/rocket.chat-mobile-crypto@69a0a250 (0.4.0) | keep locked ref (unknown / n/a (git)) | ok as is |  | none | no |  |  | no | 1 | Fork audited at the locked ref: codegenConfig MobileCryptoSpec (TurboModule), peers "*", `com.facebook.react` plugin, Android imports resolve in 0.86.3. Note package.json tracks branch `#main`; lockfile pins 69a0a250. iOS bridging header imports <MobileCrypto/*.h> (ios/RocketChatRN-Bridging-Header.h:11-14). |
| @rocket.chat/sdk | git RocketChat/Rocket.Chat.js.SDK@ecf4fedc (2.0.0-mobile) | keep locked ref (unknown / n/a (git; npm 0.2.9-2 is unrelated)) | ok as is |  | none | no |  |  | no | 1 | Fork audited at the locked ref: pure JS (deps js-sha256, tiny-events, universal-websocket-client), no react/react-native peers, no native code. |
| @testing-library/react-native _(dev)_ | 13.3.3 | 13.3.3 (unknown / 14.0.1) | ok as is |  | none | no |  | jest-expo | no | 2 | Peers react ">=18.2.0", react-native ">=0.71", react-test-renderer ">=18.2.0"; react-test-renderer comes from jest-expo (54.0.16 pins 19.1.0; 57.0.5 pins 19.2.3 = target react) and from the 0.86.3 template (react-test-renderer 19.2.3). |
| @zoontek/react-native-navigation-bar | 1.1.2 | 1.1.2 (unknown / 2.0.2) | ok as is |  | none | no |  |  | no | 1 | Android-only TurboModule (codegenConfig), peers "*"; Android imports resolve in RN 0.86.3. |
| react-native-bootsplash | 6.3.11 | ^6.3.10 (^6.3.10 / 7.3.4) | ok as is |  | none | no |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ^6.3.10; installed 6.3.11 already satisfies it. 6.3.11 dist/commonjs/index.js:84 uses removed `StyleSheet.absoluteFillObject` only inside `useHideAnimation`; the app only calls `RNBootSplash.hide()` (app/sagas/init.js:83, localAuthentication.ts:107) and the native RNBootSplash.init/initWithStoryboard. |
| react-native-callkeep | 4.3.16 | 4.3.16 (unknown / 4.3.16) | ok as is |  | none | no |  |  | no | 2 | Legacy module, no New-Arch version exists; last release 2024-11-18 (< 2 years), Directory not unmaintained → ok as is; runs through the interop layer; test it on a device. Android imports resolve in 0.86.3 (hasActiveCatalystInstance at ReactContext.java:182). Used natively: AppDelegate.swift RNCallKeep.setup, bridging header <RNCallKeep/RNCallKeep.h>; app patch stays. |
| react-native-device-info | 11.1.0 | 11.1.0 (unknown / 15.0.2) | ok as is |  | none | no |  |  | no | 2 | Legacy module in every version up to 15.0.2 (no codegenConfig); maintained (15.0.2, 2026-02-21) → ok as is; interop; test it on a device. Imports resolve in 0.86.3. Bridging header imports <RNDeviceInfo/DeviceUID.h> (present in 15.0.2 too). Later majors only change behaviour (12: iOS getUniqueId, 13: powerState event, 14: no play-services-iid, 15: compileSdk 34+). |
| react-native-image-crop-picker | git RocketChat/react-native-image-crop-picker@47092e8c (0.51.1) | keep locked ref (unknown / 0.52.0 (upstream npm)) | ok as is |  | none | no |  |  | no | 1 | Fork audited at the locked ref: codegenConfig RNCImageCropPickerSpec (TurboModule), podspec uses install_modules_dependencies, peers "*"; Android imports resolve in 0.86.3. |
| react-native-incall-manager | 4.2.1 | 4.2.1 (unknown / 4.3.0) | ok as is |  | none | no |  |  | no | 2 | Legacy module, no New-Arch version (4.3.0 too); maintained (4.3.0, 2026-09-15) → ok as is; interop; test on a device. Imports resolve in 0.86.3. |
| react-native-katex | git RocketChat/react-native-katex@37e57980 (1.3.0) | keep locked ref (unknown / n/a (git)) | ok as is |  | none | no |  | react-native-webview | no | 1 | Fork audited at the locked ref: JS-only WebView wrapper, peers react ">=16", react-native "*", react-native-webview ">=13" (SDK 57 pins 13.16.1). Becomes the KaTeX renderer if react-native-math-view is replaced. |
| react-native-linear-gradient | 2.6.2 | 2.6.2 (unknown / 2.8.3) | ok as is |  | none | no |  |  | no (no direct import; used by react-native-skeleton-placeholder) | 2 | Legacy view manager in 2.6.2 and latest stable 2.8.3; first Fabric version is prerelease 3.0.0-beta.2 (codegenConfig; next tag; 2026-02-11), so the package is maintained (Directory not unmaintained) → ok as is; interop; test on a device. 3.0.0-beta would break skeleton-placeholder's peer `^2.5.6`. If skeleton-placeholder is replaced by something that does not need it, this dependency can be dropped. |
| react-native-mmkv | 4.1.2 | 4.1.2 (unknown / 4.3.2) | ok as is |  | none | no |  | react-native-nitro-modules | no | 2 | Nitro module (C++ HybridObjects, nitrogen-generated autolinking) → New Architecture native; peers "*". Moving to 4.3.x would also require Nitro ≥0.35 (breaking for Kotlin HybridObjects, nitro release v0.35.0). App patch stays. |
| react-native-modal | 13.0.1 | 13.0.1 (unknown / 14.0.0-rc.1) | ok as is |  | none | no |  |  | no | 2 | JS-only (via react-native-animatable), peer react "*", react-native ">=0.65.0". Its only removed-API use, `BackHandler.removeEventListener` (dist/modal.js:459), is already replaced by patches/react-native-modal+13.0.1.patch. InteractionManager handles are deprecated (0.82) but still exported. Directory not unmaintained (14.0.0-rc.1 in 2025-03). |
| react-native-nitro-modules | 0.33.9 | 0.33.9 (unknown / 0.37.1) | ok as is |  | none | no |  |  | no | 2 | codegenConfig TurboModule, peers "*". Nitro releases 0.34–0.37 contain no RN 0.84–0.86 build fix (0.35.2 fixes RN ≤0.82, 0.36.2 adds RN 0.87+); open margelo/nitro#1656 concerns Hybrid Views on RN ≥0.86 — the app has none (only react-native-mmkv HybridObjects). |
| react-native-notifier | 1.6.1 | 1.6.1 (unknown / 2.0.0) | ok as is |  | none | no |  |  | no | 1 | JS-only, peers "*". Only removed API (`Dimensions.removeEventListener`, src/components/SafeContainer.tsx:42) is inside the iOS-10-only StatusBarSpacer, never used on iOS 15+; RN SafeAreaView is deprecated but still exported in 0.86.3 (index.js:96-107). App patch stays. |
| react-native-url-polyfill | 2.0.0 | 2.0.0 (unknown / 4.0.0) | ok as is |  | none | no |  |  | no | 2 | JS-only, peer react-native "*". The 3.0.0 fix (BlobModule undefined since RN 0.78, PR #479) only affects URL.createObjectURL, which the app does not use (imports `URL` in buildImageURL.ts, formatAttachmentUrl.ts, isValidUrl.ts). |
| react-native-webrtc | 124.0.7 | 124.0.7 (unknown / 124.0.8) | ok as is |  | none | no |  |  | no | 2 | Legacy module/view manager, no New-Arch version (124.0.8 neither); maintained (124.0.8, 2026-07-21: Android ANR fix) → ok as is; interop; test calls on a device. Android imports resolve in 0.86.3. iOS `startIOSPIP`/`stopIOSPIP` use RCTUIManager addUIBlock (RTCVideoViewManager.m:382-397), a no-op when RCT_REMOVE_LEGACY_ARCH=1 (default since 0.84) — the app does not render RTCView/PiP. |
| react-native-webview | 13.16.1 | 13.16.1 (13.16.1 / 14.0.1) | ok as is |  | none | no |  |  | no | 2 | Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 13.16.1; installed 13.16.1 already satisfies it. App patch patches/react-native-webview+13.16.1.patch stays valid. |
| reanimated-tab-view | 0.3.0 | 0.3.0 (unknown / 1.1.0) | ok as is |  | none | no |  | react-native-reanimated, react-native-gesture-handler | no | 2 | JS-only, peers react/react-native "*", reanimated ">=3.0.0", gesture-handler ">=2.9.0"; every reanimated symbol it imports (runOnJS, runOnUI, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, Easing, SharedValue) is exported by reanimated 4.5.1. |

## 4. Details

### @react-native-community/datetimepicker — major bump, required

- Installed 8.4.4 → 9.1.0 (minimum 9.1.0, latest 9.2.1). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 9.1.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it.
- Breaking changes:
  - **does not affect** — 9.0.0: Android `positiveButtonLabel`, `negativeButtonLabel`, `neutralButtonLabel` removed — files: 3 importing files use none of them — _release v9.0.0_
- Open questions: OQ1

### @react-native-community/netinfo — major bump, required

- Installed 11.4.1 → 12.0.1 (minimum 12.0.1, latest 12.0.1). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 12.0.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 11.5.0 added New Architecture support.
- Breaking changes:
  - **does not affect** — 12.0.0: iOS 14+, Wi-Fi details via NEHotspotNetwork need the Access Wi-Fi Information entitlement — files: 4 importing files do not read ssid/bssid — _release v12.0.0_
- Open questions: OQ1

### @react-native-community/slider — minor bump, required

- Installed 5.0.1 → 5.2.0 (minimum 5.2.0, latest 5.2.1). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 5.2.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 5.2.1 fixes the thumb image not rendering on iOS with RN ≥0.84 (release v5.2.1). No app import → candidate for removal.
- Open questions: OQ1, OQ6

### @react-native-cookies/cookies — replace, required

- Installed 6.2.1 → replace → @preeternal/react-native-cookie-manager 7.0.0 (minimum n/a, latest 6.2.1). Work: replace. Blocks build: yes (android). Confidence 3.
- Evidence: android/build.gradle:70 unconditional `jcenter()` in `repositories {}` → fails on Gradle 9 (Gradle 9 removed `jcenter()` (https://docs.gradle.org/current/userguide/upgrading_major_version_9.html "The jcenter() repository API has been removed in Gradle 9.0.0"); RN 0.86.3 template wrapper = gradle-9.3.1 (rn-diff-purge release/0.86.3 android/gradle/wrapper/gradle-wrapper.properties)). Legacy module (no codegenConfig, no TurboModule), last release 2022-05-11, React Native Directory `unmaintained: true`.
- Alternatives: @preeternal/react-native-cookie-manager 7.0.0 (npm: "maintained New Architecture–only cookie manager … TurboModules", codegenConfig CookieManagerSpec; fork of this package, same `CookieManager.set` API — verify); Interim: patch-package removing `jcenter()` at android/build.gradle:34,70 (34 is inside `if (project == rootProject)` and harmless).
- Breaking changes:
  - **affects** — android/build.gradle:70 calls `jcenter()`, removed in Gradle 9 → Android configuration fails — files: android/build.gradle (Gradle 9.3.1 after template diff) — _Gradle 9 removed `jcenter()` (https://docs.gradle.org/current/userguide/upgrading_major_version_9.html "The jcenter() repository API has been removed in Gradle 9.0.0"); RN 0.86.3 template wrapper = gradle-9.3.1 (rn-diff-purge release/0.86.3 android/gradle/wrapper/gradle-wrapper.properties)_
  - **affects** — Legacy NativeModule (CookieManager) only runs through the interop layer — files: app/views/JitsiMeetView/index.tsx:1,39,44 — _no codegenConfig in package.json_

### babel-preset-expo — major bump, required

- Installed 54.0.9 → ~57.0.14 (minimum ~57.0.14, latest 57.0.14). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.14; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. devDependency but it is the app's Babel preset (babel.config.js:4), so it is part of the app build.
- Open questions: OQ1

### expo — major bump, required

- Installed 54.0.30 → ~57.0.27 (minimum ~57.0.27, latest 57.0.27). Work: code change (2 files). Blocks build: yes (ios). Confidence 3.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) = 57.0.27, the SDK that bundles RN 0.86.3 (inventory targetSdk); installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. packages/expo/CHANGELOG.md: 55.0.0-preview.0 "[iOS] Remove bindReactNativeFactory function (#39418)", "[android] Delete ReactNativeHostWrapper", "[iOS] Remove EXAppDelegateWrapper"; 56.0.0-preview.0 "Bumped minimum iOS/tvOS version to 16.4", "Use expo/fetch as default fetch (#44987)". expo-template-bare-minimum 57.0.29 AppDelegate.swift no longer calls bindReactNativeFactory; its Podfile defaults to 16.4.
- Breaking changes:
  - **affects** — iOS: `bindReactNativeFactory` removed from ExpoAppDelegate — files: ios/AppDelegate.swift:46 — _expo CHANGELOG 55.0.0-preview.0; expo@57.0.27 ios/AppDelegates/ExpoAppDelegate.swift has no such method_
  - **affects** — Minimum iOS 16.4 for expo and every expo-* module — files: ios/Podfile:4, Xcode targets Rocket.Chat / NotificationService / ShareRocketChatRN — _expo CHANGELOG 56.0.0-preview.0_
  - **affects** — expo/fetch replaces global `fetch` whenever the `expo` entry is loaded (opt out with EXPO_PUBLIC_USE_RN_FETCH=1); expo-camera 57 build/PictureRef.js:1 imports from 'expo' — files: android/app/src/main/java/chat/rocket/reactnative/networking/SSLPinningTurboModule.java:126 (NetworkingModule.setCustomClientBuilder — client certificates), ios/Libraries/SSLPinning.mm:15 (RCTHTTPRequestHandler challenge category), app/lib/methods/helpers/fetch.ts — _expo@57.0.27 src/winter/runtime.native.ts:41-53, src/Expo.ts:1_
  - **does not affect** — Android: ReactNativeHostWrapper deleted — files: android/app/src/main/java/chat/rocket/reactnative/MainApplication.kt (uses DefaultReactNativeHost + ApplicationLifecycleDispatcher, still present in expo 57) — _expo CHANGELOG 55.0.0-preview.0_
  - **does not affect** — `@expo/vector-icons` no longer a dependency of `expo` — files: package.json lists @expo/vector-icons directly — _expo CHANGELOG 56.0.0-preview.10_
  - **unknown** — Transitive expo-asset ~57.0.19 / expo-font ~57.0.4 move; both are patched by the app — files: patches/expo-asset+12.0.12.patch, patches/expo-font+14.0.10.patch — _expo@57.0.27 package.json_
- Open questions: OQ4

### expo-apple-authentication — major bump, required

- Installed 8.0.8 → ~57.0.2 (minimum ~57.0.2, latest 57.0.2). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-av — replace, required

- Installed 16.0.8 → replace → expo-audio ~57.0.5 + expo-video ~57.0.5 (minimum n/a, latest 16.0.8). Work: replace. Blocks build: yes (android). Confidence 3.
- Evidence: Not in Expo SDK 57 bundledNativeModules.json (expo@57.0.27); expo.dev/changelog/sdk-55: "expo-av was removed from Expo Go because it has been replaced by expo-video and expo-audio … no longer receiving patches". No release after 16.0.8 (2025-12-05). android/src/main/java/expo/modules/av/video/FullscreenVideoPlayer.java:14 imports expo.modules.core.interfaces.services.KeepAwakeManager, which exists in expo-modules-core 3.0.29 (SDK 54) and is absent from expo-modules-core 57.0.21 (SDK 57) → Android compile error. Directory `unmaintained: true`.
- Alternatives: expo-audio ~57.0.5 (Audio playback/recording, audio mode) and expo-video ~57.0.5 (Video) — both pinned by Expo SDK 57 bundledNativeModules.json.
- Breaking changes:
  - **affects** — Package removed from the SDK; KeepAwakeManager import no longer resolves against expo-modules-core 57 — files: app/lib/methods/AudioManager.ts, app/containers/AudioPlayer/index.tsx, app/containers/MessageComposer/components/RecordAudio/RecordAudio.tsx, app/containers/MessageComposer/components/RecordAudio/Duration.tsx, app/containers/MessageComposer/components/Buttons/MicOrSendButton.tsx, app/containers/Ringer/index.tsx, app/lib/constants/audio.ts, app/lib/services/voip/playCallEndedSound.ts, app/views/AttachmentView.tsx, app/views/ShareView/Preview.tsx, app/views/CallView/index.tsx, app/views/CallView/components/Dialpad/DialpadContext.tsx, tests: playCallEndedSound.test.ts, AttachmentView.test.tsx, jest.setup.js — _imports: Audio, InterruptionModeIOS/Android, AudioMode, RecordingOptions (expo-av/build/Audio), Video, ResizeMode, AVPlaybackStatus_

### expo-camera — major bump, required

- Installed 17.0.10 → ~57.0.6 (minimum ~57.0.6, latest 57.0.6). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.6; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.6).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
  - **does not affect** — android/build.gradle adds maven repo `node_modules/expo-camera/android/maven`, absent in 17.0.10 and 57.0.6 (harmless leftover) — files: android/build.gradle:30-33 — _tarball listing_
- Open questions: OQ1

### expo-device — major bump, required

- Installed 8.0.10 → ~57.0.2 (minimum ~57.0.2, latest 57.0.2). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
  - **does not affect** — 55.0.15: some iOS model names changed — files: app/lib/notifications/push.ts:132 uses only Device.isDevice — _CHANGELOG 55.0.15_
- Open questions: OQ1

### expo-document-picker — major bump, required

- Installed 14.0.8 → ~57.0.3 (minimum ~57.0.3, latest 57.0.3). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-file-system — major bump, required

- Installed 19.0.21 → ~57.0.7 (minimum ~57.0.7, latest 57.0.7). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.7; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.7).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
  - **does not affect** — 56.0.0: File/Directory `copy()`/`move()`, `File.write()`, FileHandle read/writeBytes become async — files: app imports only `expo-file-system/legacy` (10 files); legacy.ts still exported in 57.0.7 — _CHANGELOG 56.0.0_
  - **affects** — App native code calls `FileSystemLegacyModule.setOkHttpClient`, which only exists through patches/expo-file-system+19.0.21.patch; 57.0.7 FileSystemLegacyModule.kt:86 still has `private var client` → patch must be re-ported or Android compile fails — files: android/app/src/main/java/chat/rocket/reactnative/networking/SSLPinningTurboModule.java:36,138, patches/expo-file-system+19.0.21.patch — _expo-file-system@57.0.7 android/src/main/java/expo/modules/filesystem/legacy/FileSystemLegacyModule.kt:86_
  - **does not affect** — iOS SSLPinning.mm imports EXSessionTaskDispatcher.h (still shipped in 57.0.7 ios/Legacy/EXSessionTasks) — files: ios/Libraries/SSLPinning.mm:13,24 — _57.0.7 file listing_
- Open questions: OQ1

### expo-haptics — major bump, required

- Installed 15.0.8 → ~57.0.3 (minimum ~57.0.3, latest 57.0.3). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-image — major bump, required

- Installed 3.0.11 → ~57.0.5 (minimum ~57.0.5, latest 57.0.5). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.5; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.5).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
  - **does not affect** — App native code uses expo.modules.image.okhttp.GlideUrlWrapper / GlideUrlWrapperLoader.Factory and SDWebImage — files: android/app/src/main/java/chat/rocket/reactnative/networking/ExpoImageClient.java:12-13, ios/Libraries/Challenge.mm:12 — _57.0.5: okhttp/ExpoImageOkHttpClientGlideModule.kt:69, GlideUrlWrapperLoader.kt:47; ios podspec depends on SDWebImage ~> 5.21.0_
- Open questions: OQ1

### expo-keep-awake — major bump, required

- Installed 15.0.8 → ~57.0.2 (minimum ~57.0.2, latest 57.0.2). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-local-authentication — major bump, required

- Installed 17.0.8 → ~57.0.3 (minimum ~57.0.3, latest 57.0.3). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-notifications — major bump, required

- Installed 0.32.15 → ~57.0.22 (minimum ~57.0.22, latest 57.0.22). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.22; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.22).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
  - **does not affect** — 55.0.0: iOS pod renamed EXNotifications → ExpoNotifications; Expo Go throws for push — files: no app native reference to EXNotifications (grep ios/ android/) — _CHANGELOG 55.0.0_
- Open questions: OQ1

### expo-status-bar — major bump, required

- Installed 3.0.9 → ~57.0.1 (minimum ~57.0.1, latest 57.0.1). Work: code change (1 file). Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.1).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
  - **affects** — 56.0.0: removed `backgroundColor`, `translucent`, `networkActivityIndicatorVisible` props and setters (#44196) — files: app/containers/StatusBar.tsx:18 (`backgroundColor` prop) — _CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-system-ui — major bump, required

- Installed 6.0.9 → ~57.0.4 (minimum ~57.0.4, latest 57.0.4). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.4; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.4).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-video-thumbnails — major bump, required

- Installed 10.0.8 → ~57.0.2 (minimum ~57.0.2, latest 57.0.2). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.2; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.2).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### expo-web-browser — major bump, required

- Installed 15.0.10 → ~57.0.3 (minimum ~57.0.3, latest 57.0.3). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.3; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Breaking changes read from the package CHANGELOG.md (57.0.3).
- Breaking changes:
  - **affects** — SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296) — files: ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5 — _package CHANGELOG 56.0.0_
- Open questions: OQ1

### jest-expo — major bump, required

- Installed 54.0.16 → ~57.0.5 (minimum ~57.0.5, latest 57.0.5). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~57.0.5; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. jest.preset.js spreads jest-expo/jest-preset; 54.0.16 depends on react-test-renderer 19.1.0 exactly (≠ react 19.2.3), 57.0.5 on 19.2.3. jest-expo requires react-native/jest-preset, which in 0.86.3 forwards to @react-native/jest-preset (RN 0.85 "Move Jest preset to new react-native/jest-preset package"; jest-expo 57 peer @react-native/jest-preset ^0.86.3 — template package, added by apply-upgrade-diff).
- Breaking changes:
  - **affects** — Needs @react-native/jest-preset 0.86.3 installed — files: package.json devDependencies (template diff), jest.preset.js:2 — _react-native@0.86.3 jest-preset.js:13-20_

### react-native-a11y-order — major bump, required

- Installed 0.4.0 → 1.0.1 (minimum 1.0.0, latest 2.0.1). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: README@2.0.1 "React Native compatibility": 0.87+ → @2, **0.80 – 0.86 → @1**, ≤0.79 → @0.11. Release v0.9.0: "React Native 0.85.x support — Updated iOS native layer … ensures VoiceOver focus tracking works correctly with the new default framework build configuration" (installed 0.4.0 predates it; app uses `use_frameworks! :linkage => :static`). Latest 2.0.1 peers `react-native >=0.87.0` → not usable on 0.86.
- Breaking changes:
  - **does not affect** — 1.0.0: native layers overhauled, props types moved to co-located *.types.ts, new A11y.Card — _release v1.0.0_
  - **affects** — 0.9.0: iOS native layer changed for RN 0.85 framework builds (VoiceOver focus tracking) — files: app/containers/message/components/MessageA11yOrder.tsx, app/containers/message/components/MessageA11yIndex.tsx, app/containers/CallHeader.tsx, … — _release v0.9.0_

### react-native-gesture-handler — minor bump, required

- Installed 2.28.0 → ~2.32.0 (minimum 2.32.0, latest 3.3.0). Work: bump only. Blocks build: yes (android, ios). Confidence 3.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~2.32.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 2.28.0 src/RNRenderer.ts:3 imports 'react-native/Libraries/Renderer/shims/ReactNative', which exists in 0.81.5 and not in 0.86.3 (Libraries/Renderer/shims has only ReactFabric/ReactFeatureFlags/…) → Metro cannot resolve it. Release v2.32.0: "Support React Native 0.86" (#4166), "Fix RNRenderer import for React Native 0.86+" (#4160). App patch must be re-applied.
- Breaking changes:
  - **does not affect** — 2.32: RNRenderer import changed; no public API change — _release v2.32.0_

### react-native-keyboard-controller — minor bump, required

- Installed 1.18.5 → 1.21.9 (minimum 1.21.9, latest 1.22.6). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 1.21.9; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Release 1.21.9: "Preparing for upcoming RN 0.86 release"; no breaking notes 1.19–1.21.
- Open questions: OQ1

### react-native-math-view — replace, required

- Installed 3.9.5 → replace → render with react-native-katex (already a dependency) (minimum n/a, latest 3.9.5). Work: replace. Blocks build: yes (android). Confidence 3.
- Evidence: android/build.gradle:34,54 `jcenter()` in buildscript/allprojects (Gradle 9 removal); android/src/main/java/io/autodidact/rnmathview/SVGShadowNode.java:14 imports com.facebook.react.uimanager.UIManagerModuleListener, removed in RN by "Remove unused internal UIManagerModuleListener (#53404)" (facebook/react-native fb114da8a4, 2025-08-21; present in 0.81.5, absent in 0.86.3 ReactAndroid). Also relies on LayoutShadowNode/NativeViewHierarchyManager (stubbed in 0.85+, RN CHANGELOG "Stub out NativeViewHierarchyManager"). Last release 2021-08-28; no New Architecture version.
- Alternatives: react-native-katex (RocketChat fork, already installed and already used as the fallback in Katex.tsx) for both block and inline KaTeX; No interim patch is sufficient: removing jcenter() still leaves the UIManagerModuleListener compile error and legacy shadow-node rendering.
- Breaking changes:
  - **affects** — `jcenter()` at android/build.gradle:34 and :54 (not guarded) — Gradle 9 removed it — files: android/build.gradle (Gradle 9.3.1) — _Gradle 9 removed `jcenter()` (https://docs.gradle.org/current/userguide/upgrading_major_version_9.html "The jcenter() repository API has been removed in Gradle 9.0.0"); RN 0.86.3 template wrapper = gradle-9.3.1 (rn-diff-purge release/0.86.3 android/gradle/wrapper/gradle-wrapper.properties)_
  - **affects** — SVGShadowNode.java:14 imports `UIManagerModuleListener` (removed from RN, #53404) → Java compile error — files: app/containers/markdown/components/Katex.tsx:6 (MathView, MathText) — _facebook/react-native fb114da8a4_
  - **affects** — Custom LayoutShadowNode measurement is legacy-architecture only (no Fabric interop for custom shadow nodes) — files: app/containers/markdown/components/Katex.tsx:34,48 — _RN 0.85 changelog: NativeViewHierarchyManager/UIViewOperationQueue stubbed_

### react-native-reanimated — minor bump, required

- Installed 4.1.3 → 4.5.1 (minimum 4.4.0, latest 4.7.1). Work: bump only. Blocks build: yes (android, ios). Confidence 3.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 4.5.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 4.1.3 compatibility.json "4.1.x": RN 0.78–0.82 only, enforced at build time by android/build.gradle:278-287 (assertMinimalReactNativeVersionTask → GradleException) and scripts/reanimated_utils.rb:67-68 (pod install abort). 4.5.1 compatibility.json: 4.4.x/4.5.x → RN 0.83–0.86; peer react-native "0.83 - 0.86", react-native-worklets "0.10.x". metro.config.js wrapWithReanimatedMetroConfig still shipped (metro-config/).
- Breaking changes:
  - **does not affect** — No breaking API change noted 4.2–4.5 for the app (removed PlainStyle type only) — _releases 4.2.0–4.5.0_

### react-native-restart — minor bump, required

- Installed 0.0.22 → 0.0.29 (minimum 0.0.29, latest 0.0.29). Work: bump only. Blocks build: yes (android). Confidence 3.
- Evidence: 0.0.22 android/build.gradle:48 unconditional `jcenter()` → Gradle 9 failure (Gradle 9 removed `jcenter()` (https://docs.gradle.org/current/userguide/upgrading_major_version_9.html "The jcenter() repository API has been removed in Gradle 9.0.0"); RN 0.86.3 template wrapper = gradle-9.3.1 (rn-diff-purge release/0.86.3 android/gradle/wrapper/gradle-wrapper.properties)). 0.0.24 replaced jcenter with mavenCentral (release v0.0.24, PR #187); 0.0.29 is the first version with codegenConfig (TurboModule; 0.0.28 has none) and fixes Android hard restart (release v0.0.29, PR #301).
- Breaking changes:
  - **does not affect** — 0.0.28: RN 0.85.3/AGP 8.12 support, iOS min 15.1 in podspec — _release v0.0.28_
  - **does not affect** — `Restart()` deprecated in favour of `restart()` — files: app/views/LanguageView/index.tsx:56 — _lib/typescript/index.d.ts (0.0.29)_

### react-native-screens — minor bump, required

- Installed 4.17.1 → ~4.26.0 (minimum 4.26.0, latest 4.28.0). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins ~4.26.0; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. Releases 4.26.0–4.26.2: "This version supports React Native 0.84+".
- Open questions: OQ1

### react-native-skeleton-placeholder — replace, required

- Installed 5.2.4 → replace → react-native-reanimated-skeleton 1.6.0 or an in-app skeleton (minimum n/a, latest 5.2.4). Work: replace. Blocks build: no. Confidence 3.
- Evidence: lib/skeleton-placeholder.js:60 and :98 spread `StyleSheet.absoluteFillObject`, which RN 0.85.0 removed (CHANGELOG v0.85.0 Breaking: "Remove deprecated `StyleSheet.absoluteFillObject` API" 5681db09b8; not exported by 0.86.3 Libraries/StyleSheet/StyleSheetExports.js) → spread of undefined, shimmer/mask lose absolute positioning. Last release 2022-11-15; Directory `unmaintained: true`.
- Alternatives: react-native-reanimated-skeleton 1.6.0 (peers react-native-reanimated, react-native-linear-gradient); small in-app skeleton built on react-native-reanimated (already installed); Interim: patch-package replacing `StyleSheet.absoluteFillObject` with `StyleSheet.absoluteFill` at lib/skeleton-placeholder.js:60,98.
- Breaking changes:
  - **affects** — Uses removed `StyleSheet.absoluteFillObject` in rendering code — files: app/containers/MessageComposer/components/Autocomplete/AutocompleteItemLoading.tsx:2, app/containers/UIKit/VideoConferenceBlock/components/VideoConferenceSkeletonLoading.tsx:2 — _lib/skeleton-placeholder.js:60,98_

### react-native-svg — minor bump, required

- Installed 15.12.1 → 15.15.4 (minimum 15.15.4, latest 15.15.5). Work: bump only. Blocks build: unknown. Confidence 2.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 15.15.4; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 15.13.0 dropped RN <0.78 (no effect).
- Open questions: OQ1

### react-native-worklets — major bump, required

- Installed 0.6.1 → 0.10.1 (minimum 0.10.1, latest 0.13.0). Work: bump only. Blocks build: yes (android, ios). Confidence 3.
- Evidence: Expo SDK 57 bundledNativeModules.json (expo@57.0.27) pins 0.10.1; installed version belongs to Expo SDK 54; `npx expo install --fix` moves it. 0.6.1 compatibility.json "0.6.x": RN 0.78–0.82, enforced by android/build.gradle:286-291 (GradleException). 0.10.1 peer react-native "0.83 - 0.86".
- Breaking changes:
  - **does not affect** — 0.7.1: `runOnUIAsync` signature changed; public header dir removed — _release worklets-0.7.1_
  - **does not affect** — 0.10.0: `workletizableModules` replaced by `importForwarding` — files: babel.config.js:10 uses react-native-worklets/plugin without options — _release worklets-0.10.0_

### @gorhom/bottom-sheet — minor bump, recommended

- Installed 5.2.8 → 5.2.14 (minimum 5.2.9, latest 5.2.14). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: 5.2.8 lib/commonjs/components/bottomSheet/BottomSheet.js:1254 and backdrop/background/hostingContainer styles use removed `StyleSheet.absoluteFillObject` (RN 0.85.0); 5.2.9 (2026-04-08) and later contain none (dist grep). devDependency only used by Storybook → not required.
- Breaking changes:
  - **does not affect** — Removed `absoluteFillObject` in 5.2.8 — _Storybook-only_

### @react-native-firebase/analytics — major bump, recommended

- Installed 21.14.0 → 26.4.0 (minimum 26.0.0, latest 26.4.0). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: 21.14.0 is a legacy module (no codegenConfig) → runs through the interop layer. CHANGELOG 26.0.0: "analytics: migrate analytics to TurboModules" (first New-Architecture version). invertase/react-native-firebase#9192 "bump tests RN to 0.86" (2026-08-12). Peers react/react-native "*".
- Breaking changes:
  - **does not affect** — v23: iOS 15+ / Xcode 16.2+, Android minSdk 23, Node 20+ — _CHANGELOG 23.0.0 (Podfile 15.1, minSdk 24)_
  - **affects** — v23 Node 20+ vs app engines ">=18" — files: package.json engines — _CHANGELOG 23.0.0_
  - **unknown** — v25: firebase-ios-sdk 12.12+ requires Xcode 26.2+ — _CHANGELOG 25.0.0 — CI Xcode not visible_
  - **does not affect** — v26: modular `logEvent` returns synchronously — files: app/lib/methods/helpers/log/index.ts:37 (no await) — _analytics CHANGELOG 26.0.0_

### @react-native-firebase/app — major bump, recommended

- Installed 21.14.0 → 26.4.0 (minimum 26.0.0, latest 26.4.0). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: 21.14.0 is a legacy module (no codegenConfig) → runs through the interop layer. CHANGELOG 26.0.0: "App/Core modules native bridge requires New Architecture … migrate app modules to TurboModules" (first New-Architecture version). invertase/react-native-firebase#9192 "bump tests RN to 0.86" (2026-08-12). Peers react/react-native "*".
- Breaking changes:
  - **does not affect** — v23: iOS 15+ / Xcode 16.2+, Android minSdk 23, Node 20+ — _CHANGELOG 23.0.0 (Podfile 15.1, minSdk 24)_
  - **affects** — v23 Node 20+ vs app engines ">=18" — files: package.json engines — _CHANGELOG 23.0.0_
  - **unknown** — v25: firebase-ios-sdk 12.12+ requires Xcode 26.2+ — _CHANGELOG 25.0.0 — CI Xcode not visible_
  - **does not affect** — v26: makePlayServicesAvailable may now reject — _CHANGELOG 26.0.0 (not used)_

### @react-native-firebase/crashlytics — major bump, recommended

- Installed 21.14.0 → 26.4.0 (minimum 26.0.0, latest 26.4.0). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: 21.14.0 is a legacy module (no codegenConfig) → runs through the interop layer. CHANGELOG 26.0.0: "crashlytics: migrate crashlytics to TurboModules" (first New-Architecture version). invertase/react-native-firebase#9192 "bump tests RN to 0.86" (2026-08-12). Peers react/react-native "*".
- Breaking changes:
  - **does not affect** — v23: iOS 15+ / Xcode 16.2+, Android minSdk 23, Node 20+ — _CHANGELOG 23.0.0 (Podfile 15.1, minSdk 24)_
  - **affects** — v23 Node 20+ vs app engines ">=18" — files: package.json engines — _CHANGELOG 23.0.0_
  - **unknown** — v25: firebase-ios-sdk 12.12+ requires Xcode 26.2+ — _CHANGELOG 25.0.0 — CI Xcode not visible_
  - **unknown** — Crashlytics Gradle plugin: app classpath `firebase-crashlytics-gradle:2.9.0` vs RNFB 26.4.0 sdkVersions.android.firebaseCrashlyticsGradle 3.0.8; compatibility of 2.9.0 with Gradle 9.3.1 not verified — files: android/build.gradle:21 — _app/package.json sdkVersions (26.4.0)_
- Open questions: OQ2

### @storybook/react-native — major bump, recommended

- Installed 9.0.18 → 10.6.0 (minimum 10.5.0, latest 10.6.0). Work: code change (2 files). Blocks build: no. Confidence 2.
- Evidence: 9.0.18 dist/index.js:1110 (and 9.1.4, 10.0–10.4) spread removed `StyleSheet.absoluteFillObject` (loading view of the Storybook UI only); 10.5.0 is the first without it (dist grep). Used only with USE_STORYBOOK=true; metro.config.js wraps every bundle with withStorybook, which still works on 9.0.18 → not a build blocker. 10.6.0 peers pin react-native-reanimated "4.5.1" (= SDK 57) and react-native-safe-area-context "5.8.0" (app 5.6.2 → warning).
- Breaking changes:
  - **affects** — v10: `withStorybook` is a named export; `onDisabledRemoveStorybook` removed — files: metro.config.js:2,34-36 — _MIGRATION.md "From version 10.3 to 10.4"_
  - **affects** — v10: storybook and @storybook/react must move to 10.x; regenerate requires file — files: package.json devDependencies, .rnstorybook/storybook.requires.ts — _MIGRATION.md "From version 9 to 10"_

### @types/react-native-background-timer — replace, recommended

- Installed 2.0.2 → remove with react-native-background-timer (minimum n/a, latest 2.0.2). Work: replace. Blocks build: no. Confidence 2.
- Evidence: Companion of react-native-background-timer (devDependency); follows its replacement.

### react-hook-form — minor bump, recommended

- Installed 7.34.2 → 7.89.0 (minimum 7.52.0, latest 7.89.0). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: Installed peer react "^16.8.0 || ^17 || ^18" rejects 19.2.3; 7.52.0 (2024-06-15) is the first 7.x with "^19" (npm registry peerDependencies). pnpm `strictPeerDependencies` default false (pnpm.io/settings) and repo .npmrc sets only node-linker=hoisted → warning, not an install failure.
- Breaking changes:
  - **does not affect** — No breaking changes declared within the 7.x line — _semver_

### react-native-background-timer — replace, recommended

- Installed 2.4.1 → replace (minimum n/a, latest 2.4.1). Work: replace. Blocks build: no. Confidence 2.
- Evidence: Legacy module (no codegenConfig), only release line ends 2.4.1 (2020-10-01), Directory `unmaintained: true` → replace per rule. Android imports compile against 0.86.3 (hasActiveCatalystInstance still on ReactContext.java:182); runs through interop until replaced.
- Alternatives: react-native-background-timer-android 2.0.0 (TurboModule, peer react-native >=0.81; Android only); @boterop/react-native-background-timer 2.6.0 (maintained fork, still legacy); plain JS timers if the videoconf timer does not need to run in background.
- Breaking changes:
  - **affects** — Legacy module, interop only — files: app/lib/methods/videoConfTimer.ts:1,11,12,15

### react-native-console-time-polyfill — replace, recommended

- Installed 1.2.3 → remove (or inline the polyfill) (minimum n/a, latest 1.2.3). Work: replace. Blocks build: no. Confidence 2.
- Evidence: JS-only polyfill, last release 2021-04-03, Directory `unmaintained: true`. index.js already stubs console.time/timeLog in release builds. Works on Hermes (falls back to global.performance.now), so nothing breaks today.
- Alternatives: remove the import (index.js:2) or vendor the ~40-line polyfill.

### react-native-easy-toast — replace, recommended

- Installed 2.3.0 → replace → react-native-toast-message 2.5.2 (minimum n/a, latest 2.3.0). Work: replace. Blocks build: no. Confidence 2.
- Evidence: JS-only, last release 2022-11-18, Directory `unmaintained: true`; no removed RN API found in index.js; app carries patches/react-native-easy-toast+2.3.0.patch (types only).
- Alternatives: react-native-toast-message 2.5.2 (2026-09-08).

### react-native-external-keyboard — major bump, recommended

- Installed 0.9.0 → 1.2.1 (minimum 1.0.0, latest 2.0.1). Work: code change (3 files). Blocks build: no. Confidence 2.
- Evidence: README@2.0.1: RN 0.80 – 0.86 → @1 (1.2.x), ≤0.79 → @0.13, 0.87+ → @2; 0.13.0/0.13.1 declare peer `react-native <0.80.0` and 2.x `>=0.87.0`. Installed 0.9.0 (peer "*", codegen) predates the split; imports compile against 0.86.3 (TurboReactPackage/ReactModuleInfo still present, deprecated).
- Breaking changes:
  - **affects** — 1.0.0: `canBeFocused` removed (use `focusable`) — files: app/containers/RoomHeader/RoomHeader.tsx:235, app/containers/Touch.tsx:86, app/containers/message/components/Touchable/Touch.tsx:104 — _release v1.0.0 "Breaking changes"_
  - **affects** — 1.0.0: `enableA11yFocus` removed (use `screenAutoA11yFocus` or `ref.screenReaderFocus()`) — files: app/containers/RoomHeader/RoomHeader.tsx:233 — _release v1.0.0_
  - **does not affect** — 1.0.0: `group`→`focusableWrapper`, `viewRef`→`componentRef`, `tintType` values, type renames — _grep of 5 importing files_
  - **does not affect** — `KeyboardFocus`, `KeyboardFocusView`, `withKeyboardFocus` still exported — files: app/views/RoomsListView/hooks/useHeader.tsx, app/containers/Header/components/HeaderButton/Common.tsx — _lib/typescript/src/index.d.ts (1.2.1)_

### react-native-file-viewer — replace, recommended

- Installed 2.1.4 → replace → @react-native-documents/viewer 4.0.1 (minimum n/a, latest 2.1.5). Work: replace. Blocks build: no. Confidence 2.
- Evidence: Legacy module (no codegenConfig) in 2.1.4 and latest 2.1.5 (2021-12-12); Directory `unmaintained: true` → replace. Imports compile against 0.86.3; runs through interop until replaced.
- Alternatives: @react-native-documents/viewer 4.0.1 (codegen, peer react-native >=0.79); react-native-file-viewer-turbo 0.8.0 (TurboModule port of this API).
- Breaking changes:
  - **affects** — Legacy module, interop only — files: app/lib/methods/helpers/fileDownload.ts:2,41

### react-native-localize — major bump, recommended

- Installed 2.1.1 → 3.7.2 (minimum 3.0.0, latest 3.7.2). Work: code change (1 file). Blocks build: no. Confidence 2.
- Evidence: 2.1.1 is a legacy module (no codegenConfig) → interop only. Release 3.0.0 "New architecture support 🎉". 3.7.2 has codegenConfig; Directory newArchitecture true.
- Breaking changes:
  - **affects** — `findBestAvailableLanguage` renamed `findBestLanguageTag` — files: app/i18n/index.ts:185 — _release 3.0.0_
  - **does not affect** — Default export removed — files: app/i18n/index.ts:3 uses `import * as RNLocalize` — _release 3.0.0_
  - **does not affect** — `addEventListener` removed — _not used_
  - **does not affect** — iOS ≥12.4 / Android ≥5 / RN ≥0.70 — _release 3.0.0_

### react-redux — major bump, recommended

- Installed 8.0.5 → 9.3.0 (minimum 9.2.0, latest 9.3.0). Work: bump only. Blocks build: no. Confidence 2.
- Evidence: Installed peer react "^16.8 || ^17.0 || ^18.0" rejects 19.2.3; 9.2.0 (2024-12-10) first with "^18.0 || ^19"; no 8.x accepts 19. Peer-only (pnpm non-strict) → warning. v9.0.0 release notes: React 18 required, Redux 5 types, ESM packaging, `noopCheck` → `identityFunctionCheck`.
- Breaking changes:
  - **does not affect** — React 18+ required — _v9.0.0 notes_
  - **unknown** — Types depend on Redux core 5 (`UnknownAction`); optional peer redux ^5.0.0 — files: all `useDispatch`/`connect` call sites (158 files import react-redux); package.json redux 4.2.0 — _dist/react-redux.d.ts:3 (9.3.0)_
  - **does not affect** — `batch` kept as deprecated no-op — files: app/views/RoomsListView/components/ServersList.tsx:3 — _dist/react-redux.d.ts:582-585_
  - **does not affect** — `noopCheck` renamed — _not used_
- Open questions: OQ3

## 5. Native constraints

Values are the raw expressions of the recommended version (installed version where it stays). Note: the app's android/build.gradle:37-49 `subprojects { afterEvaluate { … } }` forces every library module to rootProject.ext compileSdkVersion 36 / minSdkVersion 24 / targetSdkVersion 36, and the 0.86.3 template keeps minSdk 24, compileSdk 36, Kotlin 2.1.20, AGP 8.12.0, iOS 15.1 (expo raises iOS to 16.4, G5).

| library | version | minSdk | compileSdk | Kotlin | AGP | iOS deployment target | source |
|---|---|---|---|---|---|---|---|
| @react-native-community/datetimepicker | 9.1.0 | getExtOrIntegerDefault('minSdkVersion') (rootProject.ext) | getExtOrIntegerDefault('compileSdkVersion') (rootProject.ext) | org.jetbrains.kotlin.android (rootProject) | — | 11.0 | android/build.gradle, RNDateTimePicker.podspec (9.1.0) |
| @react-native-community/netinfo | 12.0.1 | ReactNativeNetInfo_minSdkVersion=16 (rootProject.ext first) | ReactNativeNetInfo_compileSdkVersion=33 (rootProject.ext first) | — | 7.4.2 (standalone) | 14.0 | android/build.gradle, react-native-netinfo.podspec (12.0.1) |
| @react-native-community/slider | 5.2.0 | ReactNativeSlider_minSdkVersion=21 (rootProject.ext first) | ReactNativeSlider_compileSdkVersion=30 (rootProject.ext first) | — | 7.1.1 (buildscript) | 9.0 | android/build.gradle, react-native-slider.podspec (5.2.0) |
| @react-native-cookies/cookies | 6.2.1 | safeExtGet('minSdkVersion', DEFAULT_MIN_SDK_VERSION=21) | safeExtGet('compileSdkVersion', DEFAULT_COMPILE_SDK_VERSION=29) | — | 3.5.3 (buildscript, only when project==rootProject) | 7.0 | android/build.gradle, react-native-cookies.podspec (6.2.1) |
| expo | ~57.0.27 | rootProject.ext | rootProject.ext | rootProject.ext kotlinVersion | — | 16.4 | ExpoModulesCore.podspec:53-57 (expo-modules-core 57.0.21) |
| expo-apple-authentication | ~57.0.2 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.2) |
| expo-av | 16.0.8 | replacements (expo-audio/expo-video ~57.0.5) use the expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 (ExpoModulesCore) | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 |
| expo-camera | ~57.0.6 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.6) |
| expo-device | ~57.0.2 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.2) |
| expo-document-picker | ~57.0.3 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.3) |
| expo-file-system | ~57.0.7 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.7) |
| expo-haptics | ~57.0.3 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.3) |
| expo-image | ~57.0.5 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.5) |
| expo-keep-awake | ~57.0.2 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.2) |
| expo-local-authentication | ~57.0.3 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.3) |
| expo-notifications | ~57.0.22 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.22) |
| expo-status-bar | ~57.0.1 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.1) |
| expo-system-ui | ~57.0.4 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.4) |
| expo-video-thumbnails | ~57.0.2 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.2) |
| expo-web-browser | ~57.0.3 | expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24) | rootProject.ext compileSdkVersion (fallback 36) | rootProject.ext kotlinVersion | — | 16.4 | expo-modules-core@57.0.21 ExpoModulesCorePlugin.gradle:65-69, ExpoModulesCore.podspec:53-57 (~57.0.3) |
| react-native-a11y-order | 1.0.1 | getExtOrIntegerDefault(minSdkVersion) → A11yOrder_minSdkVersion=21 | A11yOrder_compileSdkVersion=31 (rootProject.ext first) | A11yOrder_kotlinVersion=1.7.0 (rootProject.ext first) | — | min_ios_version_supported | android/build.gradle + gradle.properties, react-native-a11y-order.podspec (1.0.1) |
| react-native-gesture-handler | ~2.32.0 | safeExtGet('minSdkVersion', 24) | safeExtGet("compileSdkVersion", 33) | rootProject.ext kotlinVersion or RNGH_kotlinVersion=2.0.21 | 8.10.1 (buildscript) | 11.0 | android/build.gradle + gradle.properties, RNGestureHandler.podspec (2.32.0) |
| react-native-keyboard-controller | 1.21.9 | KeyboardController_minSdkVersion=16 (rootProject.ext first) | KeyboardController_compileSdkVersion=33 (rootProject.ext first) | rootProject.ext kotlinVersion or 1.8.22 | 4.2.2 (buildscript) | 11.0 | android/build.gradle + gradle.properties, podspec (1.21.9) |
| react-native-math-view | 3.9.5 | safeExtGet("minSdkVersion", 19) | safeExtGet("compileSdkVersion", 28) | — | 3.3.2 (buildscript classpath, unconditional) | 7.0 | android/build.gradle, ios/RNMathView.podspec (3.9.5) |
| react-native-reanimated | 4.5.1 | safeExtGet("minSdkVersion", 24) | safeExtGet("compileSdkVersion", 36) | org.jetbrains.kotlin.android (rootProject) | — | 13.4 (ios_min_version) | android/build.gradle.kts, RNReanimated.podspec (4.5.1) |
| react-native-restart | 0.0.29 | safeExtGet(minSdkVersion) ?: 24 | safeExtGet(compileSdkVersion) ?: 36 | — | 8.12.0 (buildscript, when standalone) | 15.1 | android/build.gradle + gradle.properties, react-native-restart.podspec (0.0.29) |
| react-native-screens | ~4.26.0 | safeExtGet(['minSdkVersion','minSdk'], rnsDefaultMinSdkVersion=21) | safeExtGet(compileSdkVersion, rnsDefaultCompileSdkVersion=34) | safeExtGet('kotlinVersion', rnsDefaultKotlinVersion='1.8.0') | 8.2.1 (standalone) | 15.1 | android/build.gradle, RNScreens.podspec (4.26.2) |
| react-native-svg | 15.15.4 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 28) | — | 7.4.2 (standalone) | 12.4 | android/build.gradle, RNSVG.podspec (15.15.4) |
| react-native-worklets | 0.10.1 | safeExtGet("minSdkVersion", 24) | safeExtGet("compileSdkVersion", 36) | org.jetbrains.kotlin.android (rootProject) | — | 13.4 (ios_min_version) | android/build.gradle.kts, RNWorklets.podspec (0.10.1) |
| @react-native-firebase/analytics | 26.4.0 | from @react-native-firebase/app sdkVersions (23) | from app sdkVersions (34) | — | 8.4.0 (standalone) | 15.0 (firebase_ios_target) | android/build.gradle, RNFBAnalytics.podspec (26.4.0) |
| @react-native-firebase/app | 26.4.0 | package.json sdkVersions.android.minSdk = 23 | sdkVersions.android.compileSdk = 34 (rootProject.ext overrides) | — | 8.4.0 (buildscript, standalone) | firebase_ios_target = sdkVersions.ios.iosTarget 15.0 | android/build.gradle, RNFBApp.podspec, package.json (26.4.0) |
| @react-native-firebase/crashlytics | 26.4.0 | from @react-native-firebase/app sdkVersions (23) | from app sdkVersions (34) | — | 8.4.0 (standalone) | 15.0 (firebase_ios_target) | android/build.gradle, RNFBCrashlytics.podspec (26.4.0) |
| react-native-background-timer | 2.4.1 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 28) | — | — | 8.0 | android/build.gradle, podspec (2.4.1) |
| react-native-external-keyboard | 1.2.1 | ExternalKeyboard_minSdkVersion=21 (rootProject.ext first) | ExternalKeyboard_compileSdkVersion=31 (rootProject.ext first) | ExternalKeyboard_kotlinVersion=1.7.0 (rootProject.ext first) | — | min_ios_version_supported | android/build.gradle + gradle.properties, podspec (1.2.1) |
| react-native-file-viewer | 2.1.4 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 28) | — | — | 9.0 | android/build.gradle, RNFileViewer.podspec (2.1.4) |
| react-native-localize | 3.7.2 | safeExtGet("minSdkVersion", 24) | safeExtGet("compileSdkVersion", 35) | safeExtGet("kotlinVersion", "1.9.24") | 8.13.0 (buildscript) | 12.4 | android/build.gradle, RNLocalize.podspec (3.7.2) |
| @bugsnag/react-native | 8.4.0 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 28) | — | — | 9.0 | android/build.gradle, BugsnagReactNative.podspec (8.4.0) |
| @lodev09/react-native-true-sheet | 3.7.3 | TrueSheet_minSdkVersion=24 (rootProject.ext first) | TrueSheet_compileSdkVersion=35 (rootProject.ext first) | TrueSheet_kotlinVersion=2.0.21 (rootProject.ext first) | 8.7.2 (buildscript) | min_ios_version_supported | android/build.gradle + gradle.properties, RNTrueSheet.podspec (3.7.3) |
| @nozbe/watermelondb | 0.28.1-0 | rootProject.minSdkVersion or DEFAULT 16 | rootProject.compileSdkVersion or DEFAULT 28 | ReactNativeWatermelonDB_kotlinVersion=1.3.50 (rootProject.ext first) | — | 12.0 | native/android-jsi/build.gradle, native/android/gradle.properties, WatermelonDB.podspec |
| @react-native-async-storage/async-storage | 2.2.0 | AsyncStorageConfig.minSdkVersion | AsyncStorageConfig.compileSdkVersion | AsyncStorageConfig.kotlinVersion | — | 13.4 | android/build.gradle, RNCAsyncStorage.podspec (2.2.0) |
| @react-native-camera-roll/camera-roll | 7.10.2 | ReactNativeCameraRoll_minSdkVersion=23 (rootProject.ext first) | ReactNativeCameraRoll_compileSdkVersion=33 (rootProject.ext first) | — | 4.2.2 (standalone only) | 9.0 | android/build.gradle, react-native-cameraroll.podspec |
| @react-native-clipboard/clipboard | 1.16.3 | ReactNativeClipBoard_minSdkVersion=16 (rootProject.ext first) | ReactNativeClipBoard_compileSdkVersion=30 (rootProject.ext first) | — | 3.2.1 (unconditional buildscript classpath, unchanged from today) | 11.0 (new arch) | android/build.gradle, RNCClipboard.podspec |
| @react-native-masked-view/masked-view | 0.3.2 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 28) | — | 4.1.2 (standalone) | 9.0 | android/build.gradle, RNCMaskedView.podspec (0.3.2) |
| @react-native-picker/picker | 2.11.4 | safeExtGet('minSdkVersion', 21) | safeExtGet('compileSdkVersion', 31) | — | 7.2.0 (standalone) | 9.0 | android/build.gradle, RNCPicker.podspec (2.11.4) |
| @rocket.chat/mobile-crypto | git RocketChat/rocket.chat-mobile-crypto@69a0a250 (0.4.0) | MobileCrypto_minSdkVersion=24 (rootProject.ext first) | MobileCrypto_compileSdkVersion=36 | MobileCrypto_kotlinVersion=2.1.20 | 8.12.0 (buildscript) | min_ios_version_supported | android/build.gradle + gradle.properties, MobileCrypto.podspec |
| @zoontek/react-native-navigation-bar | 1.1.2 | safeExtGet("minSdkVersion", 24) | safeExtGet("compileSdkVersion", 35) | safeExtGet("kotlinVersion", "2.1.20") | 8.13.0 (buildscript) | n/a (no podspec) | android/build.gradle |
| react-native-bootsplash | ^6.3.10 | safeExtGet("minSdkVersion", 23) | safeExtGet("compileSdkVersion", 34) | safeExtGet("kotlinVersion", "1.8.0") | 7.3.1 (buildscript) | 12.4 | android/build.gradle, RNBootSplash.podspec (6.3.11) |
| react-native-callkeep | 4.3.16 | safeExtGet('minSdkVersion', 23) | safeExtGet('compileSdkVersion', 28) | — | 3.0.1 (standalone only) | 8.0 | android/build.gradle, RNCallKeep.podspec |
| react-native-device-info | 11.1.0 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 34) | — | ext 'buildGradlePluginVersion' or 4.2.0 (standalone) | 9.0 | android/build.gradle, RNDeviceInfo.podspec |
| react-native-image-crop-picker | git RocketChat/react-native-image-crop-picker@47092e8c (0.51.1) | safeExtGet('minSdkVersion', 23) | safeExtGet('compileSdkVersion', 34) | — | — | 8.0 | android/build.gradle, RNImageCropPicker.podspec |
| react-native-incall-manager | 4.2.1 | safeExtGet('minSdkVersion', 21) | safeExtGet('compileSdkVersion', 33) | — | — | 8.0 / platform 9.0 | android/build.gradle, ReactNativeIncallManager.podspec |
| react-native-linear-gradient | 2.6.2 | safeExtGet('minSdkVersion', 16) | safeExtGet('compileSdkVersion', 28) | — | 3.5.3 (standalone only) | 9.0 | android/build.gradle, BVLinearGradient.podspec |
| react-native-mmkv | 4.1.2 | NitroMmkv_minSdkVersion=23 (rootProject.ext first) | NitroMmkv_compileSdkVersion=36 | NitroMmkv_kotlinVersion=2.1.20 | 8.13.1 (buildscript) | min_ios_version_supported | android/build.gradle + gradle.properties, NitroMmkv.podspec |
| react-native-nitro-modules | 0.33.9 | Nitro_minSdkVersion=23 (rootProject.ext first) | Nitro_compileSdkVersion=36 | Nitro_kotlinVersion=2.1.20 | 9.0.0 (buildscript) | min_ios_version_supported | android/build.gradle + gradle.properties, NitroModules.podspec |
| react-native-webrtc | 124.0.7 | 24 (hard-coded) | safeExtGet('compileSdkVersion', 24) | — | — | 12.0 | android/build.gradle, react-native-webrtc.podspec |
| react-native-webview | 13.16.1 | getExtOrIntegerDefault('minSdkVersion') / ReactNativeWebView_minSdkVersion=21 | ReactNativeWebView_compileSdkVersion=31 (rootProject.ext first) | safeExtGet('kotlinVersion') / 1.6.0 | 7.0.4 (buildscript) | 11.0 (new arch) | android/build.gradle + gradle.properties, react-native-webview.podspec (13.16.1) |

## 6. Patches

Re-verify on the new version (the patched package moves):

| patch | moves to | status |
|---|---|---|
| patches/react-native+0.81.5.patch | react-native 0.86.3 (template diff) | Hunk 2 (scripts/cocoapods/new_architecture.rb `excluded_info_plist` + `.xcframework`, `.framework`) is upstream: 0.86.3 new_architecture.rb:171 already contains it → drop. Hunk 1 (React/Views/RCTViewManager.m accessibilityRole/role comparison) is not upstream (0.86.3 RCTViewManager.m:226,236 unchanged) → re-create the patch as react-native+0.86.3.patch. |
| patches/expo-file-system+19.0.21.patch | expo-file-system ~57.0.7 | Not upstream (57.0.7 legacy/FileSystemLegacyModule.kt:86 still `private var client`). **Mandatory**: android SSLPinningTurboModule.java:138 calls the `setOkHttpClient` the patch adds; re-port or Android compile fails. |
| patches/react-native-gesture-handler+2.28.0.patch | react-native-gesture-handler ~2.32.0 | Not upstream (2.32.0 apple/RNGestureHandlerButton.mm has no `canBecomeFocused`/`pressesBegan`) → re-create for 2.32.x. |
| patches/expo-asset+12.0.12.patch | expo-asset ~57.0.19 (dependency of expo 57.0.27) | Re-verify (Android ≤ 8 raw-asset early return in AssetModule.kt); not checked against 57.x. |
| patches/expo-font+14.0.10.patch | expo-font ~57.0.4 (dependency of expo 57.0.27) | Re-verify (Android ≤ 8 font-from-assets fallback in FontLoaderModule.kt); not checked against 57.x. |

Become moot if the library is replaced: patches/react-native-easy-toast+2.3.0.patch (react-native-easy-toast → replace).

Stay as they are (package does not move): @lodev09/react-native-true-sheet 3.7.3, react-native-callkeep 4.3.16, react-native-mmkv 4.1.2, react-native-modal 13.0.1, react-native-notifier 1.6.1, react-native-webview 13.16.1 (SDK 57 pins the same version), @react-navigation/core 7.21.1, @hookform/resolvers 2.9.11 (peer react-hook-form ^7.0.0 still satisfied after the react-hook-form bump), @types/ejson 2.2.2, js-base64 3.6.1, oxlint-plugin-complexity 2.1.8, react-native-picker-select 9.0.1, remove-markdown 0.3.0.

## 7. Not audited

- handled-by-diff: react, react-native, react-native-safe-area-context (5.6.2; Expo SDK 57 bundles ~5.7.0, @storybook/react-native 10.6.0 peers 5.8.0), @react-native/codegen (0.80.2 — the app's own codegenConfig "SSLPinning" uses it; should follow 0.86.3), @babel/core, @babel/preset-env, @babel/runtime, @react-native-community/cli, @react-native-community/cli-platform-android, @react-native-community/cli-platform-ios, @react-native/babel-preset, @react-native/metro-config, @react-native/typescript-config, @types/jest, @types/react, jest, react-dom, typescript. (Template also adds @react-native/jest-preset 0.86.3 and react-test-renderer 19.2.3.)
- first-party: none.
- js-only: @hookform/resolvers, @rocket.chat/media-signaling, @rocket.chat/message-parser, @rocket.chat/ui-kit, axios, bytebuffer, color2k, dayjs, dequal, ejson, eslint-import-resolver-typescript, hoist-non-react-statics, i18n-js, js-base64, js-sha256, jsrsasign, lodash, mitt, pretty-bytes, react-native-animatable, react-native-easy-grid, react-native-mime-types, react-native-picker-select, react-native-popover-view, redux, redux-immutable-state-invariant, redux-saga, remove-markdown, reselect, semver, transliteration, typed-redux-saga, ua-parser-js (override 1.0.2), uri-js, url-parse, use-debounce, use-deep-compare-effect, xregexp, yup, zustand, @babel/plugin-proposal-decorators, @babel/plugin-transform-named-capturing-groups-regex, @bugsnag/cli, @bugsnag/source-maps, @storybook/react (moves to 10.x with @storybook/react-native), @types/bytebuffer, @types/ejson, @types/i18n-js, @types/invariant, @types/jsrsasign, @types/lodash, @types/node, @types/semver, @types/ua-parser-js, @types/url-parse, babel-jest, babel-loader, babel-plugin-module-resolver, babel-plugin-react-compiler, babel-plugin-transform-remove-console, emojibase-data, eslint-plugin-react-native, fast-glob, identity-obj-proxy, jest-cli, oxfmt, oxlint, oxlint-plugin-complexity, patch-package, react-native-dotenv, sniffler, storybook (moves to 10.x with @storybook/react-native).

## 8. Open questions

- **OQ1** — For the expo-sdk rows marked "blocks build: unknown" (babel-preset-expo, @react-native-community/datetimepicker, netinfo, slider, react-native-keyboard-controller, react-native-screens, react-native-svg and the SDK-54 expo-* modules): does the installed SDK-54 / pre-0.86 version compile against RN 0.86.3 + expo-modules-core 57? Not verified (only expo-av, gesture-handler, reanimated and worklets were proven to break). Moot if `npx expo install --fix` is run, which the report requires anyway.
- **OQ2** — android/build.gradle:21 pins `com.google.firebase:firebase-crashlytics-gradle:2.9.0` (and google-services 4.4.1). Does 2.9.0 work with Gradle 9.3.1 / AGP 8.12.0? @react-native-firebase 26.4.0 declares firebaseCrashlyticsGradle 3.0.8 and gmsGoogleServicesGradle 4.5.0 in its package.json `sdkVersions`; aligning them is the low-risk path.
- **OQ3** — react-redux 9.x types import `UnknownAction` from redux 5 while the app pins redux 4.2.0 (skipLibCheck: true hides the import error, but `useDispatch`/`connect` typings may degrade). Run `pnpm lint` (oxlint && tsc) after the bump; decide whether to also move redux to 5.x.
- **OQ4** — With expo 57, importing `expo` (expo-camera 57 does) installs expo/fetch as global `fetch` unless `EXPO_PUBLIC_USE_RN_FETCH=1`. The app's client-certificate/SSL-pinning hooks only RN networking (Android NetworkingModule.setCustomClientBuilder in SSLPinningTurboModule.java:126; iOS RCTHTTPRequestHandler category in ios/Libraries/SSLPinning.mm:15). Should the app opt out (EXPO_PUBLIC_USE_RN_FETCH=1 in .env / build env) or port the pinning to expo/fetch? Verify REST calls against a server that requires a client certificate.
- **OQ5** — Legacy (interop-layer) modules kept "ok as is" need a device pass on 0.86.3 (Android and iOS with RCT_REMOVE_LEGACY_ARCH=1 default): @nozbe/watermelondb (JSI install + DB), react-native-callkeep (VoIP), react-native-incall-manager, react-native-webrtc (calls), react-native-device-info, react-native-linear-gradient (skeletons), and, until bumped/replaced, @react-native-firebase 21, react-native-localize 2, react-native-background-timer, react-native-file-viewer.
- **OQ6** — @react-native-community/slider is not imported anywhere in the app (nor required by another dependency's peers in pnpm-lock.yaml): keep it (and take SDK 57's 5.2.0, or 5.2.1 for the iOS ≥0.84 thumb-image fix) or remove it?

## 8b. Verification

`git status --porcelain` was empty before and after the audit (no repository file changed). Scratch work lives outside the repository.

## 9. Data

```json
{
  "schemaVersion": 1,
  "rn": {
    "from": "0.81.5",
    "to": "0.86.3"
  },
  "summary": {
    "audited": 79,
    "required": 32,
    "recommended": 14,
    "needsHuman": 0,
    "byVerdict": {
      "replace": 9,
      "minor bump": 9,
      "major bump": 28,
      "ok as is": 33
    }
  },
  "globalConstraints": [
    {
      "id": "G1-react",
      "description": "Target needs react 19.2.3. Installed react peers that reject it: react-hook-form 7.34.2 (\"^16.8.0 || ^17 || ^18\") and react-redux 8.0.5 (\"^16.8 || ^17.0 || ^18.0\"). pnpm 10.33.4 with default strictPeerDependencies=false and .npmrc containing only node-linker=hoisted → install warns, does not fail. jest-expo 54.0.16 also pins react-test-renderer 19.1.0 (≠ 19.2.3); jest-expo 57.0.5 pins 19.2.3. Latest react-native-a11y-order / react-native-external-keyboard (2.x) require react-native >=0.87 and must not be taken.",
      "blocksBuild": false,
      "targets": [],
      "evidence": "inventory peers; npm registry; https://pnpm.io/settings#strictpeerdependencies (\"Default: false\"); package.json packageManager pnpm@10.33.4; .npmrc"
    },
    {
      "id": "G2-node",
      "description": "App engines.node \">=18\" vs react-native 0.86.3 \"^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0\" (template \">= 22.11.0\"). Allowed by the app but rejected by the target: 18.x, 19.x, 20.0.0–20.19.3, 21.x, 22.0.0–22.12.x, 23.x, 24.0.0–24.2.x. volta pins 24.13.1 (accepted) and .github/actions/setup-node reads package.json; .github/workflows/organize_translations.yml uses Node 18 but only runs `node scripts/organize-translations.js` (no install/build). @react-native-firebase ≥23 also requires Node 20+.",
      "blocksBuild": false,
      "targets": [],
      "evidence": "package.json engines/volta; react-native@0.86.3 package.json engines; rn-diff-purge 0.86.3 package.json; .github/workflows/organize_translations.yml:23"
    },
    {
      "id": "G3-workspaces",
      "description": "No other workspaces pin react/react-native/react-dom (workspacePins = []); single pnpm importer with node-linker=hoisted → one react-native in node_modules; no duplicate-React risk.",
      "blocksBuild": false,
      "targets": [],
      "evidence": "inventory workspacePins; pnpm-lock.yaml importers: only \".\"; .npmrc node-linker=hoisted"
    },
    {
      "id": "G4-patches",
      "description": "All 19 patches live in the app root (patches/*.patch, applied by postinstall patch-package); none belong to another workspace. Moving ones are listed in section 6.",
      "blocksBuild": false,
      "targets": [],
      "evidence": "inventory patches[]"
    },
    {
      "id": "G5-ios-deployment-target",
      "description": "Expo SDK 56+ raised the minimum iOS of expo and every expo-* module to 16.4 (ExpoModulesCore.podspec 57.0.21 `:ios => '16.4'`, Swift 6.0). ios/Podfile:4 has `platform :ios, '15.1'` (= RN 0.86 min_ios_version_supported) → `pod install` fails for ExpoModulesCore until the Podfile platform (and the Xcode targets' IPHONEOS_DEPLOYMENT_TARGET for Rocket.Chat, NotificationService, share/watch extensions) is raised to ≥16.4.",
      "blocksBuild": true,
      "targets": [
        "ios"
      ],
      "evidence": "expo CHANGELOG 56.0.0 (#43296); expo-template-bare-minimum 57.0.29 ios/Podfile:23 default 16.4; ios/Podfile:4"
    },
    {
      "id": "G6-gradle-9",
      "description": "The 0.86.3 template moves Android to Gradle 9.3.1 (AGP 8.12.0, Kotlin 2.1.20), and Gradle 9 removed `jcenter()`. Unguarded `jcenter()` calls: @react-native-cookies/cookies 6.2.1 android/build.gradle:70, react-native-math-view 3.9.5 android/build.gradle:34,54, react-native-restart 0.0.22 android/build.gradle:48 (no other Gradle-9-removed API found in any audited package build file).",
      "blocksBuild": true,
      "targets": [
        "android"
      ],
      "evidence": "rn-diff-purge release/0.86.3 gradle-wrapper.properties (gradle-9.3.1); react-native@0.86.3 gradle/libs.versions.toml; https://docs.gradle.org/current/userguide/upgrading_major_version_9.html"
    },
    {
      "id": "G7-legacy-arch-removal",
      "description": "New Architecture is mandatory since 0.82 (gradle.properties already newArchEnabled=true) and since 0.84 iOS builds compile with RCT_REMOVE_LEGACY_ARCH=1 by default (RCTUIManager addUIBlock/viewForReactTag become stubs; bridgeless RCTBridgeProxy still serves bridge.uiManager). Legacy modules kept \"ok as is\" (watermelondb, callkeep, device-info, incall-manager, linear-gradient, webrtc) run through the interop layer and must be tested on device.",
      "blocksBuild": false,
      "targets": [],
      "evidence": "RN CHANGELOG v0.82.0/v0.84.0 Breaking; facebook/react-native c7f433a413; react-native@0.86.3 React/Modules/RCTUIManager.mm:1629-1733, React/Base/RCTBridgeProxy.mm:375-451"
    }
  ],
  "libraries": [
    {
      "name": "@react-native-community/datetimepicker",
      "installed": "8.4.4",
      "recommended": "9.1.0",
      "minimumSupporting": "9.1.0",
      "latest": "9.2.1",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "9.0.0: Android `positiveButtonLabel`, `negativeButtonLabel`, `neutralButtonLabel` removed",
          "affects": "no",
          "files": [
            "3 importing files use none of them"
          ]
        }
      ],
      "native": {
        "minSdk": "getExtOrIntegerDefault('minSdkVersion') (rootProject.ext)",
        "compileSdk": "getExtOrIntegerDefault('compileSdkVersion') (rootProject.ext)",
        "kotlin": "org.jetbrains.kotlin.android (rootProject)",
        "agp": null,
        "iosDeploymentTarget": "11.0"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "@react-native-community/netinfo",
      "installed": "11.4.1",
      "recommended": "12.0.1",
      "minimumSupporting": "12.0.1",
      "latest": "12.0.1",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "12.0.0: iOS 14+, Wi-Fi details via NEHotspotNetwork need the Access Wi-Fi Information entitlement",
          "affects": "no",
          "files": [
            "4 importing files do not read ssid/bssid"
          ]
        }
      ],
      "native": {
        "minSdk": "ReactNativeNetInfo_minSdkVersion=16 (rootProject.ext first)",
        "compileSdk": "ReactNativeNetInfo_compileSdkVersion=33 (rootProject.ext first)",
        "kotlin": null,
        "agp": "7.4.2 (standalone)",
        "iosDeploymentTarget": "14.0"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "@react-native-community/slider",
      "installed": "5.0.1",
      "recommended": "5.2.0",
      "minimumSupporting": "5.2.0",
      "latest": "5.2.1",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "ReactNativeSlider_minSdkVersion=21 (rootProject.ext first)",
        "compileSdk": "ReactNativeSlider_compileSdkVersion=30 (rootProject.ext first)",
        "kotlin": null,
        "agp": "7.1.1 (buildscript)",
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": [
        "OQ1",
        "OQ6"
      ]
    },
    {
      "name": "@react-native-cookies/cookies",
      "installed": "6.2.1",
      "recommended": "replace → @preeternal/react-native-cookie-manager 7.0.0",
      "minimumSupporting": null,
      "latest": "6.2.1",
      "verdict": "replace",
      "need": "required",
      "work": "replace",
      "filesAffected": 1,
      "blocksBuild": true,
      "targets": [
        "android"
      ],
      "dependsOn": [],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "android/build.gradle:70 calls `jcenter()`, removed in Gradle 9 → Android configuration fails",
          "affects": "yes",
          "files": [
            "android/build.gradle (Gradle 9.3.1 after template diff)"
          ]
        },
        {
          "summary": "Legacy NativeModule (CookieManager) only runs through the interop layer",
          "affects": "yes",
          "files": [
            "app/views/JitsiMeetView/index.tsx:1,39,44"
          ]
        }
      ],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', DEFAULT_MIN_SDK_VERSION=21)",
        "compileSdk": "safeExtGet('compileSdkVersion', DEFAULT_COMPILE_SDK_VERSION=29)",
        "kotlin": null,
        "agp": "3.5.3 (buildscript, only when project==rootProject)",
        "iosDeploymentTarget": "7.0"
      },
      "openQuestions": []
    },
    {
      "name": "babel-preset-expo",
      "installed": "54.0.9",
      "recommended": "~57.0.14",
      "minimumSupporting": "~57.0.14",
      "latest": "57.0.14",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo",
      "installed": "54.0.30",
      "recommended": "~57.0.27",
      "minimumSupporting": "~57.0.27",
      "latest": "57.0.27",
      "verdict": "major bump",
      "need": "required",
      "work": "code change (2 files)",
      "filesAffected": 2,
      "blocksBuild": true,
      "targets": [
        "ios"
      ],
      "dependsOn": [],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "iOS: `bindReactNativeFactory` removed from ExpoAppDelegate",
          "affects": "yes",
          "files": [
            "ios/AppDelegate.swift:46"
          ]
        },
        {
          "summary": "Minimum iOS 16.4 for expo and every expo-* module",
          "affects": "yes",
          "files": [
            "ios/Podfile:4",
            "Xcode targets Rocket.Chat / NotificationService / ShareRocketChatRN"
          ]
        },
        {
          "summary": "expo/fetch replaces global `fetch` whenever the `expo` entry is loaded (opt out with EXPO_PUBLIC_USE_RN_FETCH=1); expo-camera 57 build/PictureRef.js:1 imports from 'expo'",
          "affects": "yes",
          "files": [
            "android/app/src/main/java/chat/rocket/reactnative/networking/SSLPinningTurboModule.java:126 (NetworkingModule.setCustomClientBuilder — client certificates)",
            "ios/Libraries/SSLPinning.mm:15 (RCTHTTPRequestHandler challenge category)",
            "app/lib/methods/helpers/fetch.ts"
          ]
        },
        {
          "summary": "Android: ReactNativeHostWrapper deleted",
          "affects": "no",
          "files": [
            "android/app/src/main/java/chat/rocket/reactnative/MainApplication.kt (uses DefaultReactNativeHost + ApplicationLifecycleDispatcher, still present in expo 57)"
          ]
        },
        {
          "summary": "`@expo/vector-icons` no longer a dependency of `expo`",
          "affects": "no",
          "files": [
            "package.json lists @expo/vector-icons directly"
          ]
        },
        {
          "summary": "Transitive expo-asset ~57.0.19 / expo-font ~57.0.4 move; both are patched by the app",
          "affects": "unknown",
          "files": [
            "patches/expo-asset+12.0.12.patch",
            "patches/expo-font+14.0.10.patch"
          ]
        }
      ],
      "native": {
        "minSdk": "rootProject.ext",
        "compileSdk": "rootProject.ext",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ4"
      ]
    },
    {
      "name": "expo-apple-authentication",
      "installed": "8.0.8",
      "recommended": "~57.0.2",
      "minimumSupporting": "~57.0.2",
      "latest": "57.0.2",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-av",
      "installed": "16.0.8",
      "recommended": "replace → expo-audio ~57.0.5 + expo-video ~57.0.5",
      "minimumSupporting": null,
      "latest": "16.0.8",
      "verdict": "replace",
      "need": "required",
      "work": "replace",
      "filesAffected": 15,
      "blocksBuild": true,
      "targets": [
        "android"
      ],
      "dependsOn": [
        "expo"
      ],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "Package removed from the SDK; KeepAwakeManager import no longer resolves against expo-modules-core 57",
          "affects": "yes",
          "files": [
            "app/lib/methods/AudioManager.ts",
            "app/containers/AudioPlayer/index.tsx",
            "app/containers/MessageComposer/components/RecordAudio/RecordAudio.tsx",
            "app/containers/MessageComposer/components/RecordAudio/Duration.tsx",
            "app/containers/MessageComposer/components/Buttons/MicOrSendButton.tsx",
            "app/containers/Ringer/index.tsx",
            "app/lib/constants/audio.ts",
            "app/lib/services/voip/playCallEndedSound.ts",
            "app/views/AttachmentView.tsx",
            "app/views/ShareView/Preview.tsx",
            "app/views/CallView/index.tsx",
            "app/views/CallView/components/Dialpad/DialpadContext.tsx",
            "tests: playCallEndedSound.test.ts, AttachmentView.test.tsx, jest.setup.js"
          ]
        }
      ],
      "native": {
        "minSdk": "replacements (expo-audio/expo-video ~57.0.5) use the expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4 (ExpoModulesCore)"
      },
      "openQuestions": []
    },
    {
      "name": "expo-camera",
      "installed": "17.0.10",
      "recommended": "~57.0.6",
      "minimumSupporting": "~57.0.6",
      "latest": "57.0.6",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        },
        {
          "summary": "android/build.gradle adds maven repo `node_modules/expo-camera/android/maven`, absent in 17.0.10 and 57.0.6 (harmless leftover)",
          "affects": "no",
          "files": [
            "android/build.gradle:30-33"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-device",
      "installed": "8.0.10",
      "recommended": "~57.0.2",
      "minimumSupporting": "~57.0.2",
      "latest": "57.0.2",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        },
        {
          "summary": "55.0.15: some iOS model names changed",
          "affects": "no",
          "files": [
            "app/lib/notifications/push.ts:132 uses only Device.isDevice"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-document-picker",
      "installed": "14.0.8",
      "recommended": "~57.0.3",
      "minimumSupporting": "~57.0.3",
      "latest": "57.0.3",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-file-system",
      "installed": "19.0.21",
      "recommended": "~57.0.7",
      "minimumSupporting": "~57.0.7",
      "latest": "57.0.7",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        },
        {
          "summary": "56.0.0: File/Directory `copy()`/`move()`, `File.write()`, FileHandle read/writeBytes become async",
          "affects": "no",
          "files": [
            "app imports only `expo-file-system/legacy` (10 files); legacy.ts still exported in 57.0.7"
          ]
        },
        {
          "summary": "App native code calls `FileSystemLegacyModule.setOkHttpClient`, which only exists through patches/expo-file-system+19.0.21.patch; 57.0.7 FileSystemLegacyModule.kt:86 still has `private var client` → patch must be re-ported or Android compile fails",
          "affects": "yes",
          "files": [
            "android/app/src/main/java/chat/rocket/reactnative/networking/SSLPinningTurboModule.java:36,138",
            "patches/expo-file-system+19.0.21.patch"
          ]
        },
        {
          "summary": "iOS SSLPinning.mm imports EXSessionTaskDispatcher.h (still shipped in 57.0.7 ios/Legacy/EXSessionTasks)",
          "affects": "no",
          "files": [
            "ios/Libraries/SSLPinning.mm:13,24"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-haptics",
      "installed": "15.0.8",
      "recommended": "~57.0.3",
      "minimumSupporting": "~57.0.3",
      "latest": "57.0.3",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-image",
      "installed": "3.0.11",
      "recommended": "~57.0.5",
      "minimumSupporting": "~57.0.5",
      "latest": "57.0.5",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        },
        {
          "summary": "App native code uses expo.modules.image.okhttp.GlideUrlWrapper / GlideUrlWrapperLoader.Factory and SDWebImage",
          "affects": "no",
          "files": [
            "android/app/src/main/java/chat/rocket/reactnative/networking/ExpoImageClient.java:12-13",
            "ios/Libraries/Challenge.mm:12"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-keep-awake",
      "installed": "15.0.8",
      "recommended": "~57.0.2",
      "minimumSupporting": "~57.0.2",
      "latest": "57.0.2",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-local-authentication",
      "installed": "17.0.8",
      "recommended": "~57.0.3",
      "minimumSupporting": "~57.0.3",
      "latest": "57.0.3",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-notifications",
      "installed": "0.32.15",
      "recommended": "~57.0.22",
      "minimumSupporting": "~57.0.22",
      "latest": "57.0.22",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        },
        {
          "summary": "55.0.0: iOS pod renamed EXNotifications → ExpoNotifications; Expo Go throws for push",
          "affects": "no",
          "files": [
            "no app native reference to EXNotifications (grep ios/ android/)"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-status-bar",
      "installed": "3.0.9",
      "recommended": "~57.0.1",
      "minimumSupporting": "~57.0.1",
      "latest": "57.0.1",
      "verdict": "major bump",
      "need": "required",
      "work": "code change (1 file)",
      "filesAffected": 1,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        },
        {
          "summary": "56.0.0: removed `backgroundColor`, `translucent`, `networkActivityIndicatorVisible` props and setters (#44196)",
          "affects": "yes",
          "files": [
            "app/containers/StatusBar.tsx:18 (`backgroundColor` prop)"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-system-ui",
      "installed": "6.0.9",
      "recommended": "~57.0.4",
      "minimumSupporting": "~57.0.4",
      "latest": "57.0.4",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-video-thumbnails",
      "installed": "10.0.8",
      "recommended": "~57.0.2",
      "minimumSupporting": "~57.0.2",
      "latest": "57.0.2",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "expo-web-browser",
      "installed": "15.0.10",
      "recommended": "~57.0.3",
      "minimumSupporting": "~57.0.3",
      "latest": "57.0.3",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "expo"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "SDK 56: minimum iOS/tvOS raised to 16.4 (expo/expo#43296)",
          "affects": "yes",
          "files": [
            "ios/Podfile:4 `platform :ios, '15.1'` (+ IPHONEOS_DEPLOYMENT_TARGET of the app and extension targets) — see G5"
          ]
        }
      ],
      "native": {
        "minSdk": "expo-modules-core plugin: rootProject.ext minSdkVersion (fallback 24)",
        "compileSdk": "rootProject.ext compileSdkVersion (fallback 36)",
        "kotlin": "rootProject.ext kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "16.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "jest-expo",
      "installed": "54.0.16",
      "recommended": "~57.0.5",
      "minimumSupporting": "~57.0.5",
      "latest": "57.0.5",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "expo",
        "@react-native/jest-preset"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "Needs @react-native/jest-preset 0.86.3 installed",
          "affects": "yes",
          "files": [
            "package.json devDependencies (template diff)",
            "jest.preset.js:2"
          ]
        }
      ],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-a11y-order",
      "installed": "0.4.0",
      "recommended": "1.0.1",
      "minimumSupporting": "1.0.0",
      "latest": "2.0.1",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "1.0.0: native layers overhauled, props types moved to co-located *.types.ts, new A11y.Card",
          "affects": "no",
          "files": []
        },
        {
          "summary": "0.9.0: iOS native layer changed for RN 0.85 framework builds (VoiceOver focus tracking)",
          "affects": "yes",
          "files": [
            "app/containers/message/components/MessageA11yOrder.tsx",
            "app/containers/message/components/MessageA11yIndex.tsx",
            "app/containers/CallHeader.tsx",
            "…"
          ]
        }
      ],
      "native": {
        "minSdk": "getExtOrIntegerDefault(minSdkVersion) → A11yOrder_minSdkVersion=21",
        "compileSdk": "A11yOrder_compileSdkVersion=31 (rootProject.ext first)",
        "kotlin": "A11yOrder_kotlinVersion=1.7.0 (rootProject.ext first)",
        "agp": null,
        "iosDeploymentTarget": "min_ios_version_supported"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-gesture-handler",
      "installed": "2.28.0",
      "recommended": "~2.32.0",
      "minimumSupporting": "2.32.0",
      "latest": "3.3.0",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": true,
      "targets": [
        "android",
        "ios"
      ],
      "dependsOn": [],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "2.32: RNRenderer import changed; no public API change",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 24)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 33)",
        "kotlin": "rootProject.ext kotlinVersion or RNGH_kotlinVersion=2.0.21",
        "agp": "8.10.1 (buildscript)",
        "iosDeploymentTarget": "11.0"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-keyboard-controller",
      "installed": "1.18.5",
      "recommended": "1.21.9",
      "minimumSupporting": "1.21.9",
      "latest": "1.22.6",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [
        "react-native-reanimated"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "KeyboardController_minSdkVersion=16 (rootProject.ext first)",
        "compileSdk": "KeyboardController_compileSdkVersion=33 (rootProject.ext first)",
        "kotlin": "rootProject.ext kotlinVersion or 1.8.22",
        "agp": "4.2.2 (buildscript)",
        "iosDeploymentTarget": "11.0"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "react-native-math-view",
      "installed": "3.9.5",
      "recommended": "replace → render with react-native-katex (already a dependency)",
      "minimumSupporting": null,
      "latest": "3.9.5",
      "verdict": "replace",
      "need": "required",
      "work": "replace",
      "filesAffected": 3,
      "blocksBuild": true,
      "targets": [
        "android"
      ],
      "dependsOn": [
        "react-native-svg"
      ],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "`jcenter()` at android/build.gradle:34 and :54 (not guarded) — Gradle 9 removed it",
          "affects": "yes",
          "files": [
            "android/build.gradle (Gradle 9.3.1)"
          ]
        },
        {
          "summary": "SVGShadowNode.java:14 imports `UIManagerModuleListener` (removed from RN, #53404) → Java compile error",
          "affects": "yes",
          "files": [
            "app/containers/markdown/components/Katex.tsx:6 (MathView, MathText)"
          ]
        },
        {
          "summary": "Custom LayoutShadowNode measurement is legacy-architecture only (no Fabric interop for custom shadow nodes)",
          "affects": "yes",
          "files": [
            "app/containers/markdown/components/Katex.tsx:34,48"
          ]
        }
      ],
      "native": {
        "minSdk": "safeExtGet(\"minSdkVersion\", 19)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 28)",
        "kotlin": null,
        "agp": "3.3.2 (buildscript classpath, unconditional)",
        "iosDeploymentTarget": "7.0"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-reanimated",
      "installed": "4.1.3",
      "recommended": "4.5.1",
      "minimumSupporting": "4.4.0",
      "latest": "4.7.1",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": true,
      "targets": [
        "android",
        "ios"
      ],
      "dependsOn": [
        "react-native-worklets"
      ],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "No breaking API change noted 4.2–4.5 for the app (removed PlainStyle type only)",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": "safeExtGet(\"minSdkVersion\", 24)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 36)",
        "kotlin": "org.jetbrains.kotlin.android (rootProject)",
        "agp": null,
        "iosDeploymentTarget": "13.4 (ios_min_version)"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-restart",
      "installed": "0.0.22",
      "recommended": "0.0.29",
      "minimumSupporting": "0.0.29",
      "latest": "0.0.29",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": true,
      "targets": [
        "android"
      ],
      "dependsOn": [],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "0.0.28: RN 0.85.3/AGP 8.12 support, iOS min 15.1 in podspec",
          "affects": "no",
          "files": []
        },
        {
          "summary": "`Restart()` deprecated in favour of `restart()`",
          "affects": "no",
          "files": [
            "app/views/LanguageView/index.tsx:56"
          ]
        }
      ],
      "native": {
        "minSdk": "safeExtGet(minSdkVersion) ?: 24",
        "compileSdk": "safeExtGet(compileSdkVersion) ?: 36",
        "kotlin": null,
        "agp": "8.12.0 (buildscript, when standalone)",
        "iosDeploymentTarget": "15.1"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-screens",
      "installed": "4.17.1",
      "recommended": "~4.26.0",
      "minimumSupporting": "4.26.0",
      "latest": "4.28.0",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet(['minSdkVersion','minSdk'], rnsDefaultMinSdkVersion=21)",
        "compileSdk": "safeExtGet(compileSdkVersion, rnsDefaultCompileSdkVersion=34)",
        "kotlin": "safeExtGet('kotlinVersion', rnsDefaultKotlinVersion='1.8.0')",
        "agp": "8.2.1 (standalone)",
        "iosDeploymentTarget": "15.1"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "react-native-skeleton-placeholder",
      "installed": "5.2.4",
      "recommended": "replace → react-native-reanimated-skeleton 1.6.0 or an in-app skeleton",
      "minimumSupporting": null,
      "latest": "5.2.4",
      "verdict": "replace",
      "need": "required",
      "work": "replace",
      "filesAffected": 2,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-linear-gradient",
        "@react-native-masked-view/masked-view"
      ],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "Uses removed `StyleSheet.absoluteFillObject` in rendering code",
          "affects": "yes",
          "files": [
            "app/containers/MessageComposer/components/Autocomplete/AutocompleteItemLoading.tsx:2",
            "app/containers/UIKit/VideoConferenceBlock/components/VideoConferenceSkeletonLoading.tsx:2"
          ]
        }
      ],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-svg",
      "installed": "15.12.1",
      "recommended": "15.15.4",
      "minimumSupporting": "15.15.4",
      "latest": "15.15.5",
      "verdict": "minor bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": "unknown",
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": "7.4.2 (standalone)",
        "iosDeploymentTarget": "12.4"
      },
      "openQuestions": [
        "OQ1"
      ]
    },
    {
      "name": "react-native-worklets",
      "installed": "0.6.1",
      "recommended": "0.10.1",
      "minimumSupporting": "0.10.1",
      "latest": "0.13.0",
      "verdict": "major bump",
      "need": "required",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": true,
      "targets": [
        "android",
        "ios"
      ],
      "dependsOn": [],
      "confidence": 3,
      "breakingChanges": [
        {
          "summary": "0.7.1: `runOnUIAsync` signature changed; public header dir removed",
          "affects": "no",
          "files": []
        },
        {
          "summary": "0.10.0: `workletizableModules` replaced by `importForwarding`",
          "affects": "no",
          "files": [
            "babel.config.js:10 uses react-native-worklets/plugin without options"
          ]
        }
      ],
      "native": {
        "minSdk": "safeExtGet(\"minSdkVersion\", 24)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 36)",
        "kotlin": "org.jetbrains.kotlin.android (rootProject)",
        "agp": null,
        "iosDeploymentTarget": "13.4 (ios_min_version)"
      },
      "openQuestions": []
    },
    {
      "name": "@gorhom/bottom-sheet",
      "installed": "5.2.8",
      "recommended": "5.2.14",
      "minimumSupporting": "5.2.9",
      "latest": "5.2.14",
      "verdict": "minor bump",
      "need": "recommended",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-reanimated",
        "react-native-gesture-handler"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "Removed `absoluteFillObject` in 5.2.8",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-firebase/analytics",
      "installed": "21.14.0",
      "recommended": "26.4.0",
      "minimumSupporting": "26.0.0",
      "latest": "26.4.0",
      "verdict": "major bump",
      "need": "recommended",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "@react-native-firebase/app"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "v23: iOS 15+ / Xcode 16.2+, Android minSdk 23, Node 20+",
          "affects": "no",
          "files": []
        },
        {
          "summary": "v23 Node 20+ vs app engines \">=18\"",
          "affects": "yes",
          "files": [
            "package.json engines"
          ]
        },
        {
          "summary": "v25: firebase-ios-sdk 12.12+ requires Xcode 26.2+",
          "affects": "unknown",
          "files": []
        },
        {
          "summary": "v26: modular `logEvent` returns synchronously",
          "affects": "no",
          "files": [
            "app/lib/methods/helpers/log/index.ts:37 (no await)"
          ]
        }
      ],
      "native": {
        "minSdk": "from @react-native-firebase/app sdkVersions (23)",
        "compileSdk": "from app sdkVersions (34)",
        "kotlin": null,
        "agp": "8.4.0 (standalone)",
        "iosDeploymentTarget": "15.0 (firebase_ios_target)"
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-firebase/app",
      "installed": "21.14.0",
      "recommended": "26.4.0",
      "minimumSupporting": "26.0.0",
      "latest": "26.4.0",
      "verdict": "major bump",
      "need": "recommended",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "v23: iOS 15+ / Xcode 16.2+, Android minSdk 23, Node 20+",
          "affects": "no",
          "files": []
        },
        {
          "summary": "v23 Node 20+ vs app engines \">=18\"",
          "affects": "yes",
          "files": [
            "package.json engines"
          ]
        },
        {
          "summary": "v25: firebase-ios-sdk 12.12+ requires Xcode 26.2+",
          "affects": "unknown",
          "files": []
        },
        {
          "summary": "v26: makePlayServicesAvailable may now reject",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": "package.json sdkVersions.android.minSdk = 23",
        "compileSdk": "sdkVersions.android.compileSdk = 34 (rootProject.ext overrides)",
        "kotlin": null,
        "agp": "8.4.0 (buildscript, standalone)",
        "iosDeploymentTarget": "firebase_ios_target = sdkVersions.ios.iosTarget 15.0"
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-firebase/crashlytics",
      "installed": "21.14.0",
      "recommended": "26.4.0",
      "minimumSupporting": "26.0.0",
      "latest": "26.4.0",
      "verdict": "major bump",
      "need": "recommended",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "@react-native-firebase/app"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "v23: iOS 15+ / Xcode 16.2+, Android minSdk 23, Node 20+",
          "affects": "no",
          "files": []
        },
        {
          "summary": "v23 Node 20+ vs app engines \">=18\"",
          "affects": "yes",
          "files": [
            "package.json engines"
          ]
        },
        {
          "summary": "v25: firebase-ios-sdk 12.12+ requires Xcode 26.2+",
          "affects": "unknown",
          "files": []
        },
        {
          "summary": "Crashlytics Gradle plugin: app classpath `firebase-crashlytics-gradle:2.9.0` vs RNFB 26.4.0 sdkVersions.android.firebaseCrashlyticsGradle 3.0.8; compatibility of 2.9.0 with Gradle 9.3.1 not verified",
          "affects": "unknown",
          "files": [
            "android/build.gradle:21"
          ]
        }
      ],
      "native": {
        "minSdk": "from @react-native-firebase/app sdkVersions (23)",
        "compileSdk": "from app sdkVersions (34)",
        "kotlin": null,
        "agp": "8.4.0 (standalone)",
        "iosDeploymentTarget": "15.0 (firebase_ios_target)"
      },
      "openQuestions": [
        "OQ2"
      ]
    },
    {
      "name": "@storybook/react-native",
      "installed": "9.0.18",
      "recommended": "10.6.0",
      "minimumSupporting": "10.5.0",
      "latest": "10.6.0",
      "verdict": "major bump",
      "need": "recommended",
      "work": "code change (2 files)",
      "filesAffected": 2,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "storybook",
        "@storybook/react",
        "@gorhom/bottom-sheet",
        "react-native-reanimated"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "v10: `withStorybook` is a named export; `onDisabledRemoveStorybook` removed",
          "affects": "yes",
          "files": [
            "metro.config.js:2,34-36"
          ]
        },
        {
          "summary": "v10: storybook and @storybook/react must move to 10.x; regenerate requires file",
          "affects": "yes",
          "files": [
            "package.json devDependencies",
            ".rnstorybook/storybook.requires.ts"
          ]
        }
      ],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@types/react-native-background-timer",
      "installed": "2.0.2",
      "recommended": "remove with react-native-background-timer",
      "minimumSupporting": null,
      "latest": "2.0.2",
      "verdict": "replace",
      "need": "recommended",
      "work": "replace",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-background-timer"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-hook-form",
      "installed": "7.34.2",
      "recommended": "7.89.0",
      "minimumSupporting": "7.52.0",
      "latest": "7.89.0",
      "verdict": "minor bump",
      "need": "recommended",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "No breaking changes declared within the 7.x line",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-background-timer",
      "installed": "2.4.1",
      "recommended": "replace",
      "minimumSupporting": null,
      "latest": "2.4.1",
      "verdict": "replace",
      "need": "recommended",
      "work": "replace",
      "filesAffected": 1,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "Legacy module, interop only",
          "affects": "yes",
          "files": [
            "app/lib/methods/videoConfTimer.ts:1,11,12,15"
          ]
        }
      ],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": "8.0"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-console-time-polyfill",
      "installed": "1.2.3",
      "recommended": "remove (or inline the polyfill)",
      "minimumSupporting": null,
      "latest": "1.2.3",
      "verdict": "replace",
      "need": "recommended",
      "work": "replace",
      "filesAffected": 1,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-easy-toast",
      "installed": "2.3.0",
      "recommended": "replace → react-native-toast-message 2.5.2",
      "minimumSupporting": null,
      "latest": "2.3.0",
      "verdict": "replace",
      "need": "recommended",
      "work": "replace",
      "filesAffected": 1,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-external-keyboard",
      "installed": "0.9.0",
      "recommended": "1.2.1",
      "minimumSupporting": "1.0.0",
      "latest": "2.0.1",
      "verdict": "major bump",
      "need": "recommended",
      "work": "code change (3 files)",
      "filesAffected": 3,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "1.0.0: `canBeFocused` removed (use `focusable`)",
          "affects": "yes",
          "files": [
            "app/containers/RoomHeader/RoomHeader.tsx:235",
            "app/containers/Touch.tsx:86",
            "app/containers/message/components/Touchable/Touch.tsx:104"
          ]
        },
        {
          "summary": "1.0.0: `enableA11yFocus` removed (use `screenAutoA11yFocus` or `ref.screenReaderFocus()`)",
          "affects": "yes",
          "files": [
            "app/containers/RoomHeader/RoomHeader.tsx:233"
          ]
        },
        {
          "summary": "1.0.0: `group`→`focusableWrapper`, `viewRef`→`componentRef`, `tintType` values, type renames",
          "affects": "no",
          "files": []
        },
        {
          "summary": "`KeyboardFocus`, `KeyboardFocusView`, `withKeyboardFocus` still exported",
          "affects": "no",
          "files": [
            "app/views/RoomsListView/hooks/useHeader.tsx",
            "app/containers/Header/components/HeaderButton/Common.tsx"
          ]
        }
      ],
      "native": {
        "minSdk": "ExternalKeyboard_minSdkVersion=21 (rootProject.ext first)",
        "compileSdk": "ExternalKeyboard_compileSdkVersion=31 (rootProject.ext first)",
        "kotlin": "ExternalKeyboard_kotlinVersion=1.7.0 (rootProject.ext first)",
        "agp": null,
        "iosDeploymentTarget": "min_ios_version_supported"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-file-viewer",
      "installed": "2.1.4",
      "recommended": "replace → @react-native-documents/viewer 4.0.1",
      "minimumSupporting": null,
      "latest": "2.1.5",
      "verdict": "replace",
      "need": "recommended",
      "work": "replace",
      "filesAffected": 2,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "Legacy module, interop only",
          "affects": "yes",
          "files": [
            "app/lib/methods/helpers/fileDownload.ts:2,41"
          ]
        }
      ],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-localize",
      "installed": "2.1.1",
      "recommended": "3.7.2",
      "minimumSupporting": "3.0.0",
      "latest": "3.7.2",
      "verdict": "major bump",
      "need": "recommended",
      "work": "code change (1 file)",
      "filesAffected": 1,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "`findBestAvailableLanguage` renamed `findBestLanguageTag`",
          "affects": "yes",
          "files": [
            "app/i18n/index.ts:185"
          ]
        },
        {
          "summary": "Default export removed",
          "affects": "no",
          "files": [
            "app/i18n/index.ts:3 uses `import * as RNLocalize`"
          ]
        },
        {
          "summary": "`addEventListener` removed",
          "affects": "no",
          "files": []
        },
        {
          "summary": "iOS ≥12.4 / Android ≥5 / RN ≥0.70",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": "safeExtGet(\"minSdkVersion\", 24)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 35)",
        "kotlin": "safeExtGet(\"kotlinVersion\", \"1.9.24\")",
        "agp": "8.13.0 (buildscript)",
        "iosDeploymentTarget": "12.4"
      },
      "openQuestions": []
    },
    {
      "name": "react-redux",
      "installed": "8.0.5",
      "recommended": "9.3.0",
      "minimumSupporting": "9.2.0",
      "latest": "9.3.0",
      "verdict": "major bump",
      "need": "recommended",
      "work": "bump only",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "redux"
      ],
      "confidence": 2,
      "breakingChanges": [
        {
          "summary": "React 18+ required",
          "affects": "no",
          "files": []
        },
        {
          "summary": "Types depend on Redux core 5 (`UnknownAction`); optional peer redux ^5.0.0",
          "affects": "unknown",
          "files": [
            "all `useDispatch`/`connect` call sites (158 files import react-redux); package.json redux 4.2.0"
          ]
        },
        {
          "summary": "`batch` kept as deprecated no-op",
          "affects": "no",
          "files": [
            "app/views/RoomsListView/components/ServersList.tsx:3"
          ]
        },
        {
          "summary": "`noopCheck` renamed",
          "affects": "no",
          "files": []
        }
      ],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": [
        "OQ3"
      ]
    },
    {
      "name": "@bugsnag/react-native",
      "installed": "8.4.0",
      "recommended": "8.4.0",
      "minimumSupporting": null,
      "latest": "9.0.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": []
    },
    {
      "name": "@expo/vector-icons",
      "installed": "15.0.3",
      "recommended": "^15.0.2",
      "minimumSupporting": "^15.0.2",
      "latest": "15.1.1",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@lodev09/react-native-true-sheet",
      "installed": "3.7.3",
      "recommended": "3.7.3",
      "minimumSupporting": null,
      "latest": "3.11.18",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-reanimated",
        "react-native-worklets"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "TrueSheet_minSdkVersion=24 (rootProject.ext first)",
        "compileSdk": "TrueSheet_compileSdkVersion=35 (rootProject.ext first)",
        "kotlin": "TrueSheet_kotlinVersion=2.0.21 (rootProject.ext first)",
        "agp": "8.7.2 (buildscript)",
        "iosDeploymentTarget": "min_ios_version_supported"
      },
      "openQuestions": []
    },
    {
      "name": "@nozbe/watermelondb",
      "installed": "0.28.1-0",
      "recommended": "0.28.1-0",
      "minimumSupporting": null,
      "latest": "0.28.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "rootProject.minSdkVersion or DEFAULT 16",
        "compileSdk": "rootProject.compileSdkVersion or DEFAULT 28",
        "kotlin": "ReactNativeWatermelonDB_kotlinVersion=1.3.50 (rootProject.ext first)",
        "agp": null,
        "iosDeploymentTarget": "12.0"
      },
      "openQuestions": [
        "OQ5"
      ]
    },
    {
      "name": "@react-native-async-storage/async-storage",
      "installed": "2.2.0",
      "recommended": "2.2.0",
      "minimumSupporting": "2.2.0",
      "latest": "3.1.1",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "AsyncStorageConfig.minSdkVersion",
        "compileSdk": "AsyncStorageConfig.compileSdkVersion",
        "kotlin": "AsyncStorageConfig.kotlinVersion",
        "agp": null,
        "iosDeploymentTarget": "13.4"
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-camera-roll/camera-roll",
      "installed": "7.10.2",
      "recommended": "7.10.2",
      "minimumSupporting": null,
      "latest": "7.10.2",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": "ReactNativeCameraRoll_minSdkVersion=23 (rootProject.ext first)",
        "compileSdk": "ReactNativeCameraRoll_compileSdkVersion=33 (rootProject.ext first)",
        "kotlin": null,
        "agp": "4.2.2 (standalone only)",
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-clipboard/clipboard",
      "installed": "1.16.3",
      "recommended": "1.16.3",
      "minimumSupporting": null,
      "latest": "1.16.3",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": "ReactNativeClipBoard_minSdkVersion=16 (rootProject.ext first)",
        "compileSdk": "ReactNativeClipBoard_compileSdkVersion=30 (rootProject.ext first)",
        "kotlin": null,
        "agp": "3.2.1 (unconditional buildscript classpath, unchanged from today)",
        "iosDeploymentTarget": "11.0 (new arch)"
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-community/hooks",
      "installed": "100.1.0",
      "recommended": "100.1.0",
      "minimumSupporting": null,
      "latest": "100.1.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-masked-view/masked-view",
      "installed": "0.3.2",
      "recommended": "0.3.2",
      "minimumSupporting": "0.3.2",
      "latest": "0.3.2",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": "4.1.2 (standalone)",
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": []
    },
    {
      "name": "@react-native-picker/picker",
      "installed": "2.11.4",
      "recommended": "2.11.4",
      "minimumSupporting": "2.11.4",
      "latest": "2.11.4",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 21)",
        "compileSdk": "safeExtGet('compileSdkVersion', 31)",
        "kotlin": null,
        "agp": "7.2.0 (standalone)",
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": []
    },
    {
      "name": "@react-navigation/drawer",
      "installed": "7.12.2",
      "recommended": "7.12.2",
      "minimumSupporting": null,
      "latest": "7.14.3",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "@react-navigation/native",
        "react-native-screens",
        "react-native-safe-area-context"
      ],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@react-navigation/elements",
      "installed": "2.9.25",
      "recommended": "2.9.25",
      "minimumSupporting": null,
      "latest": "2.9.44",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "@react-navigation/native",
        "react-native-screens",
        "react-native-safe-area-context"
      ],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@react-navigation/native",
      "installed": "7.3.3",
      "recommended": "7.3.3",
      "minimumSupporting": null,
      "latest": "7.5.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@react-navigation/native-stack",
      "installed": "7.17.5",
      "recommended": "7.17.5",
      "minimumSupporting": null,
      "latest": "7.20.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "@react-navigation/native",
        "react-native-screens",
        "react-native-safe-area-context"
      ],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@rocket.chat/mobile-crypto",
      "installed": "git RocketChat/rocket.chat-mobile-crypto@69a0a250 (0.4.0)",
      "recommended": "keep locked ref",
      "minimumSupporting": null,
      "latest": "n/a (git)",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": "MobileCrypto_minSdkVersion=24 (rootProject.ext first)",
        "compileSdk": "MobileCrypto_compileSdkVersion=36",
        "kotlin": "MobileCrypto_kotlinVersion=2.1.20",
        "agp": "8.12.0 (buildscript)",
        "iosDeploymentTarget": "min_ios_version_supported"
      },
      "openQuestions": []
    },
    {
      "name": "@rocket.chat/sdk",
      "installed": "git RocketChat/Rocket.Chat.js.SDK@ecf4fedc (2.0.0-mobile)",
      "recommended": "keep locked ref",
      "minimumSupporting": null,
      "latest": "n/a (git; npm 0.2.9-2 is unrelated)",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@testing-library/react-native",
      "installed": "13.3.3",
      "recommended": "13.3.3",
      "minimumSupporting": null,
      "latest": "14.0.1",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "jest-expo"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "@zoontek/react-native-navigation-bar",
      "installed": "1.1.2",
      "recommended": "1.1.2",
      "minimumSupporting": null,
      "latest": "2.0.2",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet(\"minSdkVersion\", 24)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 35)",
        "kotlin": "safeExtGet(\"kotlinVersion\", \"2.1.20\")",
        "agp": "8.13.0 (buildscript)",
        "iosDeploymentTarget": "n/a (no podspec)"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-bootsplash",
      "installed": "6.3.11",
      "recommended": "^6.3.10",
      "minimumSupporting": "^6.3.10",
      "latest": "7.3.4",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet(\"minSdkVersion\", 23)",
        "compileSdk": "safeExtGet(\"compileSdkVersion\", 34)",
        "kotlin": "safeExtGet(\"kotlinVersion\", \"1.8.0\")",
        "agp": "7.3.1 (buildscript)",
        "iosDeploymentTarget": "12.4"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-callkeep",
      "installed": "4.3.16",
      "recommended": "4.3.16",
      "minimumSupporting": null,
      "latest": "4.3.16",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 23)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": "3.0.1 (standalone only)",
        "iosDeploymentTarget": "8.0"
      },
      "openQuestions": [
        "OQ5"
      ]
    },
    {
      "name": "react-native-device-info",
      "installed": "11.1.0",
      "recommended": "11.1.0",
      "minimumSupporting": null,
      "latest": "15.0.2",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 34)",
        "kotlin": null,
        "agp": "ext 'buildGradlePluginVersion' or 4.2.0 (standalone)",
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": [
        "OQ5"
      ]
    },
    {
      "name": "react-native-image-crop-picker",
      "installed": "git RocketChat/react-native-image-crop-picker@47092e8c (0.51.1)",
      "recommended": "keep locked ref",
      "minimumSupporting": null,
      "latest": "0.52.0 (upstream npm)",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 23)",
        "compileSdk": "safeExtGet('compileSdkVersion', 34)",
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": "8.0"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-incall-manager",
      "installed": "4.2.1",
      "recommended": "4.2.1",
      "minimumSupporting": null,
      "latest": "4.3.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 21)",
        "compileSdk": "safeExtGet('compileSdkVersion', 33)",
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": "8.0 / platform 9.0"
      },
      "openQuestions": [
        "OQ5"
      ]
    },
    {
      "name": "react-native-katex",
      "installed": "git RocketChat/react-native-katex@37e57980 (1.3.0)",
      "recommended": "keep locked ref",
      "minimumSupporting": null,
      "latest": "n/a (git)",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-webview"
      ],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-linear-gradient",
      "installed": "2.6.2",
      "recommended": "2.6.2",
      "minimumSupporting": null,
      "latest": "2.8.3",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "safeExtGet('minSdkVersion', 16)",
        "compileSdk": "safeExtGet('compileSdkVersion', 28)",
        "kotlin": null,
        "agp": "3.5.3 (standalone only)",
        "iosDeploymentTarget": "9.0"
      },
      "openQuestions": [
        "OQ5"
      ]
    },
    {
      "name": "react-native-mmkv",
      "installed": "4.1.2",
      "recommended": "4.1.2",
      "minimumSupporting": null,
      "latest": "4.3.2",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-nitro-modules"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "NitroMmkv_minSdkVersion=23 (rootProject.ext first)",
        "compileSdk": "NitroMmkv_compileSdkVersion=36",
        "kotlin": "NitroMmkv_kotlinVersion=2.1.20",
        "agp": "8.13.1 (buildscript)",
        "iosDeploymentTarget": "min_ios_version_supported"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-modal",
      "installed": "13.0.1",
      "recommended": "13.0.1",
      "minimumSupporting": null,
      "latest": "14.0.0-rc.1",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-nitro-modules",
      "installed": "0.33.9",
      "recommended": "0.33.9",
      "minimumSupporting": null,
      "latest": "0.37.1",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "Nitro_minSdkVersion=23 (rootProject.ext first)",
        "compileSdk": "Nitro_compileSdkVersion=36",
        "kotlin": "Nitro_kotlinVersion=2.1.20",
        "agp": "9.0.0 (buildscript)",
        "iosDeploymentTarget": "min_ios_version_supported"
      },
      "openQuestions": []
    },
    {
      "name": "react-native-notifier",
      "installed": "1.6.1",
      "recommended": "1.6.1",
      "minimumSupporting": null,
      "latest": "2.0.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 1,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-url-polyfill",
      "installed": "2.0.0",
      "recommended": "2.0.0",
      "minimumSupporting": null,
      "latest": "4.0.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    },
    {
      "name": "react-native-webrtc",
      "installed": "124.0.7",
      "recommended": "124.0.7",
      "minimumSupporting": null,
      "latest": "124.0.8",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "24 (hard-coded)",
        "compileSdk": "safeExtGet('compileSdkVersion', 24)",
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": "12.0"
      },
      "openQuestions": [
        "OQ5"
      ]
    },
    {
      "name": "react-native-webview",
      "installed": "13.16.1",
      "recommended": "13.16.1",
      "minimumSupporting": "13.16.1",
      "latest": "14.0.1",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": "getExtOrIntegerDefault('minSdkVersion') / ReactNativeWebView_minSdkVersion=21",
        "compileSdk": "ReactNativeWebView_compileSdkVersion=31 (rootProject.ext first)",
        "kotlin": "safeExtGet('kotlinVersion') / 1.6.0",
        "agp": "7.0.4 (buildscript)",
        "iosDeploymentTarget": "11.0 (new arch)"
      },
      "openQuestions": []
    },
    {
      "name": "reanimated-tab-view",
      "installed": "0.3.0",
      "recommended": "0.3.0",
      "minimumSupporting": null,
      "latest": "1.1.0",
      "verdict": "ok as is",
      "need": null,
      "work": "none",
      "filesAffected": 0,
      "blocksBuild": false,
      "targets": [],
      "dependsOn": [
        "react-native-reanimated",
        "react-native-gesture-handler"
      ],
      "confidence": 2,
      "breakingChanges": [],
      "native": {
        "minSdk": null,
        "compileSdk": null,
        "kotlin": null,
        "agp": null,
        "iosDeploymentTarget": null
      },
      "openQuestions": []
    }
  ]
}
```
