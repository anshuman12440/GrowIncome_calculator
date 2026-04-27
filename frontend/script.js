const API = window.API_BASE_URL || "http://localhost:3000";

const form = document.getElementById("stock-form");
const tbody = document.getElementById("stock-tbody");
const emptyState = document.getElementById("empty-state");
const clearAllBtn = document.getElementById("clear-all");
const formError = document.getElementById("form-error");
const apiStatus = document.getElementById("api-status");

const totalInvestedEl = document.getElementById("total-invested");
const totalReturnedEl = document.getElementById("total-returned");
const totalChargesEl = document.getElementById("total-charges");
const grossPlEl = document.getElementById("gross-pl");
const netPlEl = document.getElementById("net-pl");
const overallReturnEl = document.getElementById("overall-return");

const TRADE_LABELS = {
  delivery: "Delivery",
  intraday: "Intraday",
  options: "Options"
};

const INR = (n) =>
  "₹ " +
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function setApiStatus(online) {
  apiStatus.textContent = online ? "online" : "offline (start the backend)";
  apiStatus.className = online ? "online" : "offline";
}

async function fetchStocks() {
  try {
    const res = await fetch(`${API}/api/stocks`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setApiStatus(true);
    render(data);
  } catch (err) {
    console.error("Failed to load stocks:", err);
    setApiStatus(false);
    formError.textContent = "Cannot reach backend. Is it running on " + API + "?";
  }
}

function chargesTooltip(c) {
  return [
    `Brokerage: ${INR(c.brokerage)}`,
    `STT: ${INR(c.stt)}`,
    `Exchange: ${INR(c.exchange)}`,
    `SEBI: ${INR(c.sebi)}`,
    `Stamp Duty: ${INR(c.stampDuty)}`,
    `GST: ${INR(c.gst)}`,
    `——————————`,
    `Total: ${INR(c.total)}`
  ].join("\n");
}

function render({ stocks, summary }) {
  tbody.innerHTML = "";

  if (!stocks.length) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    stocks.forEach((s, idx) => {
      const tr = document.createElement("tr");
      const grossClass = s.profitLoss >= 0 ? "profit" : "loss";
      const grossSign = s.profitLoss >= 0 ? "+" : "";
      const netClass = s.charges.netPL >= 0 ? "profit" : "loss";
      const netSign = s.charges.netPL >= 0 ? "+" : "";

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td><span class="trade-badge trade-${s.tradeType}">${TRADE_LABELS[s.tradeType] || s.tradeType}</span></td>
        <td>${s.quantity}</td>
        <td>${INR(s.buyPrice)}</td>
        <td>${INR(s.sellPrice)}</td>
        <td>${INR(s.buyTotal)}</td>
        <td>${INR(s.sellTotal)}</td>
        <td class="${grossClass}">${grossSign}${INR(s.profitLoss)}</td>
        <td class="charges-cell" title="${escapeHtml(chargesTooltip(s.charges))}">${INR(s.charges.total)}</td>
        <td class="${netClass}">${netSign}${INR(s.charges.netPL)}</td>
        <td class="${netClass}">${netSign}${s.charges.netPLPct.toFixed(2)}%</td>
        <td><button class="delete-btn" data-id="${s.id}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  totalInvestedEl.textContent = INR(summary.totalInvested);
  totalReturnedEl.textContent = INR(summary.totalReturned);
  totalChargesEl.textContent = INR(summary.totalCharges);

  const grossClass = summary.grossProfitLoss >= 0 ? "profit" : "loss";
  const grossSign = summary.grossProfitLoss >= 0 ? "+" : "";
  grossPlEl.textContent = grossSign + INR(summary.grossProfitLoss);
  grossPlEl.className = "value " + grossClass;

  const netClass = summary.netProfitLoss >= 0 ? "profit" : "loss";
  const netSign = summary.netProfitLoss >= 0 ? "+" : "";
  netPlEl.textContent = netSign + INR(summary.netProfitLoss);
  netPlEl.className = "value " + netClass;
  overallReturnEl.textContent = netSign + summary.overallReturnPct.toFixed(2) + "%";
  overallReturnEl.className = "value " + netClass;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.textContent = "";

  const payload = {
    name: document.getElementById("stock-name").value,
    quantity: document.getElementById("quantity").value,
    buyPrice: document.getElementById("buy-price").value,
    sellPrice: document.getElementById("sell-price").value,
    tradeType: document.getElementById("trade-type").value,
  };

  try {
    const res = await fetch(`${API}/api/stocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    form.reset();
    fetchStocks();
  } catch (err) {
    formError.textContent = err.message;
  }
});

tbody.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  if (!confirm("Delete this entry?")) return;
  try {
    const res = await fetch(`${API}/api/stocks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fetchStocks();
  } catch (err) {
    alert("Failed to delete: " + err.message);
  }
});

clearAllBtn.addEventListener("click", async () => {
  if (!confirm("Delete ALL transactions? This cannot be undone.")) return;
  try {
    const res = await fetch(`${API}/api/stocks`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fetchStocks();
  } catch (err) {
    alert("Failed to clear: " + err.message);
  }
});

fetchStocks();
