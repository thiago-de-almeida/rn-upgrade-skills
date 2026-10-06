# rn-upgrade-skills

Agent skills for React Native upgrades. Each skill does one job in the upgrade's
**discovery** phase and ends with a report a human can review.

## Skills

| Skill | Status | What you get |
|---|---|---|
| [`apply-upgrade-diff`](plugins/rn-upgrade/skills/apply-upgrade-diff/SKILL.md) | ✅ available | The Upgrade Helper diff applied to your project, plus a report that explains every hunk that did not apply cleanly (with file:line and commit evidence). |
| `audit-libraries` | 🗓 planned | Which third-party libraries need an upgrade for the target RN version. |
| `check-android-target` | 🗓 planned | Whether the Android target/compile SDK must move, and what that implies. |
| `check-ios-target` | 🗓 planned | Whether the iOS deployment target must move, and what that implies. |
| `estimate-timeline` | 🗓 planned | A timeline built from the reports above. |

## Install (Claude Code)

```
/plugin marketplace add thiago-de-almeida/rn-upgrade-skills
/plugin install rn-upgrade@rn-upgrade-skills
```

Then, from the root of your app's repository:

```
/rn-upgrade:apply-upgrade-diff 0.86.3 .
```

Arguments: `<target-version> [app-root] [from-version]`. `app-root` is the folder with the app's
`package.json`, `android/` and `ios/` (e.g. `example` in a library repo). `from-version` is detected
from your lockfile when omitted.

The skill runs in a dedicated subagent (`rn-upgrade-applier`, Sonnet with high effort), leaves all
changes **uncommitted**, and saves `rn-upgrade-report.md` outside your repo.

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

Ran a skill on your project and the report got something wrong? Open an issue with the RN versions,
the part of the report that was wrong, and (if you can share it) the relevant snippet of the report.

## License

[MIT](LICENSE)
