#!/usr/bin/env node
// Turns an rn-upgrade report (Markdown ending in a ```json data block) into one self-contained HTML
// page: a dashboard built from the data block, then the full report. No dependencies, no network.
// The same file ships with every rn-upgrade skill; keep the copies identical.
//
//   node render-html.mjs <report.md> [--out <page.html>]
//
// Prints the path of the page it wrote. A missing or broken data block is a warning, not an error.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
export function inline(text) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let out = String(text ?? "")
    .replace(/`([^`]+)`/g, (_, code) => keep(`<code>${esc(code)}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label, url) =>
      safeUrl(url) ? keep(`<a href="${esc(url)}">${inline(label)}</a>`) : keep(esc(label)));
  out = esc(out)
    .replace(/https?:\/\/[^\s<>"'\u0000]+/g, (url) => {
      const trail = /[.,;:!?)\]]+$/.exec(url)?.[0] ?? "";
      const clean = url.slice(0, url.length - trail.length);
      return `<a href="${clean}">${clean}</a>${trail}`;
    })
    .replace(/\*\*(?=\S)(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(?=\S)([^*]+?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_(?=\S)([^_]+?)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "")
  .split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
const isTableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line);
const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

// Returns { html, headings: [{ level, text, id }] }.
export function markdownToHtml(md) {
  const lines = String(md).replace(/\r\n?/g, "\n").split("\n");
  const headings = [];
  const used = new Map();
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
        if (m) items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] });
        else if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length) items.at(-1).text += " " + lines[i].trim();
        else break;
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
      html += `<${tag}><li>`;
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

const VERDICTS = ["ok as is", "minor bump", "major bump", "replace", "patch/fork", "needs human"];
const RESULTS = ["applied clean", "applied by hand", "skipped", "needs human"];
const NEED_LABEL = { required: "Required", recommended: "Recommended" };

const statusChip = (kind, label) => `<span class="status status-${kind}"><span class="dot" aria-hidden="true"></span>${esc(label)}</span>`;
const needChip = (need) => need ? statusChip(need === "required" ? "critical" : "warning", NEED_LABEL[need] ?? need) : `<span class="muted">—</span>`;
const blocksChip = (value) => value === true ? statusChip("critical", "Blocks build")
  : value === "unknown" ? `<span class="muted">unknown</span>` : `<span class="muted">no</span>`;
const pill = (text) => `<span class="pill">${esc(text)}</span>`;
const list = (items, render = inline) => items?.length ? `<ul>${items.map((x) => `<li>${render(x)}</li>`).join("")}</ul>` : "";

function tiles(entries) {
  return `<div class="tiles">${entries.map(([key, label, value, tone]) =>
    `<div class="tile${tone ? ` tile-${tone}` : ""}" data-tile="${key}"><div class="tile-value">${esc(value)}</div><div class="tile-label">${esc(label)}</div></div>`).join("")}</div>`;
}

// One horizontal bar per category; a bar is a button that filters the table.
function bars(title, facet, order, counts, total) {
  const max = Math.max(1, ...order.map((k) => counts[k] ?? 0));
  const rows = order.filter((k) => counts[k]).map((k) => {
    const n = counts[k];
    const pct = total ? Math.round((n / total) * 100) : 0;
    return `<button type="button" class="bar" data-filter-facet="${facet}" data-filter-value="${esc(k)}" ` +
      `data-tip="${esc(`${k}: ${n} of ${total} (${pct}%) · click to filter`)}">` +
      `<span class="bar-label">${esc(k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(n / max) * 100}%"></span></span>` +
      `<span class="bar-value">${n}</span></button>`;
  }).join("");
  return `<section class="card"><h2 class="card-title">${esc(title)}</h2><div class="bars">${rows}</div></section>`;
}

function filters(facets, placeholder) {
  return `<div class="filters"><input type="search" id="q" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}">` +
    facets.map(([facet, label, values]) => `<div class="chips" role="group" aria-label="${esc(label)}"><span class="chips-label">${esc(label)}</span>` +
      `<button type="button" class="chip" aria-pressed="true" data-facet="${facet}" data-value="">All</button>` +
      values.map(([value, text]) => `<button type="button" class="chip" aria-pressed="false" data-facet="${facet}" data-value="${esc(value)}">${esc(text)}</button>`).join("") +
      `</div>`).join("") + `<span class="shown" id="shown"></span></div>`;
}

function auditView(data, headings) {
  const libs = data.libraries ?? [];
  const summary = data.summary ?? {};
  const byVerdict = summary.byVerdict ?? libs.reduce((acc, l) => ({ ...acc, [l.verdict]: (acc[l.verdict] ?? 0) + 1 }), {});
  const blockers = libs.filter((l) => l.blocksBuild === true);
  const globalBlockers = (data.globalConstraints ?? []).filter((g) => g.blocksBuild === true);
  const detailsId = (name) => headings.find((h) => h.level === 3 && h.text.replace(/`/g, "").startsWith(name))?.id;
  const order = (l) => (l.need === "required" ? 0 : l.need === "recommended" ? 1 : l.verdict === "needs human" ? 2 : 3);
  const sorted = libs.map((l, index) => ({ l, index })).sort((a, b) => order(a.l) - order(b.l) || a.index - b.index);

  const rows = sorted.map(({ l }, n) => {
    const id = `r${n}`;
    const anchor = detailsId(l.name);
    const search = [l.name, l.verdict, l.need, l.work, l.recommended, ...(l.targets ?? [])].join(" ").toLowerCase();
    const breaking = (l.breakingChanges ?? []).map((b) =>
      `<li>${pill(`affects: ${b.affects ?? "unknown"}`)} ${inline(b.summary)}${b.files?.length ? ` <span class="muted">— ${b.files.map(inline).join(", ")}</span>` : ""}</li>`).join("");
    const native = Object.entries(l.native ?? {}).filter(([, v]) => v != null).map(([k, v]) => `<li><span class="muted">${esc(k)}</span> ${inline(String(v))}</li>`).join("");
    const detail = [
      l.work ? `<p><strong>Work:</strong> ${inline(l.work)}</p>` : "",
      l.dependsOn?.length ? `<p><strong>Depends on:</strong> ${l.dependsOn.map(inline).join(", ")}</p>` : "",
      breaking ? `<p><strong>Breaking changes</strong></p><ul>${breaking}</ul>` : "",
      native ? `<p><strong>Native</strong></p><ul class="compact">${native}</ul>` : "",
      l.openQuestions?.length ? `<p><strong>Open questions:</strong> ${l.openQuestions.map(inline).join(", ")}</p>` : "",
      anchor ? `<p><a href="#${anchor}">Full evidence in the report ↓</a></p>` : "",
    ].join("");
    return `<tr class="row" id="${id}" data-verdict="${esc(l.verdict)}" data-need="${esc(l.need ?? "")}" data-search="${esc(search)}">` +
      `<td><button type="button" class="expand" aria-expanded="false" aria-controls="${id}-d" aria-label="Show details for ${esc(l.name)}">▸</button></td>` +
      `<td class="name">${anchor ? `<a href="#${anchor}">${esc(l.name)}</a>` : esc(l.name)}</td>` +
      `<td class="mono">${esc(l.installed)}</td><td class="rec">${inline(l.recommended)}</td>` +
      `<td>${pill(l.verdict)}</td><td>${needChip(l.need)}</td><td>${blocksChip(l.blocksBuild)}</td>` +
      `<td>${esc((l.targets ?? []).join(", ")) || `<span class="muted">—</span>`}</td><td class="num">${esc(l.confidence ?? "")}</td></tr>` +
      `<tr class="detail" id="${id}-d" hidden><td></td><td colspan="8">${detail || `<span class="muted">No details in the data block.</span>`}</td></tr>`;
  }).join("");

  const constraints = (data.globalConstraints ?? []).map((g) =>
    `<li>${g.blocksBuild === true ? statusChip("critical", "Blocks build") + " " : ""}<strong>${esc(g.id)}</strong> ${inline(g.description)}</li>`).join("");
  const verdicts = VERDICTS.filter((v) => byVerdict[v]).map((v) => [v, v]);

  return [
    tiles([
      ["audited", "Libraries audited", summary.audited ?? libs.length],
      ["required", "Must change", summary.required ?? libs.filter((l) => l.need === "required").length, "critical"],
      ["recommended", "Should change", summary.recommended ?? libs.filter((l) => l.need === "recommended").length, "warning"],
      ["needs-human", "Need a human", summary.needsHuman ?? byVerdict["needs human"] ?? 0, "serious"],
      ["blockers", "Block the build", blockers.length + globalBlockers.length, "critical"],
    ]),
    `<div class="grid">`,
    bars("Verdicts", "verdict", VERDICTS, byVerdict, libs.length),
    blockers.length || globalBlockers.length
      ? `<section class="card"><h2 class="card-title">Build blockers</h2><ul class="blockers">` +
        globalBlockers.map((g) => `<li><strong>${esc(g.id)}</strong> ${inline(g.description)}</li>`).join("") +
        blockers.map((l) => `<li><strong>${esc(l.name)}</strong> ${pill(l.verdict)} ${esc((l.targets ?? []).join(", "))}</li>`).join("") +
        `</ul></section>`
      : "",
    `</div>`,
    constraints ? `<section class="card"><h2 class="card-title">Global constraints</h2><ul class="constraints">${constraints}</ul></section>` : "",
    `<section class="card" id="libraries"><h2 class="card-title">Libraries</h2>`,
    filters([["need", "Need", [["required", "Required"], ["recommended", "Recommended"]]], ["verdict", "Verdict", verdicts]], "Search libraries"),
    `<div class="table-wrap"><table class="data"><thead><tr><th></th><th data-sort="name">Library</th><th>Installed</th><th>Recommended</th>` +
      `<th data-sort="verdict">Verdict</th><th data-sort="need">Need</th><th>Build</th><th>Targets</th><th data-sort="confidence" title="Highest evidence rung reached (1–3)">Conf.</th></tr></thead>`,
    `<tbody>${rows}</tbody></table></div></section>`,
  ].join("\n");
}

function diffView(data) {
  const files = data.files ?? [];
  const byResult = data.summary?.byResult ?? files.reduce((acc, f) => ({ ...acc, [f.result]: (acc[f.result] ?? 0) + 1 }), {});
  const resultChip = (result) => result === "needs human" ? statusChip("serious", result)
    : result === "skipped" ? statusChip("neutral", result) : result === "applied by hand" ? statusChip("warning", result) : statusChip("good", result);
  const rows = files.map((f, n) => `<tr class="row" id="r${n}" data-result="${esc(f.result)}" data-search="${esc([f.file, f.result, f.cause, f.evidence].join(" ").toLowerCase())}">` +
    `<td class="name mono">${esc(f.file)}</td><td>${resultChip(f.result)}</td><td>${inline(f.cause)}</td><td>${inline(f.evidence)}</td></tr>`).join("");
  const hand = (data.handApplied ?? []).map((h) =>
    `<li><strong class="mono">${esc(h.file)}</strong><p>${inline(h.change)}</p>${h.why ? `<p class="muted">Why it matches the template: ${inline(h.why)}</p>` : ""}</li>`).join("");
  const results = RESULTS.filter((r) => byResult[r]).map((r) => [r, r]);
  return [
    tiles([
      ["files", "Files in the diff", data.summary?.files ?? files.length],
      ["clean", "Applied clean", byResult["applied clean"] ?? 0, "good"],
      ["hand", "Applied by hand", byResult["applied by hand"] ?? 0, "warning"],
      ["skipped", "Skipped", byResult.skipped ?? 0],
      ["needs-human", "Need a human", byResult["needs human"] ?? 0, "serious"],
    ]),
    `<div class="grid">`,
    bars("Results", "result", RESULTS, byResult, files.length),
    data.openQuestions?.length ? `<section class="card"><h2 class="card-title">Open questions</h2>${list(data.openQuestions)}</section>` : "",
    `</div>`,
    hand ? `<section class="card"><h2 class="card-title">Applied by hand</h2><ul class="hand">${hand}</ul></section>` : "",
    `<section class="card" id="files"><h2 class="card-title">Files</h2>`,
    filters([["result", "Result", results]], "Search files"),
    `<div class="table-wrap"><table class="data"><thead><tr><th data-sort="name">File</th><th data-sort="result">Result</th><th>Cause</th><th>Evidence</th></tr></thead>`,
    `<tbody>${rows}</tbody></table></div></section>`,
    data.nextSteps?.length ? `<section class="card"><h2 class="card-title">Next steps (out of scope)</h2>${list(data.nextSteps)}</section>` : "",
  ].join("\n");
}

export function renderPage(md, { source = "report.md" } = {}) {
  const { html: reportHtml, headings } = markdownToHtml(md);
  const { data, error } = extractData(md);
  const kind = data?.libraries ? "audit" : data?.files ? "diff" : null;
  const title = headings.find((h) => h.level === 1)?.text.replace(/`/g, "") ?? source;
  const rn = data?.rn ?? {};
  const kindLabel = kind === "audit" ? "Library audit" : kind === "diff" ? "Upgrade Helper diff" : "Report";
  const meta = [
    kindLabel,
    rn.from || rn.to ? `React Native ${esc(rn.from ?? "?")} → ${esc(rn.to ?? "?")}` : "",
    data?.diffUrl && safeUrl(data.diffUrl) ? `<a href="${esc(data.diffUrl)}">diff</a>` : "",
    `from <span class="mono">${esc(source)}</span>`,
  ].filter(Boolean).join(" · ");
  const notice = kind ? "" : `<div class="notice" role="note">No data block in this report${error && !error.startsWith("no ") ? ` (${esc(error)})` : ""}, so there is no dashboard: the full report is below.</div>`;
  const dashboard = kind === "audit" ? auditView(data, headings) : kind === "diff" ? diffView(data) : "";
  const nav = [kind ? `<a href="#overview">Overview</a>` : "", kind === "audit" ? `<a href="#libraries">Libraries</a>` : kind === "diff" ? `<a href="#files">Files</a>` : "", `<a href="#full-report">Full report</a>`].filter(Boolean).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"><p class="kicker">${meta}</p><h1>${inline(title)}</h1><nav>${nav}</nav></div></header>
<main class="wrap">
${notice}
${kind ? `<section id="overview" aria-label="Overview">${dashboard}</section>` : ""}
<section id="full-report" class="card report"><h2 class="card-title">Full report</h2>${reportHtml}</section>
<footer class="muted">Rendered by render-html.mjs from the Markdown report. Nothing on this page is loaded from the network.</footer>
</main>
<div class="tip" id="tip" role="tooltip" hidden></div>
<script>${JS}</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------------------------
// Styles and behaviour (inline: the page must open offline)

const CSS = `
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--muted:#6f6e69;--grid:#e1e0d9;--axis:#c3c2b7;
--border:rgba(11,11,11,.10);--accent:#2a78d6;--accent-soft:#cde2fb;--good:#0ca30c;--warning:#fab219;--serious:#ec835a;--critical:#d03b3b;--neutral:#898781;
--code:#f0efec;--shadow:0 1px 2px rgba(11,11,11,.06)}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink-2:#c3c2b7;--muted:#9a998f;
--grid:#2c2c2a;--axis:#383835;--border:rgba(255,255,255,.10);--accent:#3987e5;--accent-soft:#184f95;--code:#262624;--shadow:none}}
:root[data-theme="dark"]{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--ink:#fff;--ink-2:#c3c2b7;--muted:#9a998f;--grid:#2c2c2a;--axis:#383835;
--border:rgba(255,255,255,.10);--accent:#3987e5;--accent-soft:#184f95;--code:#262624;--shadow:none}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
a{color:var(--accent);text-underline-offset:2px}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
.top{background:var(--surface);border-bottom:1px solid var(--border);padding:28px 0 0;margin-bottom:24px}
.kicker{margin:0 0 6px;color:var(--ink-2);font-size:13px}
.top h1{margin:0 0 16px;font-size:clamp(22px,3.2vw,32px);line-height:1.2;letter-spacing:-.01em}
.top nav{display:flex;gap:4px;overflow-x:auto}
.top nav a{padding:8px 12px;border-bottom:2px solid transparent;color:var(--ink-2);text-decoration:none;font-weight:500;white-space:nowrap}
.top nav a:hover{color:var(--ink);border-bottom-color:var(--axis)}
.mono,code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em}
.muted{color:var(--muted)}
.notice{border:1px solid var(--border);border-left:4px solid var(--warning);background:var(--surface);padding:12px 16px;border-radius:8px;margin-bottom:16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:var(--shadow);position:relative;overflow:hidden}
.tile::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:var(--axis)}
.tile-good::before{background:var(--good)}.tile-warning::before{background:var(--warning)}.tile-serious::before{background:var(--serious)}.tile-critical::before{background:var(--critical)}
.tile-value{font-size:32px;font-weight:650;line-height:1.1}
.tile-label{color:var(--ink-2);font-size:13px;margin-top:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:var(--shadow);min-width:0}
.card-title{margin:0 0 14px;font-size:16px;font-weight:650}
.bars{display:grid;gap:6px}
.bar{display:grid;grid-template-columns:minmax(96px,128px) 1fr 36px;align-items:center;gap:10px;width:100%;padding:6px 8px;margin:0 -8px;border:0;background:none;
color:inherit;font:inherit;text-align:left;border-radius:8px;cursor:pointer}
.bar:hover,.bar:focus-visible{background:var(--code)}
.bar[aria-pressed="true"]{background:var(--code);box-shadow:inset 0 0 0 1px var(--axis)}
.bar-label{color:var(--ink-2);font-size:13px}
.bar-track{height:12px;border-radius:0 4px 4px 0;background:linear-gradient(var(--grid),var(--grid)) left/1px 100% no-repeat}
.bar-fill{display:block;height:100%;min-width:3px;background:var(--accent);border-radius:0 4px 4px 0}
.bar-value{font-variant-numeric:tabular-nums;text-align:right;font-weight:600}
.blockers,.constraints,.hand{margin:0;padding-left:18px}
.blockers li,.constraints li{margin-bottom:8px}
.hand li{margin-bottom:12px}.hand p{margin:4px 0}
.pill{display:inline-block;padding:1px 8px;border:1px solid var(--border);border-radius:999px;font-size:12px;white-space:nowrap;color:var(--ink-2);background:var(--page)}
.status{display:inline-flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap}
.status .dot{width:9px;height:9px;border-radius:50%;background:var(--neutral);flex:none}
.status-good .dot{background:var(--good)}.status-warning .dot{background:var(--warning)}.status-serious .dot{background:var(--serious)}
.status-critical .dot{background:var(--critical);border-radius:2px;transform:rotate(45deg)}
.filters{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-bottom:12px}
.filters input{flex:1 1 220px;min-width:0;padding:8px 12px;border:1px solid var(--axis);border-radius:8px;background:var(--page);color:var(--ink);font:inherit}
.chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.chips-label{font-size:12px;color:var(--muted);margin-right:2px}
.chip{padding:4px 10px;border:1px solid var(--axis);border-radius:999px;background:var(--surface);color:var(--ink-2);font:inherit;font-size:13px;cursor:pointer}
.chip[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.shown{font-size:13px;color:var(--muted);margin-left:auto}
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--border);border-radius:8px;margin:8px 0 16px}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{padding:8px 10px;border-bottom:1px solid var(--grid);text-align:left;vertical-align:top}
thead th{position:sticky;top:0;background:var(--surface);font-size:12px;font-weight:600;color:var(--ink-2);white-space:nowrap}
th[data-sort]{cursor:pointer}th[data-sort]::after{content:" ↕";color:var(--muted)}
tbody tr:last-child td{border-bottom:0}
table.data{min-width:900px}table.data .name{font-weight:600;white-space:nowrap}table.data .rec{min-width:180px}
table.data .num{text-align:right;font-variant-numeric:tabular-nums}
tr.row:hover td{background:var(--page)}
tr.detail td{background:var(--page);font-size:14px}
tr.detail p{margin:4px 0}tr.detail ul{margin:4px 0 8px;padding-left:18px}
ul.compact{columns:2;column-gap:24px}
.expand{border:0;background:none;color:var(--ink-2);cursor:pointer;font-size:14px;padding:2px 4px;transition:transform .15s}
.expand[aria-expanded="true"]{transform:rotate(90deg)}
.report{overflow-wrap:break-word}.report td,.report th{min-width:110px}.report td:last-child{min-width:260px}
.report h1{font-size:22px;margin:8px 0 12px}.report h2{font-size:19px;margin:28px 0 10px;padding-top:12px;border-top:1px solid var(--grid)}
.report h3{font-size:16px;margin:22px 0 8px}.report h4{font-size:15px}
.report h1,.report h2,.report h3,.report h4{scroll-margin-top:16px}
.report blockquote{margin:12px 0;padding:4px 16px;border-left:4px solid var(--accent);background:var(--page);border-radius:0 8px 8px 0}
.report :target{background:var(--accent-soft);border-radius:4px}
code{background:var(--code);padding:1px 5px;border-radius:4px}
pre{background:var(--code);padding:12px;border-radius:8px;overflow-x:auto}pre code{padding:0;background:none}
.code-fold summary{cursor:pointer;color:var(--ink-2);padding:6px 0}
footer{padding:16px 0 40px;font-size:13px}
.tip{position:fixed;z-index:10;pointer-events:none;background:var(--ink);color:var(--surface);font-size:12px;padding:6px 8px;border-radius:6px;max-width:260px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:640px){.tile-value{font-size:26px}.card{padding:16px}ul.compact{columns:1}.shown{margin-left:0;width:100%}}
@media (forced-colors:active){.bar-fill,.status .dot,.tile::before{forced-color-adjust:none;background:CanvasText}}
@media print{.filters,.expand,.top nav{display:none}tr.detail{display:table-row!important}}
`;

const JS = `"use strict";
(() => {
  const rows = [...document.querySelectorAll("tr.row")];
  if (!rows.length) return;
  const tbody = rows[0].parentNode;
  const detailOf = (row) => document.getElementById(row.id + "-d");
  const state = { q: "", facet: {} };
  const shown = document.getElementById("shown");
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
    if (shown) shown.textContent = n === rows.length ? rows.length + " shown" : n + " of " + rows.length + " shown";
    for (const c of document.querySelectorAll(".chip")) c.setAttribute("aria-pressed", String((state.facet[c.dataset.facet] ?? "") === c.dataset.value));
    for (const b of document.querySelectorAll(".bar")) b.setAttribute("aria-pressed", String(state.facet[b.dataset.filterFacet] === b.dataset.filterValue));
  };
  document.getElementById("q")?.addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); apply(); });
  for (const c of document.querySelectorAll(".chip")) c.addEventListener("click", () => { state.facet[c.dataset.facet] = c.dataset.value; apply(); });
  for (const b of document.querySelectorAll(".bar")) b.addEventListener("click", () => {
    const f = b.dataset.filterFacet, v = b.dataset.filterValue;
    state.facet[f] = state.facet[f] === v ? "" : v;
    apply();
    document.getElementById(rows[0].closest("section").id)?.scrollIntoView({ block: "start" });
  });
  for (const btn of document.querySelectorAll(".expand")) btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    document.getElementById(btn.getAttribute("aria-controls")).hidden = !open;
  });
  const rank = { required: 0, recommended: 1, "": 2 };
  for (const th of document.querySelectorAll("th[data-sort]")) {
    let dir = 1;
    th.addEventListener("click", () => {
      const col = th.cellIndex, key = th.dataset.sort;
      const value = (row) => key === "need" ? rank[row.dataset.need] ?? 3 : key === "confidence" ? Number(row.cells[col].textContent) || 0
        : (row.dataset[key] ?? row.cells[col].textContent).toLowerCase();
      rows.sort((a, b) => (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) * dir);
      for (const row of rows) { tbody.appendChild(row); const d = detailOf(row); if (d) tbody.appendChild(d); }
      dir = -dir;
    });
  }
  const tip = document.getElementById("tip");
  for (const el of document.querySelectorAll("[data-tip]")) {
    el.addEventListener("pointermove", (e) => {
      tip.textContent = el.dataset.tip; tip.hidden = false;
      const x = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + "px"; tip.style.top = (e.clientY + 14) + "px";
    });
    el.addEventListener("pointerleave", () => { tip.hidden = true; });
  }
  apply();
})();`;

// ---------------------------------------------------------------------------------------------
// CLI

function main(argv) {
  const input = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out");
  const outIndex = argv.indexOf("--out");
  if (!input) {
    process.stderr.write("usage: node render-html.mjs <report.md> [--out <page.html>]\n");
    process.exit(1);
  }
  let md;
  try {
    md = readFileSync(input, "utf8");
  } catch (e) {
    process.stderr.write(`render-html: cannot read ${input} (${e.message})\n`);
    process.exit(1);
  }
  const out = resolve(outIndex >= 0 ? argv[outIndex + 1] : input.replace(/\.(md|markdown)$/i, "") + ".html");
  const { error } = extractData(md);
  if (error) process.stderr.write(`render-html: warning: ${error}; the page has the full report only\n`);
  writeFileSync(out, renderPage(md, { source: input.split(/[\\/]/).pop() }));
  process.stdout.write(out + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
