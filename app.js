/********************
 * PIN
 ********************/
let PIN = localStorage.getItem("pin") || "1234";

function unlock() {
  const val = document.getElementById("pinInput").value;
  if (val === PIN) {
    document.getElementById("lockScreen").style.display = "none";
    showPage("home");
  } else {
    alert("Wrong PIN");
  }
}

/********************
 * NAVIGATION
 ********************/
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
function goHome() {
  showPage("home");
}

/********************
 * BAG DATA (Local)
 ********************/
let bags = JSON.parse(localStorage.getItem("bags") || "[]");

function nextId() {
  return "B" + String(bags.length + 1).padStart(3, "0");
}

/********************
 * ADD BAG
 ********************/
function addBag() {
  const photoInput = document.getElementById("photo");
  const cost = document.getElementById("cost").value;
  const price = document.getElementById("price").value;

  if (!cost || !price) {
    alert("Fill cost & price");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const bag = {
      id: nextId(),
      photo: reader.result || "",
      cost: Number(cost),
      price: Number(price),
      sold: false,
      date: new Date().toISOString()
    };

    bags.push(bag);
    localStorage.setItem("bags", JSON.stringify(bags));

    // ✅ UX feedback
    alert("✅ Bag saved");

    // reset form
    photoInput.value = "";
    document.getElementById("cost").value = "";
    document.getElementById("price").value = "";

    // go to list automatically
    showPage("list");
    renderList("all");
  };

  if (photoInput.files[0]) {
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    reader.onload();
  }
}

/********************
 * BAG LIST
 ********************/
function renderList(filter = "all") {
  const wrap = document.getElementById("bagList");
  wrap.innerHTML = "";

  bags
    .filter(b =>
      filter === "all" ||
      (filter === "sold" && b.sold) ||
      (filter === "stock" && !b.sold)
    )
    .forEach((b, i) => {
      const profit = b.price - b.cost;
      wrap.innerHTML += `
        <div class="bag-card">
          ${b.photo ? `<img src="${b.photo}">` : ""}
          <div class="bag-info">
            <b>${b.id}</b>
            <div>Cost: ${b.cost} MMK</div>
            <div>Price: ${b.price} MMK</div>
            <div style="color:${profit>=0?'green':'red'}">
              Profit: ${profit} MMK
            </div>
            <label>
              <input type="checkbox" ${b.sold?"checked":""}
                onchange="toggleSold(${i})">
              Sold
            </label>
          </div>
        </div>
      `;
    });
}

function toggleSold(i) {
  const bag = bags[i];

  if (!bag.sold) {
    const name = prompt("Customer name?");
    if (!name) return;
    bag.customer = name;
    bag.sold = true;
    bag.soldDate = new Date().toISOString();
  } else {
    bag.sold = false;
    bag.customer = "";
    bag.soldDate = null;
  }

  localStorage.setItem("bags", JSON.stringify(bags));
  renderList();
}
/********************
 * DASHBOARD: Today/Month/Year + Chart
 ********************/
let period = "today";

function setPeriod(p) {
  period = p;
  renderDashboard();
}

function fmt(n) {
  return (n || 0).toLocaleString("en-US");
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function inSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth();
}

function inSameYear(a, b) {
  return a.getFullYear() === b.getFullYear();
}

function renderDashboard() {
  // only sold bags count toward profit
  const now = new Date();
  let soldCount = 0;
  let totalSales = 0;
  let totalCost = 0;

  bags.forEach(b => {
    if (!b.sold) return;

    // use soldDate if exists, else fallback to date
    const d = new Date(b.soldDate || b.date);

    const ok =
      (period === "today" && sameDay(d, now)) ||
      (period === "month" && inSameMonth(d, now)) ||
      (period === "year" && inSameYear(d, now));

    if (!ok) return;

    soldCount += 1;
    totalSales += Number(b.price || 0);
    totalCost += Number(b.cost || 0);
  });

  const profit = totalSales - totalCost;

  const soldEl = document.getElementById("soldCount");
  const salesEl = document.getElementById("totalSales");
  const costEl = document.getElementById("totalCost");
  const profitEl = document.getElementById("totalProfit");

  if (soldEl) soldEl.textContent = fmt(soldCount);
  if (salesEl) salesEl.textContent = fmt(totalSales);
  if (costEl) costEl.textContent = fmt(totalCost);
  if (profitEl) {
    profitEl.textContent = fmt(profit);
    profitEl.style.color = profit >= 0 ? "green" : "red";
  }

  drawMonthlyProfitChart();
}

function drawMonthlyProfitChart() {
  const canvas = document.getElementById("profitChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // compute profit per month for current year
  const now = new Date();
  const year = now.getFullYear();
  const profits = Array(12).fill(0);

  bags.forEach(b => {
    if (!b.sold) return;
    const d = new Date(b.soldDate || b.date);
    if (d.getFullYear() !== year) return;

    const m = d.getMonth();
    profits[m] += (Number(b.price || 0) - Number(b.cost || 0));
  });

  // draw background
  ctx.clearRect(0, 0, w, h);

  // chart area
  const pad = 22;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  // scale
  const maxAbs = Math.max(1, ...profits.map(x => Math.abs(x)));
  const zeroY = pad + chartH / 2; // center baseline

  // axes
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  // baseline (0)
  ctx.beginPath();
  ctx.moveTo(pad, zeroY);
  ctx.lineTo(w - pad, zeroY);
  ctx.stroke();

  const barW = chartW / 12 * 0.6;
  const gap = chartW / 12;

  for (let i = 0; i < 12; i++) {
    const x = pad + i * gap + (gap - barW) / 2;
    const v = profits[i];
    const barH = (Math.abs(v) / maxAbs) * (chartH / 2 - 8);

    const y = v >= 0 ? (zeroY - barH) : zeroY;
    const height = barH;

    // bar (no fixed color request—use green/red only for sign)
    ctx.fillStyle = v >= 0 ? "green" : "red";
    ctx.fillRect(x, y, barW, height);

    // month label (1..12)
    ctx.fillStyle = "#333";
    ctx.font = "10px system-ui";
    ctx.fillText(String(i + 1), x + barW / 2 - 3, h - 6);
  }
}

/********************
 * Hook: when opening Profit page
 ********************/
const _oldShowPage = showPage;
showPage = function(id) {
  _oldShowPage(id);
  if (id === "profit") {
    renderDashboard();
  }
};
/********************
 * SETTINGS: PIN
 ********************/
function changePin() {
  const oldPin = prompt("Enter current PIN");
  if (oldPin !== PIN) return alert("Wrong PIN");

  const newPin = prompt("New 4-digit PIN");
  if (!newPin || newPin.length < 4) return alert("PIN must be 4 digits");

  PIN = newPin;
  localStorage.setItem("pin", PIN);
  alert("✅ PIN updated");
}

/********************
 * EXPORT: CSV (Excel)
 ********************/
function exportCSV() {
  // header
  const rows = [
    ["BagID", "Cost(MMK)", "SellPrice(MMK)", "Profit(MMK)", "Sold", "SoldDate", "Customer"]
  ];

  bags.forEach(b => {
    const profit = (Number(b.price || 0) - Number(b.cost || 0));
    rows.push([
      b.id,
      b.cost,
      b.price,
      profit,
      b.sold ? "YES" : "NO",
      b.soldDate ? b.soldDate : "",
      b.customer ? b.customer : ""
    ]);
  });

  const csv = rows.map(r =>
    r.map(x => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")
  ).join("\n");

  downloadFile(`a-swe-bag-shop_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
}

/********************
 * EXPORT: PDF (Print)
 ********************/
function exportPDF() {
  // Simple: open a print-friendly window and print-to-PDF
  const now = new Date().toISOString().slice(0,10);
  const sold = bags.filter(b => b.sold);
  const totalSales = sold.reduce((s,b)=>s+Number(b.price||0),0);
  const totalCost  = sold.reduce((s,b)=>s+Number(b.cost||0),0);
  const totalProfit = totalSales - totalCost;

  const html = `
    <html>
    <head>
      <title>A Swe Bag Shop Report</title>
      <style>
        body{font-family:system-ui;padding:20px;}
        h1{color:#6b4eff;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left;}
        th{background:#f7f3ff;}
      </style>
    </head>
    <body>
      <h1>👜 A Swe Bag Shop</h1>
      <p><b>Date:</b> ${now}</p>
      <p><b>Sold Bags:</b> ${sold.length}</p>
      <p><b>Total Sales:</b> ${totalSales.toLocaleString()} MMK</p>
      <p><b>Total Cost:</b> ${totalCost.toLocaleString()} MMK</p>
      <p><b>Total Profit:</b> <span style="color:${totalProfit>=0?'green':'red'}">${totalProfit.toLocaleString()} MMK</span></p>

      <table>
        <thead>
          <tr>
            <th>BagID</th><th>Cost</th><th>Sell</th><th>Profit</th><th>Sold Date</th><th>Customer</th>
          </tr>
        </thead>
        <tbody>
          ${sold.map(b=>{
            const p = (Number(b.price||0)-Number(b.cost||0));
            return `<tr>
              <td>${b.id}</td>
              <td>${Number(b.cost||0).toLocaleString()}</td>
              <td>${Number(b.price||0).toLocaleString()}</td>
              <td style="color:${p>=0?'green':'red'}">${p.toLocaleString()}</td>
              <td>${b.soldDate ? b.soldDate.slice(0,10) : ""}</td>
              <td>${b.customer || ""}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>

      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

/********************
 * BACKUP: JSON
 ********************/
function backupJSON() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    pin: PIN,
    bags
  };
  downloadFile(`a-swe-bag-shop_backup_${new Date().toISOString().slice(0,10)}.json`,
               JSON.stringify(payload, null, 2),
               "application/json");
}

function restoreJSON() {
  const file = document.getElementById("restoreFile").files[0];
  if (!file) return alert("Choose a backup file first");

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data || !Array.isArray(data.bags)) {
        return alert("Invalid backup file");
      }

      bags = data.bags;
      localStorage.setItem("bags", JSON.stringify(bags));

      if (data.pin) {
        PIN = data.pin;
        localStorage.setItem("pin", PIN);
      }

      alert("✅ Restored!");
      showPage("home");
    } catch (e) {
      alert("Restore failed");
    }
  };
  reader.readAsText(file);
}

/********************
 * UTIL: download file
 ********************/
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
