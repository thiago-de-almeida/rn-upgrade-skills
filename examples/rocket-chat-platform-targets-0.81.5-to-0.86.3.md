> **About this example.** Output of `check-platform-targets` (v0.4.0) on
> [Rocket.Chat.ReactNative](https://github.com/RocketChat/Rocket.Chat.ReactNative) at commit
> `8453d9a`, before the team's own upgrade to React Native 0.86.3. It read the
> [audit-libraries example](rocket-chat-0.81.5-to-0.86.3.md) for the libraries' requirements. It was
> run in Claude Code by a general-purpose agent on Opus that followed `SKILL.md` exactly, not through
> `/rn-upgrade:check-platform-targets`, whose agent runs on Sonnet. One rule was added for a blind
> run: no looking at the repository's later commits, branches, pull requests or issues. The report
> is unedited. In the real upgrade the Android SDK levels stayed at 36, Gradle moved to 9.3.1 and
> the iOS deployment target moved to 16.4. The [HTML version](rocket-chat-platform-targets-0.81.5-to-0.86.3.html)
> was rendered by the skill's bundled script.

# Platform targets — Rocket.Chat.ReactNative, React Native 0.81.5 → 0.86.3

_Generated 2026-10-08 by the check-platform-targets skill. APP_ROOT `.`, repository at `8453d9a7`, working tree clean (current values read from the working tree = HEAD). FROM_VERSION not given: detected 0.81.5 from `pnpm-lock.yaml:201-202` (`react-native` specifier/version 0.81.5) and `ios/Podfile.lock:386` (`React-Core (0.81.5)`). Bare app: `android/` and `ios/` are both committed. Library constraints come from `~/rn-upgrade-reports/rocketchat/audit-libraries-0.81.5-to-0.86.3.md`._

## 1. Summary

- **Android:** no SDK level has to move (minSdk 24, compileSdk 36, targetSdk 36, build tools 36.0.0, NDK 27.1.12297006, Kotlin 2.1.20 already match React Native 0.86.3, the libraries and Google Play). The build tooling moves with the template: **Gradle 8.14.3 → 9.3.1** (wrapper edit) and **AGP 8.11.0 → 8.12.0** (automatic: the classpath is unversioned and resolves through `@react-native/gradle-plugin`).
- **iOS:** **deployment target 15.1 → 16.4** for the Podfile (`platform :ios`) and the two targets that link pods (`Rocket.Chat`, `NotificationService`), required by Expo SDK 57 (ExpoModulesCore and every expo-* module need iOS 16.4). React Native 0.86.3 alone still accepts 15.1. **Xcode does not move**: CI builds with Xcode 26.2, above React Native's 16.1 minimum and the App Store's Xcode 26 rule.
- **2 of 2 platform changes affect the app, 0 unknown** (both iOS, from the deployment-target move; Android has none).

## 2. Targets

### Android

| value | current | required | required by | evidence |
|---|---|---|---|---|
| minSdkVersion | 24 | 24 |  | `android/build.gradle:4` (`rootProject.ext`, used by `android/app/build.gradle:90` and forced on subprojects at `android/build.gradle:44`). RN 0.86.3 template `minSdkVersion = 24`; highest library minimum is 24 (react-native-webrtc hard-coded, expo-modules-core fallback 24, reanimated/worklets/gesture-handler 24). |
| compileSdkVersion | 36 | 36 |  | `android/build.gradle:5` (used by `android/app/build.gradle:85`, forced on subprojects at `android/build.gradle:41`). RN 0.86.3 template `compileSdkVersion = 36`; no library asks for more than 36. |
| targetSdkVersion | 36 | 36 |  | `android/build.gradle:6` (used by `android/app/build.gradle:91`). RN 0.86.3 template 36; Google Play requires 36 from August 31, 2026 (already met). |
| buildToolsVersion | 36.0.0 | 36.0.0 |  | `android/build.gradle:3`; RN 0.86.3 template `buildToolsVersion = "36.0.0"`. |
| ndkVersion | 27.1.12297006 | 27.1.12297006 |  | `android/build.gradle:7` (used by `android/app/build.gradle:83`); RN 0.86.3 template `ndkVersion = "27.1.12297006"`. |
| Kotlin | 2.1.20 | 2.1.20 |  | `android/build.gradle:8` (`kotlinVersion`, aliased as `kotlin_version` at :9); RN 0.86.3 template `kotlinVersion = "2.1.20"` and `react-native@0.86.3/gradle/libs.versions.toml:32` `kotlin = "2.1.20"`; libraries read `rootProject.ext.kotlinVersion` or pin ≤ 2.1.20. |
| Gradle | 8.14.3 | 9.3.1 | React Native 0.86.3 | `android/gradle/wrapper/gradle-wrapper.properties:3` (`gradle-8.14.3-bin.zip`) vs rn-diff-purge `release/0.86.3` `RnDiffApp/android/gradle/wrapper/gradle-wrapper.properties:3` (`gradle-9.3.1-bin.zip`). Audit-libraries G6: Gradle 9 removed `jcenter()`, which blocks @react-native-cookies/cookies, react-native-math-view and react-native-restart at their installed versions. |
| AGP | 8.11.0 | 8.12.0 | React Native 0.86.3 | `android/build.gradle:22` `classpath("com.android.tools.build:gradle")` has no version → resolves from `react-native@0.81.5/gradle/libs.versions.toml:9` `agp = "8.11.0"` today and `react-native@0.86.3/gradle/libs.versions.toml:9` `agp = "8.12.0"` after the upgrade, through `@react-native/gradle-plugin`. No file edit needed. |

### iOS

| value | current | required | required by | evidence |
|---|---|---|---|---|
| Podfile `platform :ios` | 15.1 | 16.4 | Expo SDK 57 (expo, expo-* modules via ExpoModulesCore) | `ios/Podfile:4` `platform :ios, '15.1'`. Audit-libraries G5: ExpoModulesCore.podspec 57.0.21 `:ios => '16.4'`, `pod install` fails below it; expo recommended ~57.0.27 with `iosDeploymentTarget` 16.4. RN 0.86.3 template uses `min_ios_version_supported` = 15.1 (`react-native@0.86.3/scripts/cocoapods/helpers.rb:83-84`, unchanged from 0.81.5). |
| `min_ios_version_supported` (RN) | 15.1 | 15.1 |  | `react-native@0.81.5/scripts/cocoapods/helpers.rb:84` and `react-native@0.86.3/scripts/cocoapods/helpers.rb:84` both `return '15.1'`; the app's Podfile hard-codes the value instead of calling the helper. |
| IPHONEOS_DEPLOYMENT_TARGET — Rocket.Chat (app) | 15.1 | 16.4 | Expo SDK 57 (pods linked through `abstract_target 'defaults'`, `ios/Podfile:33-37`) | `ios/RocketChat.xcodeproj/project.pbxproj:2192` (Debug), `:2256` (Release). |
| IPHONEOS_DEPLOYMENT_TARGET — NotificationService (extension) | 15.1 | 16.4 | Expo SDK 57 (same pods, `ios/Podfile:38`) | `ios/RocketChat.xcodeproj/project.pbxproj:2086` (Debug), `:2139` (Release). |
| IPHONEOS_DEPLOYMENT_TARGET — ShareRocketChatRN (extension) | 15.1 | 15.1 |  | `ios/RocketChat.xcodeproj/project.pbxproj:1852` (Debug), `:1928` (Release). Not in the Podfile and links no pods (only `ShareRocketChatRN.swift` and `MainInterface.storyboard`), so the Expo minimum does not reach it; App Store minimum is iOS 13. |
| IPHONEOS_DEPLOYMENT_TARGET — project level | 11.0 | 11.0 |  | `ios/RocketChat.xcodeproj/project.pbxproj:2348` (Debug), `:2418` (Release). Every iOS target overrides it; only the watchOS target inherits it, where it does not apply. |
| WATCHOS_DEPLOYMENT_TARGET — Rocket.Chat.Watch | 8.0 | 8.0 |  | `ios/RocketChat.xcodeproj/project.pbxproj:2001`, `:2052` (`SDKROOT = watchos`). Not built with React Native or pods; no source sets a watchOS minimum. |
| Xcode | 26.2 | 26.2 |  | CI pins `xcode-version: '26.2.0'` on `macos-26` runners: `.github/actions/build-ios/action.yml:47`, `.github/actions/upload-ios/action.yml:67`, `.github/workflows/e2e-build-ios.yml:71`, `.github/workflows/maestro-ios.yml:29`; `.github/workflows/build-ios.yml:25,65` `runs-on: macos-26`. No `.xcode-version`, no Xcode pin in Fastlane. RN 0.86.3 `min_xcode_version_supported` = 16.1 (`helpers.rb:87-88`); App Store requires Xcode 26 since April 28, 2026. |

## 3. Store rules

| platform | rule | date | met by the required values | URL |
|---|---|---|---|---|
| android | "New apps and app updates must target Android 16 (API level 36) or higher to be submitted to Google Play" (phone/tablet; Wear OS and Automotive 35, TV and XR 34). Extension available to November 1, 2026. | August 31, 2026 | yes (targetSdk 36) | https://developer.android.com/google/play/requirements/target-sdk |
| android | Existing apps must target Android 15 (API level 35) or higher to remain available to new users on devices running a newer Android. | August 31, 2026 | yes (targetSdk 36) | https://developer.android.com/google/play/requirements/target-sdk |
| ios | Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26 (also iPadOS/watchOS 26). | since April 28, 2026 | yes (Xcode 26.2) | https://developer.apple.com/news/upcoming-requirements/ |
| ios | iOS and iPadOS apps uploaded to App Store Connect must target iOS 13 or later. | since September 9, 2026 | yes (16.4 app and NotificationService, 15.1 share extension) | https://developer.apple.com/news/upcoming-requirements/ |

## 4. Platform changes

### Android

Nothing moves on Android: targetSdk stays 36 (no new API level is crossed) and minSdk stays 24 (no Android version is dropped), so no target-SDK behaviour change or dead `Build.VERSION.SDK_INT` check comes from this upgrade. The Gradle 9.3.1 / AGP 8.12.0 move is a build-tool change covered by audit-libraries G6.

| version | change | affects | where in the app | evidence |
|---|---|---|---|---|

### iOS

Xcode does not move (CI already builds with Xcode 26.2 and the iOS 26 SDK), so no iOS SDK release notes apply. The deployment target moves 15.1 → 16.4 for the app and NotificationService.

| version | change | affects | where in the app | evidence |
|---|---|---|---|---|
| iOS 16.4 (deployment target) | The app and its NotificationService extension stop supporting iOS 15.1–15.x and 16.0–16.3: devices on those versions can no longer install or update to this build. The share extension (15.1) runs only inside the host app, so it follows the app's minimum in practice. | yes | `ios/Podfile:4`; `ios/RocketChat.xcodeproj/project.pbxproj:2192,2256` (Rocket.Chat), `:2086,2139` (NotificationService) | Required by Expo SDK 57 (audit-libraries G5, ExpoModulesCore.podspec `:ios => '16.4'`). |
| iOS 16.4 (deployment target) | `if #available(iOS 16, *)` is always true at 16.4: the `Locale.current.regionCode` fallback becomes dead code. | yes | `ios/Libraries/VoipRegion.swift:5` (check), `:8` (dead fallback); compiled into the Rocket.Chat target (`project.pbxproj:1748`) | Searched `ios/` (excluding Pods) for `#available`/`@available`: the only other iOS check, `#available(iOS 12.0, *)` at `ios/ReplyNotification.swift:71`, is already dead at 15.1 today; the watchOS checks are unaffected. JS: `app/containers/Header/components/HeaderButton/HeaderButtonContainer.tsx:17` (`Platform.Version >= 26`) stays live; `app/lib/methods/helpers/deviceInfo.ts:14` (iOS ≥ 13) is already dead today. |

## 5. Open questions

1. Dropping iOS 15.x and 16.0–16.3 is forced by Expo SDK 57 (16.4). Is that acceptable for Rocket.Chat's user base, or should the Expo SDK stay older (which audit-libraries says the RN 0.86.3 target does not allow)? The share of users on those versions was not checked.
2. ShareRocketChatRN links no pods and can stay at 15.1, but it can only run inside a host app that now needs 16.4. Raise it to 16.4 for consistency?
3. Gradle 9.3.1: the app's own buildscript plugins `com.google.gms:google-services:4.4.1` and `com.google.firebase:firebase-crashlytics-gradle:2.9.0` (`android/build.gradle:20-21`) are not npm libraries, so audit-libraries did not check them, and this report did not either. Do these versions work with Gradle 9.3.1 / AGP 8.12.0?

## 6. Data

```json
{
  "schemaVersion": 1,
  "rn": { "from": "0.81.5", "to": "0.86.3" },
  "platforms": [
    {
      "platform": "android",
      "fields": [
        { "name": "minSdkVersion", "current": "24", "required": "24", "requiredBy": [], "evidence": "android/build.gradle:4; RN 0.86.3 template minSdkVersion = 24; highest library minimum 24" },
        { "name": "compileSdkVersion", "current": "36", "required": "36", "requiredBy": [], "evidence": "android/build.gradle:5; RN 0.86.3 template compileSdkVersion = 36" },
        { "name": "targetSdkVersion", "current": "36", "required": "36", "requiredBy": [], "evidence": "android/build.gradle:6; RN 0.86.3 template 36; Google Play API 36 from 2026-08-31 already met" },
        { "name": "buildToolsVersion", "current": "36.0.0", "required": "36.0.0", "requiredBy": [], "evidence": "android/build.gradle:3; RN 0.86.3 template 36.0.0" },
        { "name": "ndkVersion", "current": "27.1.12297006", "required": "27.1.12297006", "requiredBy": [], "evidence": "android/build.gradle:7; RN 0.86.3 template 27.1.12297006" },
        { "name": "Kotlin", "current": "2.1.20", "required": "2.1.20", "requiredBy": [], "evidence": "android/build.gradle:8; RN 0.86.3 template kotlinVersion 2.1.20; react-native@0.86.3 gradle/libs.versions.toml:32" },
        { "name": "Gradle", "current": "8.14.3", "required": "9.3.1", "requiredBy": ["React Native 0.86.3"], "evidence": "android/gradle/wrapper/gradle-wrapper.properties:3 vs rn-diff-purge release/0.86.3 gradle-wrapper.properties:3; audit-libraries G6 (jcenter removed)" },
        { "name": "AGP", "current": "8.11.0", "required": "8.12.0", "requiredBy": ["React Native 0.86.3"], "evidence": "android/build.gradle:22 unversioned classpath; react-native@0.81.5 libs.versions.toml:9 agp 8.11.0 → react-native@0.86.3 libs.versions.toml:9 agp 8.12.0 via @react-native/gradle-plugin" }
      ],
      "store": [
        { "rule": "New apps and app updates must target Android 16 (API level 36) or higher (extension to November 1, 2026)", "date": "2026-08-31", "url": "https://developer.android.com/google/play/requirements/target-sdk", "met": true },
        { "rule": "Existing apps must target Android 15 (API level 35) or higher to remain available to new users on newer Android", "date": "2026-08-31", "url": "https://developer.android.com/google/play/requirements/target-sdk", "met": true }
      ],
      "changes": []
    },
    {
      "platform": "ios",
      "fields": [
        { "name": "Podfile platform :ios", "current": "15.1", "required": "16.4", "requiredBy": ["Expo SDK 57 (expo, expo-* modules via ExpoModulesCore)"], "evidence": "ios/Podfile:4; audit-libraries G5 (ExpoModulesCore.podspec 57.0.21 :ios => '16.4')" },
        { "name": "min_ios_version_supported (RN)", "current": "15.1", "required": "15.1", "requiredBy": [], "evidence": "react-native@0.81.5 and @0.86.3 scripts/cocoapods/helpers.rb:84" },
        { "name": "IPHONEOS_DEPLOYMENT_TARGET Rocket.Chat", "current": "15.1", "required": "16.4", "requiredBy": ["Expo SDK 57 (expo, expo-* modules via ExpoModulesCore)"], "evidence": "ios/RocketChat.xcodeproj/project.pbxproj:2192, :2256" },
        { "name": "IPHONEOS_DEPLOYMENT_TARGET NotificationService", "current": "15.1", "required": "16.4", "requiredBy": ["Expo SDK 57 (expo, expo-* modules via ExpoModulesCore)"], "evidence": "ios/RocketChat.xcodeproj/project.pbxproj:2086, :2139" },
        { "name": "IPHONEOS_DEPLOYMENT_TARGET ShareRocketChatRN", "current": "15.1", "required": "15.1", "requiredBy": [], "evidence": "ios/RocketChat.xcodeproj/project.pbxproj:1852, :1928; not in Podfile, links no pods" },
        { "name": "IPHONEOS_DEPLOYMENT_TARGET project level", "current": "11.0", "required": "11.0", "requiredBy": [], "evidence": "ios/RocketChat.xcodeproj/project.pbxproj:2348, :2418; overridden by every iOS target" },
        { "name": "WATCHOS_DEPLOYMENT_TARGET Rocket.Chat.Watch", "current": "8.0", "required": "8.0", "requiredBy": [], "evidence": "ios/RocketChat.xcodeproj/project.pbxproj:2001, :2052" },
        { "name": "Xcode", "current": "26.2", "required": "26.2", "requiredBy": [], "evidence": ".github/actions/build-ios/action.yml:47, .github/actions/upload-ios/action.yml:67, .github/workflows/e2e-build-ios.yml:71, .github/workflows/maestro-ios.yml:29 (xcode-version 26.2.0, macos-26); RN 0.86.3 min_xcode_version_supported 16.1; App Store Xcode 26" }
      ],
      "store": [
        { "rule": "Apps uploaded to App Store Connect must be built with Xcode 26 or later using an SDK for iOS 26", "date": "2026-04-28", "url": "https://developer.apple.com/news/upcoming-requirements/", "met": true },
        { "rule": "iOS and iPadOS apps uploaded to App Store Connect must target iOS 13 or later", "date": "2026-09-09", "url": "https://developer.apple.com/news/upcoming-requirements/", "met": true }
      ],
      "changes": [
        { "version": "iOS 16.4 (deployment target)", "summary": "App and NotificationService stop supporting iOS 15.1-15.x and 16.0-16.3", "affects": "yes", "files": ["ios/Podfile:4", "ios/RocketChat.xcodeproj/project.pbxproj:2192", "ios/RocketChat.xcodeproj/project.pbxproj:2256", "ios/RocketChat.xcodeproj/project.pbxproj:2086", "ios/RocketChat.xcodeproj/project.pbxproj:2139"], "evidence": "Required by Expo SDK 57 (audit-libraries G5)" },
        { "version": "iOS 16.4 (deployment target)", "summary": "#available(iOS 16, *) always true; Locale.current.regionCode fallback becomes dead code", "affects": "yes", "files": ["ios/Libraries/VoipRegion.swift:5", "ios/Libraries/VoipRegion.swift:8"], "evidence": "Only iOS availability check above 15.1 in ios/ (excluding Pods); compiled into Rocket.Chat target (project.pbxproj:1748)" }
      ]
    }
  ],
  "openQuestions": [
    "Dropping iOS 15.x and 16.0-16.3 is forced by Expo SDK 57 (16.4): acceptable for the user base? Share of users on those versions not checked.",
    "ShareRocketChatRN links no pods and can stay at 15.1, but only runs inside a host app that now needs 16.4: raise it to 16.4 for consistency?",
    "Do the app's buildscript plugins com.google.gms:google-services:4.4.1 and com.google.firebase:firebase-crashlytics-gradle:2.9.0 (android/build.gradle:20-21) work with Gradle 9.3.1 / AGP 8.12.0? Not checked by audit-libraries or this report."
  ]
}
```
