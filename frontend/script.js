const API = window.API_BASE_URL || "http://localhost:3000";

const form = document.getElementById("stock-form");
const tbody = document.getElementById("stock-tbody");
const emptyState = document.getElementById("empty-state");
const clearAllBtn = document.getElementById("clear-all");
const formError = document.getElementById("form-error");
const apiStatus = document.getElementById("api-status");

const totalInvestedEl = document.getElementById("total-invested");
const totalReturnedEl = document.getElementById("total-returned");
const netPlEl = document.getElementById("net-pl");
const overallReturnEl = document.getElementById("overall-return");

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

function render({ stocks, summary }) {
  tbody.innerHTML = "";

  if (!stocks.length) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    stocks.forEach((s, idx) => {
      const tr = document.createElement("tr");
      const plClass = s.profitLoss >= 0 ? "profit" : "loss";
      const sign = s.profitLoss >= 0 ? "+" : "";
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${s.quantity}</td>
        <td>${INR(s.buyPrice)}</td>
        <td>${INR(s.sellPrice)}</td>
        <td>${INR(s.buyTotal)}</td>
        <td>${INR(s.sellTotal)}</td>
        <td class="${plClass}">${sign}${INR(s.profitLoss)}</td>
        <td class="${plClass}">${sign}${s.profitLossPct.toFixed(2)}%</td>
        <td><button class="delete-btn" data-id="${s.id}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  totalInvestedEl.textContent = INR(summary.totalInvested);
  totalReturnedEl.textContent = INR(summary.totalReturned);

  const plClass = summary.netProfitLoss >= 0 ? "profit" : "loss";
  const sign = summary.netProfitLoss >= 0 ? "+" : "";
  netPlEl.textContent = sign + INR(summary.netProfitLoss);
  netPlEl.className = "value " + plClass;
  overallReturnEl.textContent = sign + summary.overallReturnPct.toFixed(2) + "%";
  overallReturnEl.className = "value " + plClass;
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
