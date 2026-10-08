# rn-upgrade-skills

Agent skills for React Native upgrades. Each skill does one job in the upgrade's
**discovery** phase and ends with a report a human can review.

Available as a Claude Code plugin and a standalone Codex skill.

## Skills

| Skill | Status | What you get |
|---|---|---|
| [`apply-upgrade-diff`](plugins/rn-upgrade/skills/apply-upgrade-diff/SKILL.md) | ✅ available | The Upgrade Helper diff applied to your project, plus a report that explains every hunk that did not apply cleanly (with file:line and commit evidence). [Real example](examples/react-native-video-0.77.3-to-0.86.3.md). |
| [`audit-libraries`](plugins/rn-upgrade/skills/audit-libraries/SKILL.md) | ✅ available | Which third-party libraries must be upgraded, replaced or patched for the target RN version, which of their breaking changes affect your code, and a JSON block for the timeline. Report only: it changes nothing. [Real example](examples/rocket-chat-0.81.5-to-0.86.3.md). |
| [`check-platform-targets`](plugins/rn-upgrade/skills/check-platform-targets/SKILL.md) | ✅ available | For Android and iOS, which SDK levels, deployment target and Xcode version must move, who requires each (React Native, a library, Google Play, the App Store) and by when, and which platform behaviour changes affect your code. Report only. [Real example](examples/rocket-chat-platform-targets-0.81.5-to-0.86.3.md). |
| `estimate-timeline` | 🗓 planned | A timeline built from the reports above. |

## Prerequisites

`apply-upgrade-diff`:

- A git repository with a clean working tree (commit or stash first).
- Network access, to download the diff and template files from
  [rn-diff-purge](https://github.com/react-native-community/rn-diff-purge).
- macOS for the `plutil` checks on iOS files. Optional: `gh`, to read the PRs behind old commits.

`audit-libraries`:

- Node 18 or newer, to run the bundled inventory script (no dependencies to install).
- Network access to the npm registry, jsDelivr, React Native Directory and GitHub.
  Optional: `gh`, to read releases and issues.
- No clean working tree needed: it does not change files. Run it before or after
  `apply-upgrade-diff`; after, it audits the versions still in your lockfile and flags it as stale.
- Bare apps that use Expo modules are covered: the target Expo SDK decides those versions. Managed Expo apps (no committed `android/` and `ios/`) are out of scope; move to the matching SDK and use `npx expo install --check` instead.

`check-platform-targets`:

- Network access to rn-diff-purge, jsDelivr, developer.android.com and developer.apple.com.
- Run it after `audit-libraries`: it reads that report for the libraries' SDK and deployment-target
  requirements. Without it, the libraries are left out and the report says so.
- No clean working tree needed: it does not change files.

## Install (Claude Code)

```
/plugin marketplace add thiago-de-almeida/rn-upgrade-skills
/plugin install rn-upgrade@rn-upgrade-skills
```

Install it as a plugin. Copying `SKILL.md` alone into `~/.claude/skills` loses the dedicated
subagent, and the skill falls back to a general-purpose one.

## Usage (Claude Code)

From the root of your app's repository:

```
/rn-upgrade:apply-upgrade-diff 0.86.3 .
/rn-upgrade:audit-libraries 0.86.3 .
/rn-upgrade:check-platform-targets 0.86.3 .
```

Run them in that order: `check-platform-targets` reads the `audit-libraries` report. All three skills take the same arguments: `<target-version> <app-root> [from-version]`.

- `app-root` is the folder with the app's `package.json`, `android/` and `ios/`. Use `.` when the
  app is at the repo root, or e.g. `example` in a library repo.
- `from-version` is detected from your lockfile when omitted.

Each skill runs in a dedicated subagent on Sonnet (`rn-upgrade-applier` leaves all changes
**uncommitted**; `rn-upgrade-auditor` and `rn-upgrade-platform-checker` only read). It saves the full report outside your repo, in
`~/rn-upgrade-reports/<repo>/`, and returns a short summary with the report's path.

### HTML report

Next to every report, the skill also writes an HTML page: the versions, a one-line verdict, a
matrix of every library or file, a table with filters and expandable rows, then the full report.
The page is one self-contained file that opens offline. A bundled script renders it, not the
model, so it costs almost no tokens. Add `HTML=no` to skip it, or `REPORT_PATH=<file>` to save the
report somewhere else:

```
/rn-upgrade:audit-libraries 0.86.3 . REPORT_PATH=~/Desktop/audit.md
```

To render a report you already have:
`node plugins/rn-upgrade/skills/audit-libraries/scripts/render-html.mjs audit.md` (the script is
the same in every skill).

## Install (Codex)

Ask Codex to install the standalone skill from this repository. The installer puts it in
`~/.codex/skills/` (user scope):

```text
$skill-installer Install https://github.com/thiago-de-almeida/rn-upgrade-skills/tree/main/skills/apply-upgrade-diff
$skill-installer Install https://github.com/thiago-de-almeida/rn-upgrade-skills/tree/main/skills/audit-libraries
$skill-installer Install https://github.com/thiago-de-almeida/rn-upgrade-skills/tree/main/skills/check-platform-targets
```

Alternatively, clone this repository and copy the skill into your app's `.agents/skills`
directory. From the root of your app's repository (replace `/path/to/rn-upgrade-skills`
with your clone's path):

```sh
mkdir -p .agents/skills
cp -R /path/to/rn-upgrade-skills/skills/apply-upgrade-diff .agents/skills/
cp -R /path/to/rn-upgrade-skills/skills/audit-libraries .agents/skills/
cp -R /path/to/rn-upgrade-skills/skills/check-platform-targets .agents/skills/
```

Copy the whole folder: every skill ships a `scripts/` folder next to its `SKILL.md`.

For use across projects, copy it to `~/.agents/skills/` instead. Install it in only one
scope (installer, repo or user folder) to avoid duplicate entries. Codex detects new skills
automatically; restart it if the skill does not appear. See the
[Codex skill documentation](https://learn.chatgpt.com/docs/build-skills).

This installs the self-contained skill; the Claude Code plugin and its subagent are not needed.

## Usage (Codex)

From the root of your app's repository:

```text
$apply-upgrade-diff TARGET_VERSION=0.86.3 APP_ROOT=.
```

Positional arguments work too, in the same order as in Claude Code: `$apply-upgrade-diff 0.86.3 .`

For a library example or a known starting version:

```text
$apply-upgrade-diff TARGET_VERSION=0.86.3 APP_ROOT=example FROM_VERSION=0.77.3
```

`FROM_VERSION` is optional and detected from your lockfile when omitted. The report and its
HTML page are saved in `~/rn-upgrade-reports/<repo>/`; `REPORT_PATH` and `HTML=no` work as in
Claude Code.

Codex runs the workflow in the current session, leaves changes **uncommitted**, and returns
a summary with the report's path. The same prerequisites and upgrade scope apply to both hosts. Use a high
reasoning effort: the skill investigates every failed hunk in the code and git history.

`$audit-libraries` and `$check-platform-targets` take the same inputs. They need network access:
approve it when Codex asks, or run Codex with network enabled for the session.

`$apply-upgrade-diff` stops if the app's working tree is not clean. With a repo-local installation, either
commit `.agents/` or add it to `.git/info/exclude` before running it.

## Use it with any other agent

The skills are plain Markdown. Copy the body of a `SKILL.md` (everything after the `---`
frontmatter), fill in the **Inputs** section, and paste it into any agent that can run shell
commands, use git and reach the internet. A plain chat without tools will not work. Replace
`${CLAUDE_SKILL_DIR}` with the path of the skill folder in your clone.

## What `apply-upgrade-diff` does not do

It applies the template diff and explains it. It does **not** install dependencies, run
`pod install`, upgrade libraries, build the app, or commit. Those are your next steps, and the
report lists them.

## What `audit-libraries` does not do

It reads and reports. It does **not** edit `package.json`, install, upgrade libraries, fix your
code for their breaking changes, or audit the packages the RN template owns (`react`,
`@react-native/*`, babel, eslint, typescript): `apply-upgrade-diff` handles those.

## What `check-platform-targets` does not do

It reads and reports. It does **not** change Gradle, the Podfile or Xcode settings, audit libraries
one by one (it reads the `audit-libraries` report), or list the behaviour changes every app gets on
a new OS whatever its target.

## Contributing

The Claude Code workflows in `plugins/rn-upgrade/skills/` are the source of truth. After
changing one, regenerate the standalone Codex versions and verify that they are current:

```sh
python3 scripts/sync-codex-skill.py
python3 scripts/sync-codex-skill.py --check
node --test tests/*.test.mjs
```

The adapter keeps each procedure unchanged, replaces only Claude-specific metadata and argument
handling, and copies each skill's `scripts/` folder. Commit the generated `skills/` files with the
source change; Codex users do not need Python to run the installed skills.

Ran a skill on your project and the report got something wrong? Open an issue with the RN versions,
the part of the report that was wrong, and (if you can share it) the relevant snippet of the report.

## License

[MIT](LICENSE)
