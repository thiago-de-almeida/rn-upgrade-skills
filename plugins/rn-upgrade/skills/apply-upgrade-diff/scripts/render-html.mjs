#!/usr/bin/env node
// Turns an rn-upgrade report (Markdown ending in a ```json data block) into one self-contained HTML
// page: a dashboard built from the data block, then the full report. No dependencies, no network.
// The same file ships with every rn-upgrade skill; keep the copies identical.
//
//   node render-html.mjs <report.md> [--out <page.html>]
//
// Prints the path of the page it wrote. A missing or broken data block is a warning, not an error.

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DISPLAY_600, MONO_400, MONO_600 } from "./render-html-fonts.mjs";

// ---------------------------------------------------------------------------------------------
// Markdown (the subset the reports use)

const esc = (text) => String(text ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const safeUrl = (url) => /^(https?:\/\/|#)/i.test(url);

export function slugify(text) {
  return String(text).toLowerCase()
    .replace(/`|\*\*|__/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

// Inline marks: code spans, links, bare URLs, bold, italic. Everything else is escaped.
// Finished HTML is parked in a stash behind \u0000N\u0000 tokens so later passes cannot touch it.
export function inline(text) {
  const stash = [];
  let html = inlineInto(String(text ?? "").replace(/\u0000/g, ""), stash), previous;
  do {
    previous = html;
    html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
  } while (html !== previous);
  return html;
}

function inlineInto(text, stash) {
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  const out = text
    .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${esc(code)}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label, url) => url.includes("\u0000") ? all :
      keep(safeUrl(url) ? `<a href="${esc(url)}">${inlineInto(label, stash)}</a>` : inlineInto(label, stash)));
  return esc(out)
    .replace(/https?:\/\/[^\s<>"'\u0000]+/g, (url) => {
      const trail = /[.,;:!?)\]*_]+$/.exec(url)?.[0] ?? "";
      const clean = url.slice(0, url.length - trail.length);
      return keep(`<a href="${clean}">${clean}</a>`) + trail;
    })
    .replace(/\*\*(?=\S)(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(?=\S)([^*]+?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_(?=\S)([^_]+?)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
}

const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "")
  .split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
const isTableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

// Returns { html, headings: [{ level, text, id }] }. Heading ids skip the ones in `reserved`.
export function markdownToHtml(md, { reserved = [] } = {}) {
  const lines = String(md).replace(/\r\n?/g, "\n").split("\n");
  const headings = [];
  const used = new Map(reserved.map((id) => [id, 1]));
  const uniqueId = (text) => {
    const base = slugify(text);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^\s*```(\S*)\s*$/.exec(line);
    if (fence) {
      const body = [];
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) body.push(lines[i]);
      i++;
      const code = `<pre><code${fence[1] ? ` class="language-${esc(fence[1])}"` : ""}>${esc(body.join("\n"))}</code></pre>`;
      const big = body.join("\n").length > 4000;
      html.push(big ? `<details class="code-fold"><summary>${esc(fence[1] || "code")} · ${body.length} lines</summary>${code}</details>` : code);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const id = uniqueId(text);
      headings.push({ level, text, id });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { html.push("<hr>"); i++; continue; }

    if (/^\s*>/.test(line)) {
      const body = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s*>\s?/, ""));
      html.push(`<blockquote>${markdownToHtml(body.join("\n")).html}</blockquote>`);
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(line);
      const rows = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith("|"); i++) rows.push(splitRow(lines[i]));
      html.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    if (LIST.test(line)) {
      // Items with their indentation; continuation lines join the item above.
      const items = [];
      for (; i < lines.length; i++) {
        const m = LIST.exec(lines[i]);
        if (m) {
          items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), start: parseInt(m[2], 10), text: m[3] });
        } else if (!lines[i].trim()) {
          // A blank line keeps the list going when the next item follows it.
          let next = i + 1;
          while (next < lines.length && !lines[next].trim()) next++;
          const after = LIST.exec(lines[next] ?? "");
          // Only the same kind of list continues; "1. a" then "- b" are two lists.
          if (after && (after[1].length > items.at(-1).indent || /\d/.test(after[2]) === items.at(-1).ordered)) i = next - 1;
          else break;
        } else if (/^\s+/.test(lines[i]) && items.length && !/^\s*```/.test(lines[i])) {
          items.at(-1).text += " " + lines[i].trim();
        } else break;
      }
      html.push(renderList(items));
      continue;
    }

    const para = [];
    for (; i < lines.length && lines[i].trim() && !/^\s*(```|#{1,6}\s|>|\|)/.test(lines[i]) && !LIST.test(lines[i]); i++) {
      para.push(lines[i].trim());
    }
    if (!para.length) { para.push(line.trim()); i++; }
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return { html: html.join("\n"), headings };
}

function renderList(items) {
  let html = "";
  const stack = []; // { indent, tag }
  for (const item of items) {
    while (stack.length && item.indent < stack.at(-1).indent) html += `</li></${stack.pop().tag}>`;
    const top = stack.at(-1);
    if (!top || item.indent > top.indent) {
      const tag = item.ordered ? "ol" : "ul";
      stack.push({ indent: item.indent, tag });
      html += `<${tag}${item.ordered && item.start > 1 ? ` start="${item.start}"` : ""}><li>`;
    } else {
      html += "</li><li>";
    }
    html += inline(item.text);
  }
  while (stack.length) html += `</li></${stack.pop().tag}>`;
  return html;
}

// ---------------------------------------------------------------------------------------------
// Data block

export function extractData(md) {
  const blocks = [...String(md).matchAll(/^\s*```json\s*\n([\s\S]*?)\n\s*```\s*$/gm)];
  if (!blocks.length) return { data: null, error: "no ```json block found" };
  try {
    return { data: JSON.parse(blocks.at(-1)[1]), error: null };
  } catch (e) {
    return { data: null, error: `the json block does not parse (${e.message})` };
  }
}

// ---------------------------------------------------------------------------------------------
// Page

// Ids the page itself uses; report headings never take them.
const RESERVED_IDS = ["tip", "q", "shown", "overview", "libraries", "files", "blockers", "constraints", "questions", "hand", "next",
  "changes", "targets-android", "targets-ios", "full-report"];
const VERDICTS = ["ok as is", "minor bump", "major bump", "replace", "patch/fork", "needs human"];
const RESULTS = ["applied clean", "applied by hand", "skipped", "needs human"];
const AUDIT_GROUPS = [["must", "Must change"], ["should", "Should change"], ["human", "Needs a human"], ["ok", "OK as is"]];
const DIFF_GROUPS = [["clean", "Applied clean", "applied clean"], ["hand", "Applied by hand", "applied by hand"],
  ["skip", "Skipped", "skipped"], ["human", "Needs a human", "needs human"]];

// The data block is model-written: take only arrays and objects of the expected shape, and count
// from the rows themselves rather than trusting the summary.
const arr = (x) => (Array.isArray(x) ? x : []);
const objs = (x) => arr(x).filter((v) => v && typeof v === "object" && !Array.isArray(v));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Paths break after a slash, not in the middle of a name.
const path = (text) => esc(text).replace(/\//g, "/<wbr>");
const tag = (text) => `<span class="tag">${esc(text)}</span>`;
const state = (key, label) => `<span class="state s-${key}"><i aria-hidden="true"></i>${esc(label)}</span>`;
const list = (items) => arr(items).length ? `<ul>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>` : "";
const auditGroup = (l) => l.need === "required" ? "must" : l.need === "recommended" ? "should" : l.verdict === "needs human" ? "human" : "ok";

// The two versions, with a tick for every minor crossed between them.
function versions(from, to) {
  const f = /^(\d+)\.(\d+)/.exec(from ?? ""), t = /^(\d+)\.(\d+)/.exec(to ?? "");
  let stops = "";
  if (f && t && f[1] === t[1] && +t[2] - +f[2] > 1 && +t[2] - +f[2] <= 24) {
    for (let m = +f[2] + 1; m < +t[2]; m++) stops += `<span class="stop"><span>${f[1]}.${m}</span></span>`;
  }
  return `<div class="versions"><span class="v">${esc(from ?? "?")}</span>` +
    `<span class="track" aria-hidden="true"><span class="line"></span>${stops}</span>` +
    `<span class="v v-to">${esc(to ?? "?")}</span></div>`;
}

// The signature: one square per library (or file), grouped. A group head filters the table; a square opens its row.
function matrix(groups, label) {
  let i = 0;
  return `<div class="matrix" role="group" aria-label="${esc(label)}">` + groups.filter((g) => g.items.length).map((g) =>
    `<div class="group g-${g.key}"><button type="button" class="group-head" data-filter-facet="group" data-filter-value="${g.key}" aria-pressed="false">` +
    `<i aria-hidden="true"></i><span class="group-count">${g.items.length}</span><span class="group-label">${esc(g.label)}</span></button>` +
    `<div class="cells">${g.items.map((it) => `<a class="cell" href="#${it.id}" data-row="${it.id}" data-tip="${esc(it.tip)}" aria-label="${esc(it.tip)}" style="--i:${i++}"></a>`).join("")}</div></div>`).join("") +
    `</div>`;
}

function filters(facets, placeholder) {
  return `<div class="filters"><label class="search"><span class="sr">${esc(placeholder)}</span><input type="search" id="q" placeholder="${esc(placeholder)}"></label>` +
    facets.map(([facet, label, values]) => `<div class="chips" role="group" aria-label="${esc(label)}">` +
      `<button type="button" class="chip" aria-pressed="true" data-facet="${facet}" data-value="">All</button>` +
      values.map(([value, text]) => `<button type="button" class="chip" aria-pressed="false" data-facet="${facet}" data-value="${esc(value)}">${esc(text)}</button>`).join("") +
      `</div>`).join("") + `<output class="shown" id="shown" aria-live="polite"></output></div>`;
}

const section = (id, title, body, note = "") =>
  `<section class="block" id="${id}"><header class="block-head"><h2>${esc(title)}</h2>${note ? `<p>${note}</p>` : ""}</header>${body}</section>`;

function auditView(data, headings) {
  const libs = objs(data.libraries).map((l) => ({ ...l, name: String(l.name ?? ""), verdict: String(l.verdict ?? "") }));
  const to = data.rn?.to ?? "the target";
  const required = libs.filter((l) => l.need === "required").length;
  const recommended = libs.filter((l) => l.need === "recommended").length;
  const human = libs.filter((l) => l.verdict === "needs human").length;
  const blockers = libs.filter((l) => l.blocksBuild === true);
  const globals = objs(data.globalConstraints);
  const globalBlockers = globals.filter((g) => g.blocksBuild === true);
  const detailsId = (name) => headings.find((h) => {
    const text = h.text.replace(/`/g, "");
    return h.level === 3 && (text === name || text.startsWith(name + " "));
  })?.id;
  const rank = { must: 0, should: 1, human: 2, ok: 3 };
  const sorted = libs.map((l, index) => ({ l, index, group: auditGroup(l) }))
    .sort((a, b) => rank[a.group] - rank[b.group] || a.index - b.index)
    .map((x, n) => ({ ...x, id: `r${n}` }));

  const thesis = `<p class="thesis"><b>${required}</b> of ${plural(libs.length, "library", "libraries")} must change for ${esc(to)}.` +
    (recommended ? ` <b>${recommended}</b> more should.` : "") +
    (blockers.length + globalBlockers.length ? ` <b>${blockers.length + globalBlockers.length}</b> ${blockers.length + globalBlockers.length === 1 ? "thing blocks" : "things block"} the build as it stands.` : "") +
    (human ? ` <b>${human}</b> ${human === 1 ? "needs" : "need"} a human decision.` : "") + `</p>`;
  const groups = AUDIT_GROUPS.map(([key, label]) => ({
    key, label, items: sorted.filter((x) => x.group === key).map((x) => ({ id: x.id, tip: `${x.l.name} · ${x.l.verdict}` })),
  }));

  const rows = sorted.map(({ l, id, group }) => {
    const anchor = detailsId(l.name);
    const search = [l.name, l.verdict, l.need, l.work, l.recommended, ...arr(l.targets)].join(" ").toLowerCase();
    const breaking = objs(l.breakingChanges).map((b) =>
      `<li><span class="affects a-${esc(b.affects ?? "unknown")}">affects: ${esc(b.affects ?? "unknown")}</span> ${inline(b.summary)}` +
      `${arr(b.files).length ? ` <span class="muted">— ${arr(b.files).map(inline).join(", ")}</span>` : ""}</li>`).join("");
    const native = Object.entries(l.native && typeof l.native === "object" ? l.native : {}).filter(([, v]) => v != null)
      .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${inline(String(v))}</dd></div>`).join("");
    const detail = [
      l.work ? `<p><span class="k">Work</span> ${inline(l.work)}</p>` : "",
      arr(l.dependsOn).length ? `<p><span class="k">Moves with</span> ${arr(l.dependsOn).map(inline).join(", ")}</p>` : "",
      breaking ? `<p class="k">Breaking changes</p><ul>${breaking}</ul>` : "",
      native ? `<p class="k">Native values</p><dl class="native">${native}</dl>` : "",
      arr(l.openQuestions).length ? `<p><span class="k">Open questions</span> ${arr(l.openQuestions).map(inline).join(", ")}</p>` : "",
      anchor ? `<p><a href="#${anchor}">Read the evidence in the full report</a></p>` : "",
    ].join("");
    const blocks = l.blocksBuild === true ? state("must", "Blocks") : l.blocksBuild === "unknown" ? `<span class="muted">unknown</span>` : `<span class="muted">—</span>`;
    return `<tr class="row" id="${id}" data-group="${group}" data-verdict="${esc(l.verdict)}" data-need="${esc(l.need ?? "")}" data-search="${esc(search)}">` +
      `<td class="x"><button type="button" class="expand" aria-expanded="false" aria-controls="${id}-d" aria-label="Details for ${esc(l.name)}"></button></td>` +
      `<td class="name">${esc(l.name)}</td>` +
      `<td class="ver"><span class="from">${esc(l.installed)}</span><span class="arrow" aria-hidden="true">→</span><span class="to">${inline(l.recommended)}</span></td>` +
      `<td>${tag(l.verdict)}</td><td>${state(group, AUDIT_GROUPS.find(([k]) => k === group)[1])}</td><td>${blocks}</td>` +
      `<td class="muted">${esc(arr(l.targets).join(", ")) || "—"}</td><td class="num" title="Highest evidence rung reached">${esc(l.confidence ?? "")}</td></tr>` +
      `<tr class="detail" id="${id}-d" hidden><td></td><td colspan="7"><div class="detail-body">${detail || `<p class="muted">No details in the data block.</p>`}</div></td></tr>`;
  }).join("");

  const blockerList = [
    ...globalBlockers.map((g) => `<li><span class="b-name">${esc(g.id)}</span><span class="b-what">${inline(g.description)}</span><span class="b-tags">${arr(g.targets).map(tag).join("")}</span></li>`),
    ...blockers.map((l) => {
      const what = /^(replace|remove)\b/i.test(l.recommended ?? "") ? inline(l.recommended) : `${esc(l.verdict)} to ${inline(l.recommended)}`;
      return `<li><span class="b-name">${esc(l.name)}</span><span class="b-what">${what}</span><span class="b-tags">${arr(l.targets).map(tag).join("")}</span></li>`;
    }),
  ].join("");
  const constraintList = globals.filter((g) => g.blocksBuild !== true)
    .map((g) => `<li><span class="b-name">${esc(g.id)}</span><span class="b-what">${inline(g.description)}</span></li>`).join("");
  const verdicts = VERDICTS.filter((v) => libs.some((l) => l.verdict === v)).map((v) => [v, v]);

  return {
    hero: thesis + matrix(groups, "Libraries by need"),
    body: [
      blockerList ? section("blockers", "Before it builds", `<ol class="blockers">${blockerList}</ol>`, "Each of these stops the build on the target as the app is today.") : "",
      constraintList ? section("constraints", "Other constraints", `<ul class="constraints">${constraintList}</ul>`) : "",
      section("libraries", "Libraries", filters([["group", "Need", AUDIT_GROUPS.filter(([k]) => groups.find((g) => g.key === k).items.length)],
        ["verdict", "Verdict", verdicts]], "Filter by name, verdict or platform") +
        `<div class="table-wrap"><table class="data"><thead><tr><th class="x"></th><th data-sort="name">Library</th><th>Installed → recommended</th>` +
        `<th data-sort="verdict">Verdict</th><th data-sort="group">Need</th><th>Build</th><th>Targets</th><th data-sort="confidence">Conf.</th></tr></thead>` +
        `<tbody>${rows}</tbody></table></div>`),
    ].join("\n"),
  };
}

function diffView(data) {
  const files = objs(data.files).map((f) => ({ ...f, file: String(f.file ?? ""), result: String(f.result ?? "") }));
  const by = files.reduce((acc, f) => ({ ...acc, [f.result]: (acc[f.result] ?? 0) + 1 }), {});
  const total = files.length;
  const keyOf = (result) => DIFF_GROUPS.find(([, , r]) => r === result)?.[0] ?? "skip";
  const rows = files.map((f, n) => ({ f, id: `r${n}`, group: keyOf(f.result) }));
  const n = (r) => by[r] ?? 0;
  const rest = [
    n("applied by hand") ? `${n("applied by hand")} needed a hand edit` : "",
    n("skipped") ? `${n("skipped")} ${n("skipped") === 1 ? "was" : "were"} skipped` : "",
    n("needs human") ? `<b>${n("needs human")}</b> ${n("needs human") === 1 ? "was" : "were"} left for a human` : "none were left unapplied",
  ].filter(Boolean);
  const decisions = arr(data.openQuestions).length;
  const thesis = `<p class="thesis"><b>${n("applied clean")}</b> of ${plural(total, "template file", "template files")} applied cleanly. ` +
    `${rest.length > 1 ? rest.slice(0, -1).join(", ") + " and " + rest.at(-1) : rest[0]}.` +
    (decisions ? ` <b>${decisions}</b> ${decisions === 1 ? "decision needs" : "decisions need"} a human.` : "") + `</p>`;
  const groups = DIFF_GROUPS.map(([key, label]) => ({
    key, label, items: rows.filter((x) => x.group === key).map((x) => ({ id: x.id, tip: `${x.f.file} · ${x.f.result}` })),
  }));
  const label = Object.fromEntries(DIFF_GROUPS.map(([k, l]) => [k, l]));
  const table = rows.map(({ f, id, group }) => `<tr class="row" id="${id}" data-group="${group}" data-result="${esc(f.result)}" ` +
    `data-search="${esc([f.file, f.result, f.cause, f.evidence].join(" ").toLowerCase())}">` +
    `<td class="name file">${path(f.file)}</td><td>${state(group, label[group])}</td><td>${inline(f.cause)}</td><td class="evidence">${inline(f.evidence)}</td></tr>`).join("");
  const hand = objs(data.handApplied).map((h) =>
    `<li><p class="file">${path(h.file)}</p><p>${inline(h.change)}</p>${h.why ? `<p class="why"><span class="k">Why it matches the template</span> ${inline(h.why)}</p>` : ""}</li>`).join("");
  return {
    hero: thesis + matrix(groups, "Files by result"),
    body: [
      arr(data.openQuestions).length ? section("questions", "Decisions for a human", `<ol class="questions">${arr(data.openQuestions).map((q) => `<li>${inline(q)}</li>`).join("")}</ol>`) : "",
      hand ? section("hand", "Applied by hand", `<ul class="hand">${hand}</ul>`, "What changed in each file, and why it keeps the template's intent.") : "",
      section("files", "Files", filters([["group", "Result", DIFF_GROUPS.filter(([k]) => groups.find((g) => g.key === k).items.length).map(([k, l]) => [k, l])]], "Filter by file, cause or evidence") +
        `<div class="table-wrap"><table class="data"><thead><tr><th data-sort="name">File</th><th data-sort="group">Result</th><th>Cause</th><th>Evidence</th></tr></thead>` +
        `<tbody>${table}</tbody></table></div>`),
      arr(data.nextSteps).length ? section("next", "Next steps", list(arr(data.nextSteps)), "Out of this skill's scope: install, pods, library upgrades and the build.") : "",
    ].join("\n"),
  };
}

const TARGET_GROUPS = [["must", "Affects the app", "yes"], ["human", "Unknown", "unknown"], ["ok", "Does not affect", "no"]];
const PLATFORM = { android: "Android", ios: "iOS" };
const platformName = (p) => PLATFORM[String(p ?? "").toLowerCase()] ?? String(p ?? "Platform");
// Dotted versions compare numerically ("15.1" = "15.1.0" < "16.4"); anything else only by text.
function compareVersions(a, b) {
  if (!/^\d+(\.\d+)*$/.test(a) || !/^\d+(\.\d+)*$/.test(b)) return a === b ? 0 : NaN;
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  }
  return 0;
}
// A value moves only when the required one is known and higher (or not comparable and different).
const moves = (f) => {
  if (!f.required) return false;
  const c = compareVersions(f.required, f.current);
  return Number.isNaN(c) ? f.current !== f.required : c > 0;
};

function targetsView(data) {
  // One entry per platform, even if the data lists "android" twice.
  const byName = new Map();
  for (const p of objs(data.platforms)) {
    const name = platformName(p.platform);
    const entry = byName.get(name) ?? byName.set(name, { name, fields: [], store: [], changes: [] }).get(name);
    entry.fields.push(...objs(p.fields).map((f) => ({ ...f, name: String(f.name ?? ""), current: String(f.current ?? "").trim(), required: String(f.required ?? "").trim() })));
    entry.store.push(...objs(p.store));
    entry.changes.push(...objs(p.changes).map((c) => ({ ...c, affects: ["yes", "no"].includes(c.affects) ? c.affects : "unknown" })));
  }
  const platforms = [...byName.values()];
  const changes = platforms.flatMap((p) => p.changes.map((c) => ({ ...c, platform: p.name })));
  const keyOf = (affects) => TARGET_GROUPS.find(([, , a]) => a === affects)[0];
  const rows = changes.map((c, n) => ({ c, id: `r${n}`, group: keyOf(c.affects) }));
  const yes = changes.filter((c) => c.affects === "yes").length;
  const unknown = changes.filter((c) => c.affects === "unknown").length;
  const perPlatform = platforms.map((p) => {
    const moving = p.fields.filter(moves).map((f) => `${esc(f.name)} ${esc(f.current || "?")} → ${esc(f.required)}`);
    return `${esc(p.name)}: ${moving.length ? moving.join(", ") : "nothing has to move"}.`;
  }).join(" ");
  const thesis = `<p class="thesis">${perPlatform} <b>${yes}</b> of ${changes.length} platform changes ${yes === 1 ? "affects" : "affect"} the app` +
    `${unknown ? `, <b>${unknown}</b> unknown` : ""}.</p>`;
  const groups = TARGET_GROUPS.map(([key, label]) => ({
    key, label, items: rows.filter((x) => x.group === key).map((x) => ({ id: x.id, tip: `${x.c.platform} · ${x.c.version ?? ""} · ${x.c.summary ?? ""}` })),
  }));
  const label = Object.fromEntries(TARGET_GROUPS.map(([k, l]) => [k, l]));

  const targetTables = platforms.map((p) => {
    const body = p.fields.map((f) => `<tr><td class="name">${esc(f.name)}</td>` +
      `<td class="ver"><span class="from">${esc(f.current || "?")}</span><span class="arrow" aria-hidden="true">→</span><span class="to">${esc(f.required || "?")}</span></td>` +
      `<td>${!f.required ? `<span class="muted">unknown</span>` : moves(f) ? state("should", "Moves") : `<span class="muted">stays</span>`}</td>` +
      `<td>${arr(f.requiredBy).map(inline).join("<br>") || `<span class="muted">—</span>`}</td><td class="evidence">${inline(f.evidence)}</td></tr>`).join("");
    const store = p.store.map((r) => `<li>${r.met === true ? state("ok", "Met") : r.met === false ? state("must", "Not met") : state("human", "Check")} ` +
      `${inline(r.rule)}${r.date ? ` <span class="tag">${esc(r.date)}</span>` : ""}${typeof r.url === "string" && safeUrl(r.url) ? ` <a href="${esc(r.url)}">source</a>` : ""}</li>`).join("");
    return section(`targets-${slugify(p.name)}`, `${p.name} targets`,
      (body ? `<div class="table-wrap"><table class="data"><thead><tr><th>Value</th><th>Current → required</th><th></th><th>Required by</th><th>Evidence</th></tr></thead><tbody>${body}</tbody></table></div>` : `<p class="muted">No values in the data block.</p>`) +
      (store ? `<ul class="store">${store}</ul>` : ""));
  }).join("\n");

  const table = rows.map(({ c, id, group }) => `<tr class="row" id="${id}" data-group="${group}" data-platform="${esc(c.platform)}" ` +
    `data-search="${esc([c.platform, c.version, c.summary, ...arr(c.files)].join(" ").toLowerCase())}">` +
    `<td class="name">${esc(c.platform)}</td><td class="mono">${esc(c.version ?? "")}</td><td>${inline(c.summary)}</td><td>${state(group, label[group])}</td>` +
    `<td class="evidence">${arr(c.files).map(inline).join("<br>") || `<span class="muted">—</span>`}${c.evidence ? `<br><span class="muted">${inline(c.evidence)}</span>` : ""}</td></tr>`).join("");
  const platformChips = platforms.map((p) => [p.name, p.name]);
  return {
    hero: thesis + matrix(groups, "Platform changes by impact"),
    body: [
      targetTables,
      !changes.length ? "" : section("changes", "Platform changes", filters([["group", "Impact", TARGET_GROUPS.filter(([k]) => groups.find((g) => g.key === k).items.length).map(([k, l]) => [k, l])],
        ["platform", "Platform", platformChips]], "Filter by change, version or file") +
        `<div class="table-wrap"><table class="data"><thead><tr><th data-sort="platform">Platform</th><th>Version</th><th>Change</th><th data-sort="group">Impact</th><th>Where in the app</th></tr></thead>` +
        `<tbody>${table}</tbody></table></div>`),
      arr(data.openQuestions).length ? section("questions", "Decisions for a human", `<ol class="questions">${arr(data.openQuestions).map((q) => `<li>${inline(q)}</li>`).join("")}</ol>`) : "",
    ].join("\n"),
  };
}

export function renderPage(md, { source = "report.md" } = {}) {
  const { html: reportHtml, headings } = markdownToHtml(md, { reserved: RESERVED_IDS });
  const { data: raw, error: dataError } = extractData(md);
  const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  if (data && !(data.rn && typeof data.rn === "object")) data.rn = null;
  const kind = Array.isArray(data?.libraries) ? "audit" : Array.isArray(data?.files) ? "diff" : Array.isArray(data?.platforms) ? "targets" : null;
  const title = headings.find((h) => h.level === 1)?.text.replace(/`/g, "") ?? source;
  let view = null, error = dataError ?? (raw && !kind ? "the json block has no libraries, files or platforms" : null);
  try {
    view = kind === "audit" ? auditView(data, headings) : kind === "diff" ? diffView(data) : kind === "targets" ? targetsView(data) : null;
  } catch (e) {
    error = `the summary could not be built (${e.message})`;
  }
  const kindLabel = kind === "audit" ? "Library audit" : kind === "diff" ? "Upgrade Helper diff" : kind === "targets" ? "Platform targets" : "Report";
  const diffLink = typeof data?.diffUrl === "string" && safeUrl(data.diffUrl) ? ` · <a href="${esc(data.diffUrl)}">the diff</a>` : "";
  const notice = view ? "" : `<p class="notice" role="note">No data block in this report${error && !error.startsWith("no ") ? ` (${esc(error)})` : ""}, so there is no summary: the full report is below.</p>`;
  const toc = headings.filter((h) => h.level === 2).map((h) => `<li><a href="#${h.id}">${inline(h.text)}</a></li>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${FONTS}${CSS}</style>
</head>
<body>
<header class="hero"><div class="wrap">
<p class="eyebrow"><span>${kindLabel}</span><span class="src">${esc(source)}</span>${diffLink}</p>
<h1>${inline(title)}</h1>
${data?.rn ? versions(data.rn.from, data.rn.to) : ""}
${view ? view.hero : notice}
</div></header>
<main class="wrap">
${view ? view.body : ""}
<section class="block report-block" id="full-report"><header class="block-head"><h2>Full report</h2><p>The Markdown report, as the skill wrote it.</p></header>
<div class="report-layout">${toc ? `<nav class="toc" aria-label="Report sections"><ol>${toc}</ol></nav>` : ""}<article class="report">${reportHtml}</article></div>
</section>
<footer>Rendered by render-html.mjs from the Markdown report. The page loads nothing from the network.</footer>
</main>
<div class="tip" id="tip" role="tooltip" hidden></div>
<script>${JS}</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------------------------
// Styles and behaviour (inline: the page must open offline)

const FONTS = [["Plex Condensed", DISPLAY_600, 600], ["Plex Mono", MONO_400, 400], ["Plex Mono", MONO_600, 600]]
  .map(([family, data, weight]) => `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${data}) format("woff2")}`)
  .join("");

const CSS = `
:root{color-scheme:light;
--paper:#eef1f4;--surface:#fff;--ink:#0f1720;--ink-2:#4a5664;--muted:#6b7785;--rule:#d5dbe2;--rule-2:#e6eaee;
--accent:#0a7ea4;--accent-ink:#065e7b;--wash:#e3f4fa;
--must:#c8312b;--should:#b97800;--human:#6d4bd1;--ok:#2e8a57;--skip:#8a96a3;--clean:#2e8a57;--hand:#b97800;
--display:"Plex Condensed","IBM Plex Sans Condensed","Arial Narrow",system-ui,sans-serif;
--mono:"Plex Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
--body:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;
--paper:#0b1015;--surface:#121a22;--ink:#e8eef4;--ink-2:#a9b7c5;--muted:#7f8e9d;--rule:#253241;--rule-2:#1b2631;
--accent:#61dafb;--accent-ink:#9be8fd;--wash:#0f2a35;--must:#ef5b52;--should:#e3a21a;--human:#9b82f0;--ok:#4cb87c;--skip:#7f8e9d;--clean:#4cb87c;--hand:#e3a21a}}
:root[data-theme="dark"]{color-scheme:dark;--paper:#0b1015;--surface:#121a22;--ink:#e8eef4;--ink-2:#a9b7c5;--muted:#7f8e9d;--rule:#253241;--rule-2:#1b2631;
--accent:#61dafb;--accent-ink:#9be8fd;--wash:#0f2a35;--must:#ef5b52;--should:#e3a21a;--human:#9b82f0;--ok:#4cb87c;--skip:#7f8e9d;--clean:#4cb87c;--hand:#e3a21a}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:16px}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 var(--body);-webkit-text-size-adjust:100%}
a{color:var(--accent-ink);text-decoration-thickness:1px;text-underline-offset:3px}
a:hover{color:var(--ink)}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.muted{color:var(--muted)}
code,pre,.mono{font-family:var(--mono);font-size:.86em}

/* Hero */
.hero{background:var(--surface);border-bottom:1px solid var(--rule);padding:40px 0 36px}
.eyebrow{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 10px;font:600 12px/1.4 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.eyebrow span:first-child{color:var(--accent-ink)}
.eyebrow .src{text-transform:none;letter-spacing:0;font-weight:400}
.hero h1{margin:0 0 28px;max-width:62ch;font:600 clamp(18px,2vw,22px)/1.3 var(--display);letter-spacing:.005em;color:var(--ink-2)}
.versions{display:flex;align-items:center;gap:clamp(12px,2.4vw,28px);margin:0 0 26px}
.v{font:600 clamp(40px,8.6vw,104px)/.9 var(--display);letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:var(--muted)}
.v-to{color:var(--ink)}
.track{position:relative;flex:1;display:flex;justify-content:space-around;align-items:center;min-width:60px;height:48px}
.track .line{position:absolute;left:0;right:12px;top:50%;height:2px;background:linear-gradient(90deg,var(--rule),var(--accent))}
.track::after{content:"";position:absolute;right:0;top:50%;width:12px;height:12px;border-top:2px solid var(--accent);border-right:2px solid var(--accent);transform:translate(-2px,-50%) rotate(45deg)}
.stop{position:relative;width:2px;height:12px;background:var(--rule);z-index:1}
.stop span{position:absolute;top:18px;left:50%;transform:translateX(-50%);font:400 11px/1 var(--mono);color:var(--muted);white-space:nowrap}
.thesis{max-width:52ch;text-wrap:pretty;margin:0 0 30px;font:400 clamp(19px,2.2vw,24px)/1.4 var(--body);color:var(--ink-2)}
.thesis b{font-family:var(--display);font-weight:600;font-size:1.2em;color:var(--ink);font-variant-numeric:tabular-nums}
.notice{max-width:60ch;margin:0;padding:12px 16px;border-left:3px solid var(--should);background:var(--paper);border-radius:0 6px 6px 0}

/* The matrix */
.matrix{display:flex;flex-wrap:wrap;gap:22px 34px}
.group{min-width:0}
.group-head{display:flex;align-items:baseline;gap:8px;margin:0 0 10px;padding:2px 6px 2px 0;border:0;background:none;color:var(--ink-2);font:inherit;cursor:pointer;border-radius:4px}
.group-head i{align-self:center;width:10px;height:10px;border-radius:2px;background:var(--c)}
.group-count{font:600 22px/1 var(--display);color:var(--ink);font-variant-numeric:tabular-nums}
.group-label{font-size:13px}
.group-head:hover .group-label,.group-head[aria-pressed="true"] .group-label{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.cells{display:grid;grid-template-columns:repeat(var(--cols,10),18px);gap:4px}
.cell{display:block;width:18px;height:18px;border-radius:3px;background:var(--c);opacity:.92;animation:pop .5s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--i) * 9ms)}
.cell:hover,.cell:focus-visible{opacity:1;outline:2px solid var(--ink);outline-offset:1px}
.g-must,.s-must{--c:var(--must)}.g-should,.s-should{--c:var(--should)}.g-human,.s-human{--c:var(--human)}.g-ok,.s-ok{--c:var(--ok)}
.g-clean,.s-clean{--c:var(--clean)}.g-hand,.s-hand{--c:var(--hand)}.g-skip,.s-skip{--c:var(--skip)}
.g-ok .cell,.g-skip .cell{background:transparent;box-shadow:inset 0 0 0 2px var(--c)}
@keyframes pop{from{opacity:0;transform:scale(.4)}to{opacity:.92;transform:none}}

/* Sections */
main{padding:8px 16px 0}
.block{margin:40px 0}
.block-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;margin:0 0 14px;padding-bottom:10px;border-bottom:2px solid var(--ink)}
.block-head h2{margin:0;font:600 26px/1.1 var(--display);letter-spacing:.005em}
.block-head p{margin:0;color:var(--muted);font-size:14px}
.blockers,.constraints,.questions{margin:0;padding:0;list-style:none;counter-reset:n}
.blockers li,.constraints li{display:grid;grid-template-columns:minmax(150px,240px) 1fr auto;gap:4px 18px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--rule-2)}
.blockers li{grid-template-columns:20px minmax(150px,240px) 1fr auto;counter-increment:n}
.blockers li::before{content:"";width:10px;height:10px;border-radius:2px;background:var(--must);transform:translateY(1px)}
.b-name{font:600 14px/1.4 var(--mono);overflow-wrap:anywhere}
.b-what{color:var(--ink-2);font-size:14px}
.b-tags{display:flex;gap:4px;justify-content:flex-end}
.store{margin:12px 0 0;padding:0;list-style:none}.store li{padding:6px 0;font-size:14px}
.questions li{position:relative;padding:12px 0 12px 40px;border-bottom:1px solid var(--rule-2);counter-increment:n}
.questions li::before{content:counter(n);position:absolute;left:0;top:10px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:var(--human);color:#fff;font:600 13px/1 var(--mono)}
.hand{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.hand li{background:var(--surface);border:1px solid var(--rule);border-top:3px solid var(--hand);border-radius:6px;padding:14px 16px}
.hand p{margin:0 0 8px;font-size:14px}.hand .file{font:600 13px/1.4 var(--mono)}
.hand .why{color:var(--ink-2);margin:0}
.k{font:600 11px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-right:6px}
p.k{margin:12px 0 4px}

/* Tags and states */
.tag{display:inline-block;padding:1px 7px;border:1px solid var(--rule);border-radius:4px;font:400 12px/1.5 var(--mono);color:var(--ink-2);white-space:nowrap;background:var(--surface)}
.state{display:inline-flex;align-items:center;gap:7px;font-size:13px;white-space:nowrap}
.state i{width:9px;height:9px;border-radius:2px;background:var(--c)}
.s-ok i,.s-skip i{background:transparent;box-shadow:inset 0 0 0 2px var(--c)}
.affects{font:400 11px/1.5 var(--mono);padding:0 5px;border-radius:3px;background:var(--paper);color:var(--muted)}
.affects.a-yes{background:var(--must);color:#fff}

/* Filters and table */
.filters{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;margin:0 0 12px}
.search{flex:1 1 260px;min-width:0}
.search input{width:100%;padding:9px 12px;border:1px solid var(--rule);border-radius:6px;background:var(--surface);color:var(--ink);font:inherit}
.search input:focus{outline:2px solid var(--accent);outline-offset:0;border-color:transparent}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.chip{padding:5px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--surface);color:var(--ink-2);font:13px/1.2 var(--body);cursor:pointer}
.chip:hover{border-color:var(--ink-2)}
.chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.shown{margin-left:auto;font:12px/1 var(--mono);color:var(--muted)}
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;background:var(--surface);border:1px solid var(--rule);border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{padding:9px 12px;border-bottom:1px solid var(--rule-2);text-align:left;vertical-align:top}
thead th{position:sticky;top:0;z-index:1;background:var(--surface);border-bottom:1px solid var(--rule);font:600 11px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
th[data-sort]{cursor:pointer}th[data-sort]:hover{color:var(--ink)}
tbody tr:last-child td{border-bottom:0}
table.data{min-width:880px}
table.data .name{font:600 13px/1.5 var(--mono);white-space:nowrap}
table.data .file{white-space:normal;min-width:220px}
table.data .evidence{min-width:280px;color:var(--ink-2)}
table.data .num{text-align:right;font:400 13px/1.5 var(--mono)}
.ver{font:400 13px/1.5 var(--mono);min-width:200px}.ver .from{color:var(--muted)}.ver .arrow{margin:0 6px;color:var(--muted)}
td.x,th.x{width:30px;padding-right:0}
tr.row:hover td{background:var(--paper)}
tr.row.flash td{animation:flash 1.4s ease-out}
@keyframes flash{from{background:var(--wash)}to{background:transparent}}
.expand{width:22px;height:22px;border:1px solid var(--rule);border-radius:4px;background:var(--surface);cursor:pointer;position:relative}
.expand::before{content:"";position:absolute;inset:0;margin:auto;width:6px;height:6px;border-right:1.5px solid var(--ink-2);border-bottom:1.5px solid var(--ink-2);transform:translate(-1px,-1px) rotate(-45deg);transition:transform .15s}
.expand[aria-expanded="true"]::before{transform:translate(0,-2px) rotate(45deg)}
tr.detail>td{background:var(--paper);border-bottom:1px solid var(--rule)}
.detail-body{max-width:900px;padding:4px 0 8px}
.detail-body p{margin:6px 0}.detail-body ul{margin:4px 0 8px;padding-left:18px}.detail-body li{margin:3px 0}
.native{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 18px;margin:4px 0 8px}
.native div{display:flex;gap:8px;min-width:0}.native dt{font:400 12px/1.6 var(--mono);color:var(--muted);flex:none}.native dd{margin:0;font-size:13px;overflow-wrap:anywhere}

/* Full report */
.report-layout{display:grid;grid-template-columns:1fr;gap:32px}
@media (min-width:1080px){.report-layout{grid-template-columns:220px minmax(0,1fr)}}
.toc{display:none}
@media (min-width:1080px){.toc{display:block;position:sticky;top:16px;align-self:start;max-height:calc(100vh - 32px);overflow:auto}}
.toc ol{margin:0;padding:0;list-style:none;border-left:1px solid var(--rule)}
.toc a{display:block;padding:5px 0 5px 14px;margin-left:-1px;border-left:2px solid transparent;color:var(--ink-2);text-decoration:none;font-size:13px;line-height:1.35}
.toc a:hover{color:var(--ink);border-left-color:var(--accent)}
.report{min-width:0;max-width:920px;overflow-wrap:break-word}
.report h1{font:600 24px/1.2 var(--display);margin:0 0 14px}
.report h2{font:600 22px/1.2 var(--display);margin:36px 0 12px;padding-top:16px;border-top:1px solid var(--rule)}
.report h3{font:600 15px/1.4 var(--mono);margin:26px 0 8px}
.report h4{font-size:15px;margin:18px 0 6px}
.report :target{background:var(--wash);box-shadow:0 0 0 6px var(--wash);border-radius:2px}
.report blockquote{margin:14px 0;padding:6px 18px;border-left:3px solid var(--accent);background:var(--surface);color:var(--ink-2)}
.report ul,.report ol{padding-left:22px}.report li{margin:3px 0}
.report .table-wrap{margin:10px 0 18px}
.report td,.report th{min-width:110px}.report td:last-child{min-width:260px}
code{background:var(--rule-2);padding:1px 5px;border-radius:3px}
pre{background:var(--surface);border:1px solid var(--rule);padding:14px;border-radius:6px;overflow-x:auto;line-height:1.5}pre code{padding:0;background:none}
.code-fold{margin:10px 0}.code-fold summary{cursor:pointer;font:400 13px/1.4 var(--mono);color:var(--ink-2);padding:6px 0}
footer{margin:48px 0 0;padding:20px 0 48px;border-top:1px solid var(--rule);font-size:13px;color:var(--muted)}
.tip{position:fixed;z-index:10;pointer-events:none;max-width:320px;padding:6px 9px;border-radius:4px;background:var(--ink);color:var(--surface);font:400 12px/1.4 var(--mono)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:720px){.hero{padding:28px 0 26px}.v{font-size:clamp(34px,11vw,56px)}.stop span{display:none}
.blockers li,.constraints li{grid-template-columns:1fr}.blockers li{grid-template-columns:16px 1fr}.blockers li>*:not(.b-name){grid-column:2}.b-tags{justify-content:flex-start}
.shown{margin-left:0;width:100%}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media (forced-colors:active){.cell,.group-head i,.state i,.blockers li::before{forced-color-adjust:none;background:CanvasText}}
@media print{.filters,.expand,.toc,.tip{display:none}tr.detail{display:table-row!important}.hero{border:0}}
`;

const JS = `"use strict";
(() => {
  for (const cells of document.querySelectorAll(".cells")) cells.style.setProperty("--cols", String(Math.min(12, Math.max(4, Math.ceil(Math.sqrt(cells.children.length * 1.6))))));
  const rows = [...document.querySelectorAll("tr.row")];
  const tip = document.getElementById("tip");
  for (const el of document.querySelectorAll("[data-tip]")) {
    el.addEventListener("pointermove", (e) => {
      tip.textContent = el.dataset.tip; tip.hidden = false;
      tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = (e.clientY + 16) + "px";
    });
    el.addEventListener("pointerleave", () => { tip.hidden = true; });
  }
  if (!rows.length) return;
  const tbody = rows[0].parentNode;
  const detailOf = (row) => document.getElementById(row.id + "-d");
  const state = { q: "", facet: {} };
  const shown = document.getElementById("shown");
  const setOpen = (row, open) => {
    const btn = row.querySelector(".expand"), d = detailOf(row);
    if (!btn || !d) return;
    btn.setAttribute("aria-expanded", String(open)); d.hidden = !open;
  };
  const apply = () => {
    let n = 0;
    for (const row of rows) {
      const ok = (!state.q || row.dataset.search.includes(state.q)) &&
        Object.entries(state.facet).every(([f, v]) => !v || row.dataset[f] === v);
      row.hidden = !ok;
      const d = detailOf(row);
      if (d) d.hidden = !ok || row.querySelector(".expand")?.getAttribute("aria-expanded") !== "true";
      if (ok) n++;
    }
    if (shown) shown.textContent = n === rows.length ? rows.length + " rows" : n + " of " + rows.length + " rows";
    for (const c of document.querySelectorAll(".chip")) c.setAttribute("aria-pressed", String((state.facet[c.dataset.facet] ?? "") === c.dataset.value));
    for (const b of document.querySelectorAll("[data-filter-facet]")) b.setAttribute("aria-pressed", String(state.facet[b.dataset.filterFacet] === b.dataset.filterValue));
  };
  const table = rows[0].closest(".block");
  document.getElementById("q")?.addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); apply(); });
  for (const c of document.querySelectorAll(".chip")) c.addEventListener("click", () => { state.facet[c.dataset.facet] = c.dataset.value; apply(); });
  for (const b of document.querySelectorAll("[data-filter-facet]")) b.addEventListener("click", () => {
    const f = b.dataset.filterFacet, v = b.dataset.filterValue;
    state.facet[f] = state.facet[f] === v ? "" : v;
    apply();
    table?.scrollIntoView({ block: "start" });
  });
  for (const cell of document.querySelectorAll(".cell")) cell.addEventListener("click", (e) => {
    const row = document.getElementById(cell.dataset.row);
    if (!row) return;
    e.preventDefault();
    state.q = ""; state.facet = {}; const q = document.getElementById("q"); if (q) q.value = "";
    apply(); setOpen(row, true);
    row.scrollIntoView({ block: "center" });
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
  });
  for (const btn of document.querySelectorAll(".expand")) btn.addEventListener("click", () => setOpen(btn.closest("tr"), btn.getAttribute("aria-expanded") !== "true"));
  const rank = { must: 0, should: 1, human: 2, ok: 3, clean: 3, hand: 1, skip: 2 };
  for (const th of document.querySelectorAll("th[data-sort]")) {
    let dir = 1;
    th.addEventListener("click", () => {
      const col = th.cellIndex, key = th.dataset.sort;
      const value = (row) => key === "group" ? rank[row.dataset.group] ?? 9 : key === "confidence" ? Number(row.cells[col].textContent) || 0
        : (row.dataset[key] ?? row.cells[col].textContent).toLowerCase();
      rows.sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) * dir);
      for (const row of rows) { tbody.appendChild(row); const d = detailOf(row); if (d) tbody.appendChild(d); }
      dir = -dir;
    });
  }
  apply();
})();`;

// ---------------------------------------------------------------------------------------------
// CLI

function main(argv) {
  const fail = (message) => {
    process.stderr.write(`render-html: ${message}\n`);
    process.exit(1);
  };
  const outIndex = argv.indexOf("--out");
  if (outIndex >= 0 && (!argv[outIndex + 1] || argv[outIndex + 1].startsWith("--"))) fail("--out needs a file path");
  const input = argv.find((a, i) => !a.startsWith("--") && (outIndex < 0 || i !== outIndex + 1));
  if (!input) fail("usage: node render-html.mjs <report.md> [--out <page.html>]");
  let md;
  try {
    md = readFileSync(input, "utf8");
  } catch (e) {
    fail(`cannot read ${input} (${e.message})`);
  }
  const out = resolve(outIndex >= 0 ? argv[outIndex + 1] : input.replace(/\.(md|markdown)$/i, "") + ".html");
  if (out === resolve(input)) fail("--out must not be the report itself");
  const { error } = extractData(md);
  if (error) process.stderr.write(`render-html: warning: ${error}; the page has the full report only\n`);
  try {
    writeFileSync(out, renderPage(md, { source: input.split(/[\\/]/).pop() }));
  } catch (e) {
    fail(`cannot write ${out} (${e.message})`);
  }
  process.stdout.write(out + "\n");
}

// Run as a script, also when reached through a symlink (a linked skills folder, for example).
const invoked = process.argv[1] && (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (invoked) main(process.argv.slice(2));
