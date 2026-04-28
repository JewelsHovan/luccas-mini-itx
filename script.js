import { PARTS, CASES, COOLER_ALTERNATIVES } from "./data.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const fmt = (n) => `$${n.toLocaleString()}`;

// ---------- state ----------
const state = {
  selectedCaseId: "nr200p",
  heroView: "build", // "build" | "bare"
};

// support permalinks like #nr200p / ?case=terra
const initialHash = location.hash.replace("#", "");
if (CASES.find((c) => c.id === initialHash)) state.selectedCaseId = initialHash;

// ---------- render: parts grid ----------
function renderParts() {
  const grid = $("#parts-grid");
  grid.innerHTML = PARTS.map(
    (p) => `
    <article class="part-card">
      <div class="img-wrap"><img src="${p.img}" alt="${p.name}" loading="lazy" /></div>
      <span class="part-role">${p.role}</span>
      <h3 class="part-name">${p.name}</h3>
      <p class="part-blurb">${p.blurb}</p>
      <div class="spec-chips">
        ${p.specs.map((s) => `<span class="chip">${s}</span>`).join("")}
      </div>
      <div class="part-foot">
        <span class="part-price">${fmt(p.price)}</span>
        <a class="part-link" href="${p.link}" target="_blank" rel="noopener">official page ↗</a>
      </div>
    </article>
  `,
  ).join("");
}

// ---------- render: builds gallery ----------
function renderBuilds() {
  const grid = $("#builds-grid");
  grid.innerHTML = CASES.map(
    (c) => `
    <article class="build-card ${c.id === state.selectedCaseId ? "selected" : ""}"
             style="--build-color:${c.color}"
             data-case="${c.id}">
      <span class="badge">${c.id === state.selectedCaseId ? "Selected ✓" : "Click to select"}</span>
      <img src="${c.buildImg}" alt="Render of build inside ${c.name}" loading="lazy" />
      <div class="label">${c.name}<small>${c.volume} L · ${fmt(c.price)}</small></div>
    </article>
  `,
  ).join("");
  $$(".build-card").forEach((card) =>
    card.addEventListener("click", () => selectCase(card.dataset.case)),
  );
}

// ---------- render: case grid ----------
function renderCases() {
  const grid = $("#case-grid");
  grid.innerHTML = CASES.map(
    (c) => `
    <article class="case-card ${c.id === state.selectedCaseId ? "selected" : ""}"
             style="--case-color:${c.color}"
             data-case="${c.id}">
      <div class="case-img-wrap">
        <span class="case-volume">${c.volume} L</span>
        <span class="case-fit ${c.fitsPA120 ? "ok" : "bad"}">
          ${c.fitsPA120 ? "PA120 ✓" : "PA120 ✗"}
        </span>
        <img src="${c.img}" alt="${c.name}" loading="lazy" />
      </div>
      <div class="case-meta">
        <span class="case-name">${c.name}</span>
        <span class="case-price">${fmt(c.price)}</span>
      </div>
      <p class="case-vibe">${c.vibe}</p>
      <div class="case-specs">
        <div><span>GPU max</span><span>${c.gpuMax} mm</span></div>
        <div><span>Cooler max</span><span>${c.coolerMax} mm</span></div>
        <div><span>Radiator</span><span>${c.radMax}</span></div>
        <div><span>PSU</span><span>${c.psu}</span></div>
      </div>
      <div class="case-note">${c.note}</div>
      <button class="case-select-btn">
        ${c.id === state.selectedCaseId ? "Selected ✓" : "Use this case"}
      </button>
    </article>
  `,
  ).join("");

  $$(".case-card").forEach((card) =>
    card.addEventListener("click", () => selectCase(card.dataset.case)),
  );
}

function selectCase(id) {
  state.selectedCaseId = id;
  $$(".case-card").forEach((c) => c.classList.toggle("selected", c.dataset.case === id));
  $$(".case-select-btn").forEach((btn) => {
    const card = btn.closest(".case-card");
    btn.textContent = card.classList.contains("selected") ? "Selected ✓" : "Use this case";
  });
  $$(".build-card").forEach((c) => {
    const isSel = c.dataset.case === id;
    c.classList.toggle("selected", isSel);
    const badge = c.querySelector(".badge");
    if (badge) badge.textContent = isSel ? "Selected ✓" : "Click to select";
  });
  updateHero();
  renderTotal();
  renderShoppingList();
}

function updateHero() {
  const c = CASES.find((c) => c.id === state.selectedCaseId);
  const img = $("#hero-case-img");
  const tag = $("#hero-case-tag");
  const wantBuild = state.heroView === "build";
  const src = wantBuild ? c.buildImg || c.img : c.img;
  img.style.opacity = "0";
  img.style.transform = "translateY(8px) scale(0.96)";
  setTimeout(() => {
    img.src = src;
    img.alt = c.name;
    tag.textContent = c.name;
    img.style.opacity = "1";
    img.style.transform = "translateY(0) scale(1)";
    // bare case shots are usually transparent / contained — drop the cover behavior
    img.style.objectFit = wantBuild ? "cover" : "contain";
    img.style.background = wantBuild ? "" : "transparent";
  }, 180);
  document.documentElement.style.setProperty("--accent", c.color);
  history.replaceState(null, "", `#${c.id}`);
}

// ---------- render: compare ----------
function renderCompareSelects() {
  const a = $("#compare-a");
  const b = $("#compare-b");
  for (const sel of [a, b]) {
    sel.innerHTML = CASES.map(
      (c) => `<option value="${c.id}">${c.name}</option>`,
    ).join("");
  }
  a.value = "nr200p";
  b.value = "terra";
  a.addEventListener("change", renderCompare);
  b.addEventListener("change", renderCompare);
  renderCompare();
}

function compareCard(c, otherFor = {}) {
  // mark winner cells (higher = better for gpuMax/coolerMax/volume; lower = better for price)
  const cell = (label, value, key, higherBetter) => {
    const other = otherFor[key];
    let cls = "";
    if (other != null && value !== other) {
      const better =
        (higherBetter && value > other) || (!higherBetter && value < other);
      if (better) cls = "win";
    }
    return `<div class="row"><span>${label}</span><span class="${cls}">${value}</span></div>`;
  };
  return `
    <div class="img"><img src="${c.img}" alt="${c.name}" /></div>
    <h3>${c.name}</h3>
    ${cell("Price", fmt(c.price), "price", false)}
    ${cell("Volume", `${c.volume} L`, "volume", false)}
    ${cell("GPU max", `${c.gpuMax} mm`, "gpuMax", true)}
    ${cell("Cooler max", `${c.coolerMax} mm`, "coolerMax", true)}
    <div class="row"><span>Radiator</span><span>${c.radMax}</span></div>
    <div class="row"><span>PSU</span><span>${c.psu}</span></div>
    <div class="row"><span>Materials</span><span>${c.materials}</span></div>
  `;
}

function renderCompare() {
  const a = CASES.find((c) => c.id === $("#compare-a").value);
  const b = CASES.find((c) => c.id === $("#compare-b").value);
  $("#compare-a-card").innerHTML = compareCard(a, b);
  $("#compare-b-card").innerHTML = compareCard(b, a);
}

// ---------- render: total ----------
function renderTotal() {
  const c = CASES.find((c) => c.id === state.selectedCaseId);

  // include all parts; if cooler doesn't fit, swap to a recommended alt and surface it
  const items = [];
  let total = 0;

  for (const p of PARTS) {
    if (p.id === "cooler" && !c.fitsPA120) {
      // pick a sensible alt based on case clearance
      const alt =
        c.coolerMax >= 77
          ? COOLER_ALTERNATIVES.air_lowprofile
          : COOLER_ALTERNATIVES.aio_240;
      items.push({
        name: alt.name,
        role: "CPU Cooler (swap — PA120 doesn't fit)",
        price: alt.price,
        sub: `Recommended over the PA120 SE (${PARTS.find((x) => x.id === "cooler").specs[0]}) which exceeds the case's ${c.coolerMax} mm clearance.`,
        swap: true,
      });
      total += alt.price;
    } else {
      items.push({ name: p.name, role: p.role, price: p.price });
      total += p.price;
    }
  }
  items.push({ name: c.name, role: "Case", price: c.price });
  total += c.price;

  $("#total-list").innerHTML = items
    .map(
      (it) => `
      <li>
        <span><b>${it.role}</b><br><small>${it.name}</small></span>
        <span class="muted">${it.swap ? "swap" : ""}</span>
        <b>${fmt(it.price)}</b>
        ${it.sub ? `<span class="swap-note" style="grid-column:1/-1"><b>Heads up — ${it.role.toLowerCase()}.</b> ${it.sub}</span>` : ""}
      </li>
    `,
    )
    .join("");

  $("#total-amount").textContent = fmt(total);
  $("#total-case-name").textContent = c.name;
  $("#hero-total").textContent = fmt(total);
}

// ---------- init ----------
renderParts();
renderCases();
renderBuilds();
renderCompareSelects();
updateHero();
renderTotal();
renderShoppingList();

// ---------- shopping list ----------
function renderShoppingList() {
  const c = CASES.find((c) => c.id === state.selectedCaseId);
  let total = 0;
  const lines = [];
  lines.push(`# Mini-ITX build for Luccas — ${c.name}`);
  lines.push("");
  for (const p of PARTS) {
    let row;
    if (p.id === "cooler" && !c.fitsPA120) {
      const alt =
        c.coolerMax >= 77 ? COOLER_ALTERNATIVES.air_lowprofile : COOLER_ALTERNATIVES.aio_240;
      row = `${p.role.padEnd(20)}  ${alt.name}  ~$${alt.price}  (PA120 doesn't fit)`;
      total += alt.price;
    } else {
      row = `${p.role.padEnd(20)}  ${p.name}  ~$${p.price}`;
      total += p.price;
    }
    lines.push(row);
  }
  lines.push(`${"Case".padEnd(20)}  ${c.name}  ~$${c.price}`);
  lines.push("");
  lines.push(`Total (no GPU): ~$${total}`);
  lines.push(`GPU: RTX 3070 (already owned)`);
  $("#shop-text").textContent = lines.join("\n");
}

$("#shop-copy").addEventListener("click", async () => {
  const btn = $("#shop-copy");
  try {
    await navigator.clipboard.writeText($("#shop-text").textContent);
    btn.textContent = "Copied ✓";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy to clipboard";
      btn.classList.remove("copied");
    }, 1800);
  } catch {
    // fallback: select the text
    const range = document.createRange();
    range.selectNode($("#shop-text"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
});

// hero view toggle
$$(".hero-toggle button").forEach((btn) =>
  btn.addEventListener("click", () => {
    state.heroView = btn.dataset.view;
    $$(".hero-toggle button").forEach((b) =>
      b.classList.toggle("active", b === btn),
    );
    updateHero();
  }),
);

// gentle parallax on the orbit
const orbit = document.querySelector(".orbit");
window.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 14;
  const y = (e.clientY / window.innerHeight - 0.5) * 14;
  orbit.style.transform = `translate(${x}px, ${y}px)`;
});
