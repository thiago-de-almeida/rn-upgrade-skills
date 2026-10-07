// Run with: node --test tests/*.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { extractData, inline, markdownToHtml, renderPage } from "../plugins/rn-upgrade/skills/audit-libraries/scripts/render-html.mjs";

const SKILLS = "plugins/rn-upgrade/skills";
const RENDERER = `${SKILLS}/audit-libraries/scripts/render-html.mjs`;
const count = (text, needle) => text.split(needle).length - 1;

test("both skills ship the same renderer and fonts", () => {
  for (const file of ["render-html.mjs", "render-html-fonts.mjs"]) {
    assert.equal(readFileSync(`${SKILLS}/apply-upgrade-diff/scripts/${file}`, "utf8"),
      readFileSync(`${SKILLS}/audit-libraries/scripts/${file}`, "utf8"), file);
  }
});

test("markdown: headings get unique ids, tables keep escaped pipes", () => {
  const { html, headings } = markdownToHtml("# Title\n\n## 1. Summary\n\n## 1. Summary\n\n| a | b |\n|---|---|\n| x \\| y | `z` |\n");
  assert.match(html, /<h2 id="1-summary">1\. Summary<\/h2>/);
  assert.match(html, /<h2 id="1-summary-2">/);
  assert.match(html, /<td>x \| y<\/td><td><code>z<\/code><\/td>/);
  assert.deepEqual(headings.map((h) => h.id), ["title", "1-summary", "1-summary-2"]);
});

test("markdown: nested lists, code fences, quotes and inline marks", () => {
  const { html } = markdownToHtml("> **About.** note\n\n- one\n  - two **bold**\n- three _it_\n\n```js\nconst a = '<b>';\n```\n");
  assert.match(html, /<blockquote><p><strong>About\.<\/strong> note<\/p><\/blockquote>/);
  assert.match(html, /<ul><li>one<ul><li>two <strong>bold<\/strong><\/li><\/ul><\/li><li>three <em>it<\/em><\/li><\/ul>/);
  assert.match(html, /<pre><code class="language-js">const a = &#39;&lt;b&gt;&#39;;<\/code><\/pre>/);
});

test("markdown: escapes HTML and only links safe URLs", () => {
  const { html } = markdownToHtml("<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://a.dev/x?a=1&b=2) see https://b.dev/y. `**not bold**`");
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.ok(!html.includes('href="javascript'));
  assert.match(html, /<a href="https:\/\/a\.dev\/x\?a=1&amp;b=2">ok<\/a>/);
  assert.match(html, /<a href="https:\/\/b\.dev\/y">https:\/\/b\.dev\/y<\/a>\./);
  assert.match(html, /<code>\*\*not bold\*\*<\/code>/);
});

test("extractData reads the last json block, and reports a broken one", () => {
  assert.deepEqual(extractData("```json\n{\"a\":1}\n```\ntext\n```json\n{\"b\":2}\n```\n"), { data: { b: 2 }, error: null });
  assert.deepEqual(extractData("no data"), { data: null, error: "no ```json block found" });
  assert.equal(extractData("```json\n{oops}\n```").data, null);
});

test("audit page: dashboard from the data block, full report below", () => {
  const md = readFileSync("examples/rocket-chat-0.81.5-to-0.86.3.md", "utf8");
  const html = renderPage(md, { source: "rocket-chat.md" });
  const { data } = extractData(md);
  assert.equal(count(html, 'class="row"'), data.libraries.length);
  assert.match(html, /<p class="thesis"><b>32<\/b> of 79 libraries must change for 0\.86\.3\./);
  assert.equal(count(html, 'class="cell"'), data.libraries.length);
  assert.match(html, /<span class="stop"><span>0\.82<\/span><\/span>/);
  assert.match(html, /data-verdict="major bump"/);
  assert.match(html, /id="full-report"/);
  assert.match(html, /href="#react-native-skeleton-placeholder/);
  assert.match(html, /<nav class="toc"/);
  assert.ok(!/<script>(?!\s*(const|"use strict"))/.test(html.replace(/<script type="application\/json"[\s\S]*?<\/script>/g, "")));
  assert.ok(!/<link\b|\bsrc="https?:|url\(https?:/.test(html), "no external resources");
});

test("diff page: results, hand-applied hunks and questions from the data block", () => {
  const data = {
    schemaVersion: 1, rn: { from: "0.77.3", to: "0.86.3" },
    diffUrl: "https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.77.3..0.86.3.diff",
    summary: { files: 3, byResult: { "applied clean": 1, "applied by hand": 1, "needs human": 1 } },
    files: [
      { file: ".gitignore", result: "applied clean", cause: "none", evidence: "adds `.kotlin/`" },
      { file: "android/build.gradle", result: "applied by hand", cause: "Customized", evidence: "line 12" },
      { file: "ios/Podfile", result: "needs human", cause: "Conflict <x>", evidence: "post_install hook" },
    ],
    handApplied: [{ file: "android/build.gradle", change: "kept the flavor block", why: "same intent" }],
    openQuestions: ["Keep the custom Podfile hook?"],
    nextSteps: ["pod install"],
  };
  const md = "# Diff report\n\n## 1. Version used\n\ntext\n\n## 6. Data\n\n```json\n" + JSON.stringify(data) + "\n```\n";
  const html = renderPage(md, { source: "diff.md" });
  assert.equal(count(html, 'class="row"'), 3);
  assert.match(html, /data-result="needs human"/);
  assert.match(html, /Conflict &lt;x&gt;/);
  assert.match(html, /kept the flavor block/);
  assert.match(html, /<b>1<\/b> of 3 template files applied cleanly\. 1 needed a hand edit and <b>1<\/b> waits for a human\./);
  assert.match(html, /Keep the custom Podfile hook\?/);
});

test("a report without a data block still renders, with a notice", () => {
  const html = renderPage("# Old report\n\nSome text.", { source: "old.md" });
  assert.match(html, /no data block/i);
  assert.match(html, /Some text\./);
  assert.equal(count(html, 'class="row"'), 0);
});

test("CLI writes the page next to the report", () => {
  const dir = mkdtempSync(join(tmpdir(), "render-html-"));
  const report = join(dir, "report.md");
  writeFileSync(report, "# R\n\ntext\n");
  const out = execFileSync("node", [RENDERER, report], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  assert.equal(out, join(dir, "report.html"));
  assert.ok(existsSync(out));
});

const auditMd = (data) => "# A\n\n### lib-a — replace, required\n\n## 9. Data\n\n```json\n" + JSON.stringify(data) + "\n```\n";

test("counts come from the data, never raw summary text", () => {
  const evil = "<img src=x onerror=alert(1)>";
  const audit = renderPage(auditMd({ rn: { to: "0.86.3" }, summary: { required: evil, audited: evil, recommended: evil, needsHuman: evil },
    libraries: [{ name: "lib-a", verdict: "replace", need: "required" }] }));
  const diff = renderPage("# D\n\n```json\n" + JSON.stringify({ summary: { files: evil, byResult: { "applied clean": evil } },
    files: [{ file: "a", result: "applied clean" }] }) + "\n```\n");
  for (const html of [audit, diff]) assert.ok(!html.includes("<img src=x"), "summary text reached the page");
  assert.match(audit, /<b>1<\/b> of 1 library must change/);
});

test("a data block with the wrong shape still renders", () => {
  for (const data of [
    { libraries: [null, { name: "x", targets: "android", breakingChanges: "x", dependsOn: "y", native: "z" }] },
    { libraries: {} }, { files: {} }, { files: [null, { file: 1, result: 2 }], handApplied: "x", openQuestions: "y" },
  ]) {
    const html = renderPage("# R\n\ntext\n\n```json\n" + JSON.stringify(data) + "\n```\n");
    assert.match(html, /id="full-report"/);
  }
});

test("inline: code inside link labels, bold URLs and stray placeholder bytes", () => {
  assert.equal(inline("[`rnv`](https://x.dev)"), '<a href="https://x.dev"><code>rnv</code></a>');
  assert.equal(inline("**https://a.com/x**"), '<strong><a href="https://a.com/x">https://a.com/x</a></strong>');
  assert.ok(!inline("`a` \u00000\u0000").includes("<code>a</code> <code>"));
});

test("lists keep their numbers across blank lines", () => {
  const { html } = markdownToHtml("3. three\n\n4. four\n");
  assert.match(html, /<ol start="3"><li>three<\/li><li>four<\/li><\/ol>/);
});

test("report headings never take the page's own ids, and evidence links match whole names", () => {
  const md = "# R\n\n## Tip\n\n### native-stack — minor bump, recommended\n\n### native — ok\n\n```json\n" +
    JSON.stringify({ libraries: [{ name: "native", verdict: "major bump", need: "required" }] }) + "\n```\n";
  const html = renderPage(md);
  assert.equal(count(html, 'id="tip"'), 1);
  assert.match(html, /href="#native-ok"/);
  assert.ok(!html.includes('href="#native-stack'));
});

test("CLI: works through a symlink, rejects a bad --out", async () => {
  const { symlinkSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "render-html-"));
  const report = join(dir, "r.md");
  writeFileSync(report, "# R\n");
  const link = join(dir, "link.mjs");
  symlinkSync(join(process.cwd(), RENDERER), link);
  const out = execFileSync("node", [link, report], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  assert.equal(out, join(dir, "r.html"));
  for (const args of [[report, "--out"], [report, "--out", report], [report, "--out", join(dir, "missing", "x.html")]]) {
    assert.throws(() => execFileSync("node", [RENDERER, ...args], { stdio: "pipe" }), (e) => e.status === 1 && /render-html: /.test(String(e.stderr)));
  }
});
