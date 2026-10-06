# rn-upgrade-skills

Agent skills for React Native upgrades. Each skill does one job in the upgrade's
**discovery** phase and ends with a report a human can review.

Available as a Claude Code plugin and a standalone Codex skill.

## Skills

| Skill | Status | What you get |
|---|---|---|
| [`apply-upgrade-diff`](plugins/rn-upgrade/skills/apply-upgrade-diff/SKILL.md) | ✅ available | The Upgrade Helper diff applied to your project, plus a report that explains every hunk that did not apply cleanly (with file:line and commit evidence). [Real example](examples/react-native-video-0.77.3-to-0.86.3.md). |
| `audit-libraries` | 🗓 planned | Which third-party libraries need an upgrade for the target RN version. |
| `check-android-target` | 🗓 planned | Whether the Android target/compile SDK must move, and what that implies. |
| `check-ios-target` | 🗓 planned | Whether the iOS deployment target must move, and what that implies. |
| `estimate-timeline` | 🗓 planned | A timeline built from the reports above. |

## Prerequisites

- A git repository with a clean working tree (commit or stash first).
- Network access, to download the diff and template files from
  [rn-diff-purge](https://github.com/react-native-community/rn-diff-purge).
- macOS for the `plutil` checks on iOS files. Optional: `gh`, to read the PRs behind old commits.

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
```

Arguments: `<target-version> <app-root> [from-version]`.

- `app-root` is the folder with the app's `package.json`, `android/` and `ios/`. Use `.` when the
  app is at the repo root, or e.g. `example` in a library repo.
- `from-version` is detected from your lockfile when omitted.

The skill runs in a dedicated subagent (`rn-upgrade-applier`, on Sonnet), leaves all changes
**uncommitted**, and returns the report in your conversation. The main session may summarize it;
ask Claude to print it in full or save it to a file.

## Install (Codex)

Ask Codex to install the standalone skill from this repository:

```text
$skill-installer Install https://github.com/thiago-de-almeida/rn-upgrade-skills/tree/main/skills/apply-upgrade-diff
```

Alternatively, clone this repository and copy the skill into your app's `.agents/skills`
directory. From the root of your app's repository (replace `/path/to/rn-upgrade-skills`
with your clone's path):

```sh
mkdir -p .agents/skills
cp -R /path/to/rn-upgrade-skills/skills/apply-upgrade-diff .agents/skills/
```

For use across projects, copy it to `~/.agents/skills/` instead. Install it in only one
scope to avoid duplicate entries. Codex detects new skills automatically; restart it if
the skill does not appear. See [Codex skill documentation](https://developers.openai.com/codex/skills/).

This installs the self-contained skill; the Claude Code plugin and its dedicated subagent
are not needed. If the repository is private, the installer needs GitHub access; use the
manual copy method if you already have an authenticated clone.

## Usage (Codex)

From the root of your app's repository:

```text
$apply-upgrade-diff TARGET_VERSION=0.86.3 APP_ROOT=.
```

For a library example or a known starting version:

```text
$apply-upgrade-diff TARGET_VERSION=0.86.3 APP_ROOT=example FROM_VERSION=0.77.3
```

`FROM_VERSION` is optional and detected from the resolved version when omitted. You may also
provide `REPORT_PATH` outside the app's repository to save the full report.

Codex runs the workflow in the current session, leaves changes **uncommitted**, and returns
the full report. The same prerequisites and upgrade scope apply to both hosts.
For a repo-local installation, commit the skill files before running it so the app's working
tree passes the clean-tree preflight.

## Use it with any other agent

The skill is plain Markdown. Copy the body of
[`SKILL.md`](plugins/rn-upgrade/skills/apply-upgrade-diff/SKILL.md) (everything after the `---`
frontmatter), fill in the **Inputs** section, and paste it into any agent that can run shell
commands, use git and reach the internet. A plain chat without tools will not work.

## What `apply-upgrade-diff` does not do

It applies the template diff and explains it. It does **not** install dependencies, run
`pod install`, upgrade libraries, build the app, or commit. Those are your next steps, and the
report lists them.

## Contributing

The Claude Code workflow is the source of truth. After changing
`plugins/rn-upgrade/skills/apply-upgrade-diff/SKILL.md`, regenerate the standalone Codex
version and verify that it is current:

```sh
python3 scripts/sync-codex-skill.py
python3 scripts/sync-codex-skill.py --check
```

The adapter keeps the upgrade procedure unchanged and replaces only Claude-specific metadata
and argument handling. Commit the generated `skills/apply-upgrade-diff/SKILL.md` with the source
change; Codex users do not need Python to run the installed skill.

Ran a skill on your project and the report got something wrong? Open an issue with the RN versions,
the part of the report that was wrong, and (if you can share it) the relevant snippet of the report.

## License

[MIT](LICENSE)
