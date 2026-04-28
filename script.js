import { PARTS, CASES } from "./data.js";

const $ = (sel, root = document) => root.querySelector(sel);
const fmt = (n) => `$${n.toLocaleString()}`;
const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

// --- state ---
const state = {
  // index of the chosen alternative for each part id
  partChoice: Object.fromEntries(PARTS.map((p) => [p.id, 0])),
  selectedCaseId: "nr200p",
  expanded: null, // currently-expanded part id (alternatives panel)
  caseFilter: "",
};

// permalink: #caseId
const initialHash = location.hash.replace("#", "");
if (CASES.find((c) => c.id === initialHash)) state.selectedCaseId = initialHash;

const chosenPart = (p) => p.options[state.partChoice[p.id] || 0];
const selectedCase = () => CASES.find((c) => c.id === state.selectedCaseId);

// --- parts table ---
function renderParts() {
  const tbl = $("#parts-table");
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Role</th>
        <th>Selected</th>
        <th class="price">Price</th>
        <th class="actions"></th>
      </tr>
    </thead>
    <tbody id="parts-tbody"></tbody>
  `;
  const tbody = $("#parts-tbody");
  tbody.innerHTML = PARTS.map((p) => partRowsHTML(p)).join("");

  tbody.querySelectorAll("button.toggle-alts").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePart(btn.dataset.part);
    }),
  );
  tbody.querySelectorAll("button.pick").forEach((btn) =>
    btn.addEventListener("click", () => {
      const partId = btn.dataset.part;
      const idx = Number(btn.dataset.idx);
      state.partChoice[partId] = idx;
      renderParts();
      renderCases();
      renderTotal();
      renderShoppingList();
    }),
  );
}

function partRowsHTML(p) {
  const opt = chosenPart(p);
  const expanded = state.expanded === p.id;
  const noteHTML = opt.note ? `<div class="note">${escape(opt.note)}</div>` : "";

  let rows = `
    <tr>
      <td class="role">${escape(p.role)}</td>
      <td>
        <div class="name">${escape(opt.name)}</div>
        <div class="specs">${escape(opt.specs)}</div>
        ${noteHTML}
      </td>
      <td class="price">${fmt(opt.price)}</td>
      <td class="actions">
        <button class="linkish toggle-alts ${expanded ? "active" : ""}" data-part="${p.id}">
          ${expanded ? "hide" : `${p.options.length - 1} alternative${p.options.length - 1 === 1 ? "" : "s"}`}
        </button>
      </td>
    </tr>
  `;

  if (expanded) {
    rows += `
      <tr class="alts"><td colspan="4">
        <table>
          ${p.options.map((o, i) => `
            <tr class="${i === (state.partChoice[p.id] || 0) ? "current" : ""}">
              <td>
                <div class="name">${escape(o.name)}</div>
                <div class="specs">${escape(o.specs)}${o.note ? " — " + escape(o.note) : ""}</div>
              </td>
              <td class="price" style="text-align:right; font-variant-numeric:tabular-nums;">${fmt(o.price)}</td>
              <td style="text-align:right;">
                ${o.link ? `<a href="${escape(o.link)}" target="_blank" rel="noopener">official ↗</a>` : ""}
              </td>
              <td style="text-align:right;">
                <button class="pick" data-part="${p.id}" data-idx="${i}">
                  ${i === (state.partChoice[p.id] || 0) ? "selected" : "pick"}
                </button>
              </td>
            </tr>
          `).join("")}
        </table>
      </td></tr>
    `;
  }
  return rows;
}

function togglePart(id) {
  state.expanded = state.expanded === id ? null : id;
  renderParts();
}

// --- cases table ---
function renderCases() {
  const tbl = $("#cases-table");
  const cooler = chosenPart(PARTS.find((p) => p.id === "cooler"));
  const coolerH = cooler.height;

  const filter = state.caseFilter.trim().toLowerCase();
  const cases = CASES.filter((c) =>
    !filter || [c.name, c.materials, c.vibe].some((s) => s.toLowerCase().includes(filter))
  );

  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Case</th>
        <th class="vibe-col">Notes</th>
        <th class="vol">Volume</th>
        <th class="gpu">GPU max</th>
        <th class="cooler">Cooler max</th>
        <th class="fit">Fit</th>
        <th class="price">Price</th>
      </tr>
    </thead>
    <tbody id="cases-tbody"></tbody>
  `;

  const tbody = $("#cases-tbody");
  tbody.innerHTML = cases.map((c) => {
    const fits = coolerH <= c.coolerMax;
    const sel = c.id === state.selectedCaseId;
    return `
      <tr class="selectable ${sel ? "selected" : ""}" data-case="${c.id}">
        <td>
          <div class="name">${escape(c.name)}</div>
          ${c.link ? `<a href="${escape(c.link)}" target="_blank" rel="noopener" style="font-size:12px;">official ↗</a>` : ""}
        </td>
        <td class="vibe">${escape(c.vibe)}<br><span class="muted">${escape(c.materials)} · ${escape(c.psu)} · ${escape(c.radMax)}</span></td>
        <td class="vol">${c.volume} L</td>
        <td class="gpu">${c.gpuMax} mm</td>
        <td class="cooler">${c.coolerMax} mm</td>
        <td class="fit"><span class="fit-pill ${fits ? "ok" : "bad"}">${fits ? "fits ✓" : "too tall"}</span></td>
        <td class="price">${fmt(c.price)}</td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("tr.selectable").forEach((row) =>
    row.addEventListener("click", () => selectCase(row.dataset.case)),
  );
}

function selectCase(id) {
  state.selectedCaseId = id;
  history.replaceState(null, "", `#${id}`);
  renderCases();
  renderTotal();
  renderShoppingList();
}

// --- total ---
function renderTotal() {
  const c = selectedCase();
  const cooler = chosenPart(PARTS.find((p) => p.id === "cooler"));
  const coolerFits = cooler.height <= c.coolerMax;

  const lines = [];
  let total = 0;

  for (const p of PARTS) {
    const opt = chosenPart(p);
    const flag = (p.id === "cooler" && !coolerFits)
      ? ` <span class="fit-pill bad" style="margin-left:8px;">won't fit ${c.name}</span>`
      : "";
    lines.push(`
      <tr>
        <td class="role">${escape(p.role)}</td>
        <td>${escape(opt.name)}${flag}</td>
        <td class="price">${fmt(opt.price)}</td>
      </tr>
    `);
    total += opt.price;
  }
  lines.push(`
    <tr>
      <td class="role">Case</td>
      <td>${escape(c.name)}</td>
      <td class="price">${fmt(c.price)}</td>
    </tr>
  `);
  total += c.price;

  lines.push(`
    <tr class="total-row">
      <td></td>
      <td>Total (no GPU)</td>
      <td class="price">${fmt(total)}</td>
    </tr>
  `);

  $("#total-table").innerHTML = `<tbody>${lines.join("")}</tbody>`;
}

// --- shopping list ---
function renderShoppingList() {
  const c = selectedCase();
  const cooler = chosenPart(PARTS.find((p) => p.id === "cooler"));
  const coolerFits = cooler.height <= c.coolerMax;
  let total = 0;
  const lines = [`# Mini-ITX build for Luccas — ${c.name}`, ""];

  for (const p of PARTS) {
    const opt = chosenPart(p);
    const warn = (p.id === "cooler" && !coolerFits) ? "  (!! exceeds case clearance)" : "";
    lines.push(`${p.role.padEnd(16)}  ${opt.name}  ~$${opt.price}${warn}`);
    total += opt.price;
  }
  lines.push(`${"Case".padEnd(16)}  ${c.name}  ~$${c.price}`);
  total += c.price;
  lines.push("", `Total (no GPU): ~$${total}`, `GPU: RTX 3070 (already owned)`);
  $("#shop-text").textContent = lines.join("\n");
}

// --- copy button ---
$("#shop-copy").addEventListener("click", async () => {
  const btn = $("#shop-copy");
  try {
    await navigator.clipboard.writeText($("#shop-text").textContent);
    btn.textContent = "Copied ✓";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy to clipboard";
      btn.classList.remove("copied");
    }, 1600);
  } catch {
    const range = document.createRange();
    range.selectNode($("#shop-text"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
});

// --- case search ---
$("#case-search").addEventListener("input", (e) => {
  state.caseFilter = e.target.value;
  renderCases();
});

// --- init ---
renderParts();
renderCases();
renderTotal();
renderShoppingList();
