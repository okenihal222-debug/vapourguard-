/* =========================================================
   VaporGuard prototype site — vanilla JS, zero build step
   All figures below are either (a) sourced/verified, marked VERIFIED,
   or (b) engineering/business assumptions used for modeling, marked ASSUMPTION.
   See index.html Sources section for citations.
   ========================================================= */

// ---------- Single source of truth: numbers used across the whole site ----------
const DATA = {
  // VERIFIED
  totalStations: 100000,          // India fuel retail outlets, crossed 1 lakh (Nov 2025)
  ruralSharePct: 29,               // rural share of stations, up from 22% a decade ago
  evapLossLowPct: 0.18,            // evaporative loss range low
  evapLossHighPct: 0.5,            // evaporative loss range high
  petrolPriceDelhi: 102.12,        // Rs/L, 18 Aug 2026
  dieselPriceDelhi: 95.20,         // Rs/L, 18 Aug 2026
  delhiVRSPumps: 3256,             // petrol pumps in Delhi with VRS installed
  vocReductionUrbanPct: 84,        // VOC emission reduction in major urban regions post-VRS

  // ASSUMPTIONS (engineering / business projections — clearly labelled in UI)
  assumedThroughputLPD: 6000,      // default assumed daily fuel throughput per station (litres/day)
  assumedLossPct: 0.30,            // mid-point evaporation loss assumption used as default
  assumedCaptureEff: 75,           // % of evaporative loss VaporGuard is assumed to capture
  hardwareCost: 200000,            // Rs, one-time — OUR business projection
  subscriptionMonthly: 2000,       // Rs/month — OUR business projection
};

const fmtINR = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtINRLakh = (n) => {
  if (n >= 10000000) return "₹" + (n/10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n/100000).toFixed(2) + " L";
  return fmtINR(n);
};

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initReveal();
  initCounters();
  initTabs();
  initCharts();
  initDashboardTicker();
  initROI();
  initContactForm();
  initModals();
  document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
});

/* ---------------- Nav ---------------- */
function initNav(){
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if(toggle && links){
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }
}

/* ---------------- Reveal on scroll ---------------- */
function initReveal(){
  const els = document.querySelectorAll(".reveal");
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

/* ---------------- Animated counters ---------------- */
function initCounters(){
  const counters = document.querySelectorAll("[data-counter]");
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.counter);
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      const dur = 1400;
      const start = performance.now();
      function tick(now){
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = prefix + val.toLocaleString("en-IN", {maximumFractionDigits:decimals, minimumFractionDigits:decimals}) + suffix;
        if(p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach(el => obs.observe(el));
}

/* ---------------- Tabs (Benefits section) ---------------- */
function initTabs(){
  const buttons = document.querySelectorAll("[data-tab-btn]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.tabGroup;
      document.querySelectorAll(`[data-tab-btn][data-tab-group="${group}"]`).forEach(b => b.classList.remove("active"));
      document.querySelectorAll(`[data-tab-panel][data-tab-group="${group}"]`).forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-tab-panel][data-tab-group="${group}"][data-tab-value="${btn.dataset.tabValue}"]`).classList.add("active");
    });
  });
}

/* ---------------- SVG chart helpers ---------------- */
function svgLineChart(containerId, series, opts={}){
  const el = document.getElementById(containerId);
  if(!el) return;
  const w = el.clientWidth || 560, h = opts.height || 220;
  const pad = { top: 18, right: 16, bottom: 28, left: 40 };
  const maxV = Math.max(...series.map(s => Math.max(...s.data))) * 1.15;
  const minV = 0;
  const n = series[0].data.length;
  const x = i => pad.left + (i * (w - pad.left - pad.right)) / (n - 1);
  const y = v => h - pad.bottom - ((v - minV) / (maxV - minV)) * (h - pad.top - pad.bottom);

  let gridLines = "";
  for(let g=0; g<=4; g++){
    const gy = pad.top + (g * (h - pad.top - pad.bottom)) / 4;
    gridLines += `<line x1="${pad.left}" y1="${gy}" x2="${w-pad.right}" y2="${gy}" stroke="#e6ebf0" stroke-width="1"/>`;
  }

  let paths = "";
  series.forEach(s => {
    const pts = s.data.map((v,i) => `${x(i)},${y(v)}`).join(" ");
    const areaPts = `${x(0)},${y(0)} ` + pts + ` ${x(n-1)},${y(0)}`;
    if(s.area){
      paths += `<polygon points="${areaPts}" fill="${s.color}" opacity="0.12"></polygon>`;
    }
    paths += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    s.data.forEach((v,i) => {
      paths += `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" fill="${s.color}"/>`;
    });
  });

  let labels = "";
  (opts.labels || []).forEach((lab, i) => {
    labels += `<text x="${x(i)}" y="${h-8}" font-size="10" fill="#8ea0b0" text-anchor="middle">${lab}</text>`;
  });

  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${gridLines}${paths}${labels}</svg>`;
}

function svgBarChart(containerId, data, opts={}){
  const el = document.getElementById(containerId);
  if(!el) return;
  const w = el.clientWidth || 560, h = opts.height || 220;
  const pad = { top: 18, right: 10, bottom: 28, left: 40 };
  const maxV = Math.max(...data.map(d => d.value)) * 1.2;
  const bw = (w - pad.left - pad.right) / data.length * 0.6;
  const gap = (w - pad.left - pad.right) / data.length;

  let gridLines = "";
  for(let g=0; g<=4; g++){
    const gy = pad.top + (g * (h - pad.top - pad.bottom)) / 4;
    gridLines += `<line x1="${pad.left}" y1="${gy}" x2="${w-pad.right}" y2="${gy}" stroke="#e6ebf0" stroke-width="1"/>`;
  }

  let bars = "";
  data.forEach((d,i) => {
    const bh = ((d.value) / maxV) * (h - pad.top - pad.bottom);
    const bx = pad.left + i*gap + (gap-bw)/2;
    const by = h - pad.bottom - bh;
    bars += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" fill="${opts.color || '#065A82'}"/>`;
    bars += `<text x="${bx + bw/2}" y="${h-8}" font-size="10" fill="#8ea0b0" text-anchor="middle">${d.label}</text>`;
  });

  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${gridLines}${bars}</svg>`;
}

function initCharts(){
  // Demo data — clearly labelled as prototype/demo data in the UI copy around these charts.
  svgLineChart("chart-efficiency", [
    { data: [58, 64, 69, 71, 74, 76, 75, 78, 80, 79, 82, 84], color: "#1C7293", area: true }
  ], { labels: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"] });

  svgBarChart("chart-savings", [
    { label:"Apr", value: 32000 }, { label:"May", value: 35500 }, { label:"Jun", value: 38200 },
    { label:"Jul", value: 41000 }, { label:"Aug", value: 39500 }, { label:"Sep", value: 43800 },
  ], { color: "#D98E04" });

  svgLineChart("chart-vapor", [
    { data: [22, 19, 15, 13, 11, 9, 8], color: "#1E7A46", area: true }
  ], { labels: ["Day1","Day2","Day3","Day4","Day5","Day6","Day7"], height: 180 });
}

/* ---------------- Dashboard live ticker (cosmetic demo) ---------------- */
function initDashboardTicker(){
  const els = document.querySelectorAll("[data-live]");
  if(!els.length) return;
  setInterval(() => {
    els.forEach(el => {
      const base = parseFloat(el.dataset.live);
      const jitterPct = parseFloat(el.dataset.jitter || "0.03");
      const jitter = (Math.random()*2 - 1) * jitterPct * base;
      const val = base + jitter;
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      el.textContent = val.toLocaleString("en-IN", {maximumFractionDigits:decimals, minimumFractionDigits:decimals}) + (el.dataset.unit || "");
    });
  }, 2200);
}

/* ---------------- ROI calculator ---------------- */
function initROI(){
  const throughput = document.getElementById("roi-throughput");
  const loss = document.getElementById("roi-loss");
  const price = document.getElementById("roi-price");
  const units = document.getElementById("roi-units");
  if(!throughput) return;

  const throughputVal = document.getElementById("roi-throughput-val");
  const lossVal = document.getElementById("roi-loss-val");
  const priceVal = document.getElementById("roi-price-val");
  const unitsVal = document.getElementById("roi-units-val");

  function compute(){
    const t = parseFloat(throughput.value);      // L/day
    const l = parseFloat(loss.value);             // %
    const p = parseFloat(price.value);            // Rs/L
    const u = parseInt(units.value);              // number of stations

    throughputVal.textContent = t.toLocaleString("en-IN") + " L/day";
    lossVal.textContent = l.toFixed(2) + "%";
    priceVal.textContent = "₹" + p;
    unitsVal.textContent = u;

    const lostPerDay = t * (l/100);                          // litres evaporated/day/station
    const capturedPerDay = lostPerDay * (DATA.assumedCaptureEff/100); // litres recovered/day/station
    const rupeesPerDayPerStation = capturedPerDay * p;
    const rupeesPerYearPerStation = rupeesPerDayPerStation * 365;

    const totalHardware = DATA.hardwareCost * u;
    const totalMonthlySub = DATA.subscriptionMonthly * u;
    const totalAnnualSavings = rupeesPerYearPerStation * u;
    const totalAnnualSubCost = totalMonthlySub * 12;
    const netAnnualBenefit = totalAnnualSavings - totalAnnualSubCost;

    const paybackMonths = totalHardware / Math.max((rupeesPerDayPerStation*u*30) - totalMonthlySub, 1);
    const roiPct = (netAnnualBenefit / totalHardware) * 100;

    setText("roi-fuel-recovered", capturedPerDay.toFixed(1) + " L/day/station");
    setText("roi-money-day", fmtINR(rupeesPerDayPerStation * u) + "/day");
    setText("roi-money-year", fmtINRLakh(totalAnnualSavings) + "/year");
    setText("roi-payback", isFinite(paybackMonths) ? paybackMonths.toFixed(1) + " months" : "—");
    setText("roi-roi", roiPct > 0 ? roiPct.toFixed(0) + "%" : "—");
    setText("roi-hardware-total", fmtINRLakh(totalHardware));
    setText("roi-vapor-avoided", (capturedPerDay*u).toFixed(0) + " L/day avoided across fleet");
  }

  function setText(id, val){ const e = document.getElementById(id); if(e) e.textContent = val; }

  [throughput, loss, price, units].forEach(inp => inp.addEventListener("input", compute));
  compute();
}

/* ---------------- Contact form (demo, no backend) ---------------- */
function initContactForm(){
  const form = document.getElementById("contact-form");
  if(!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("form-success").classList.add("show");
    form.reset();
  });
}


/* ---------------- Depth modals (click a card, see much more) ---------------- */
function initModals(){
  const triggers = document.querySelectorAll("[data-modal-target]");
  if(!triggers.length) return;

  function openModal(id){
    const m = document.getElementById(id);
    if(!m) return;
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(m){
    m.classList.remove("open");
    document.body.style.overflow = "";
  }

  triggers.forEach(card => {
    const id = card.dataset.modalTarget;
    card.addEventListener("click", () => openModal(id));
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        openModal(id);
      }
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if(e.target === overlay) closeModal(overlay); });
    overlay.querySelectorAll("[data-modal-close]").forEach(btn => {
      btn.addEventListener("click", () => closeModal(overlay));
    });
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      document.querySelectorAll(".modal-overlay.open").forEach(m => closeModal(m));
    }
  });
}
