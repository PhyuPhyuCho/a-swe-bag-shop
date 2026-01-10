/********************
 * STORAGE
 ********************/
let items = JSON.parse(localStorage.getItem("items") || "[]"); 
let sales = JSON.parse(localStorage.getItem("sales") || "[]"); 
// sale: {ts, itemId, qty, unitPrice, unitCost, discountType, discountValue, totalRevenue, totalProfit}

let period = "today";
let currentFilter = "all";

function saveAll(){
  localStorage.setItem("items", JSON.stringify(items));
  localStorage.setItem("sales", JSON.stringify(sales));
}

/********************
 * NAV
 ********************/
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
function goHome(){ showPage("home"); }

function openList(){
  showPage("list");
  renderList("all");
}
function openProfit(){
  showPage("profit");
  renderDashboard();
}
function openDiscounts(){
  showPage("discounts");
  renderDiscounts();
}

/********************
 * HELPERS
 ********************/
function fmt(n){ return (n||0).toLocaleString("en-US"); }
function nextId(){
  // stable id for items
  const n = items.length + 1;
  return "I" + String(n).padStart(3, "0");
}
function sameDay(a,b){ return a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth() && a.getDate()==b.getDate(); }
function sameMonth(a,b){ return a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth(); }
function sameYear(a,b){ return a.getFullYear()==b.getFullYear(); }

/********************
 * ADD ITEM (Inventory)
 ********************/
function addItem(){
  const file = document.getElementById("photo").files[0];
  const name = (document.getElementById("name").value || "").trim();
  const qty  = Number(document.getElementById("qty").value);
  const cost = Number(document.getElementById("cost").value);
  const price= Number(document.getElementById("price").value);

  if(!name) return alert("Enter item name");
  if(!qty || qty < 0) return alert("Enter quantity");
  if(!cost) return alert("Enter cost");
  if(!price) return alert("Enter sell price");

  const commit = (photoData) => {
    items.push({
      id: nextId(),
      name,
      qty,
      cost,      // per unit
      price,     // per unit
      photo: photoData || "",
      createdAt: new Date().toISOString()
    });
    saveAll();
    alert("✅ Saved");
    // reset
    document.getElementById("photo").value = "";
    document.getElementById("name").value = "";
    document.getElementById("qty").value = "";
    document.getElementById("cost").value = "";
    document.getElementById("price").value = "";
    // go list
    showPage("list");
    renderList("all");
  };

  if(file){
    const r = new FileReader();
    r.onload = () => commit(r.result);
    r.readAsDataURL(file);
  } else {
    commit("");
  }
}

/********************
 * LIST
 ********************/
function renderList(filter){
  currentFilter = filter || "all";
  const wrap = document.getElementById("itemList");
  wrap.innerHTML = "";

  const view = items.filter(it=>{
    if(currentFilter==="instock") return it.qty > 0;
    if(currentFilter==="soldout") return it.qty <= 0;
    return true;
  });

  if(view.length === 0){
    wrap.innerHTML = `<div style="grid-column:1/-1;color:#666;">No items yet.</div>`;
    return;
  }

  view.forEach(it=>{
    const unitProfit = Number(it.price) - Number(it.cost);
    wrap.innerHTML += `
      <div class="itemCard">
        ${it.photo ? `<img src="${it.photo}" alt="">` : `<div style="aspect-ratio:1/1;background:#efe8ff;"></div>`}
        <div class="itemInfo">
          <div class="itemTop">
            <div>
              <b>${it.name}</b><br>
              <span class="badge">${it.id}</span>
            </div>
            <div class="qtyBig">${fmt(it.qty)}</div>
          </div>

          <div style="margin-top:8px">
            Unit Cost: ${fmt(it.cost)} MMK<br>
            Unit Sell: ${fmt(it.price)} MMK<br>
            <span style="color:${unitProfit>=0?'green':'red'}">Unit Profit: ${fmt(unitProfit)} MMK</span>
          </div>

          <div class="rowBtns">
            <button onclick="sellItem('${it.id}')">Sell</button>
            <button class="ghost" onclick="restockItem('${it.id}')">+Stock</button>
          </div>
        </div>
      </div>
    `;
  });
}

/********************
 * RESTOCK
 ********************/
function restockItem(itemId){
  const it = items.find(x=>x.id===itemId);
  if(!it) return;

  const q = prompt("Add how many items to stock?");
  if(q===null) return;
  const add = Number(q);
  if(!add || add < 0) return alert("Invalid quantity");

  it.qty += add;
  saveAll();
  renderList(currentFilter);
}

/********************
 * SELL FLOW (Qty + optional discount)
 ********************/
function sellItem(itemId){
  const it = items.find(x=>x.id===itemId);
  if(!it) return;

  if(it.qty <= 0) return alert("Sold out!");

  const qStr = prompt(`How many sold? (In stock: ${it.qty})`);
  if(qStr===null) return;
  const qtySold = Number(qStr);
  if(!qtySold || qtySold < 1) return alert("Invalid qty");
  if(qtySold > it.qty) return alert("Not enough stock");

  // discount choice
  // type: none / percent / amount
  const dType = prompt("Discount? Type: none / percent / amount", "none");
  if(dType===null) return;

  let discountType = "none";
  let discountValue = 0;

  if(dType.toLowerCase()==="percent"){
    const p = prompt("Discount percent (e.g., 10 for 10%)", "10");
    if(p===null) return;
    discountType = "percent";
    discountValue = Number(p) || 0;
  } else if(dType.toLowerCase()==="amount"){
    const a = prompt("Discount amount per 1 item (MMK)", "1000");
    if(a===null) return;
    discountType = "amount";
    discountValue = Number(a) || 0;
  } else {
    discountType = "none";
    discountValue = 0;
  }

  const unitCost  = Number(it.cost);
  const unitPrice = Number(it.price);

  let finalUnitPrice = unitPrice;
  if(discountType==="percent"){
    finalUnitPrice = Math.max(0, Math.round(unitPrice * (1 - (discountValue/100))));
  } else if(discountType==="amount"){
    finalUnitPrice = Math.max(0, unitPrice - discountValue);
  }

  const totalRevenue = finalUnitPrice * qtySold;
  const totalProfit  = (finalUnitPrice - unitCost) * qtySold;

  // update stock
  it.qty -= qtySold;

  // record sale
  sales.push({
    ts: new Date().toISOString(),
    itemId: it.id,
    itemName: it.name,
    qty: qtySold,
    unitPrice,
    unitCost,
    discountType,
    discountValue,
    finalUnitPrice,
    totalRevenue,
    totalProfit
  });

  saveAll();
  alert(`✅ Sold ${qtySold} item(s)\nRevenue: ${fmt(totalRevenue)} MMK`);
  renderList(currentFilter);
}

/********************
 * DISCOUNT PAGE
 ********************/
function renderDiscounts(){
  const wrap = document.getElementById("discountList");
  wrap.innerHTML = "";

  const discounted = sales.filter(s => s.discountType !== "none" && (s.discountValue||0) > 0);

  if(discounted.length === 0){
    wrap.innerHTML = `<div style="grid-column:1/-1;color:#666;">No discounted sales yet.</div>`;
    return;
  }

  // newest first
  discounted.slice().reverse().forEach(s=>{
    const badge = s.discountType==="percent"
      ? `-${s.discountValue}%`
      : `-${fmt(s.discountValue)} MMK`;
    wrap.innerHTML += `
      <div class="itemCard">
        <div style="padding:12px">
          <b>${s.itemName}</b> <span class="badge">${s.itemId}</span><br>
          <div style="margin-top:8px">
            Sold Qty: <b>${fmt(s.qty)}</b><br>
            Discount: <b>${badge}</b><br>
            Final unit: <b>${fmt(s.finalUnitPrice)} MMK</b><br>
            Revenue: <b>${fmt(s.totalRevenue)} MMK</b><br>
            Profit: <b style="color:${s.totalProfit>=0?'green':'red'}">${fmt(s.totalProfit)} MMK</b><br>
            Date: ${s.ts.slice(0,10)}
          </div>
        </div>
      </div>
    `;
  });
}

/********************
 * PROFIT DASHBOARD + CHART
 ********************/
function setPeriod(p){ period = p; renderDashboard(); }

function renderDashboard(){
  const now = new Date();
  let soldQty = 0;
  let revenue = 0;
  let profit  = 0;

  sales.forEach(s=>{
    const d = new Date(s.ts);
    const ok =
      (period==="today" && sameDay(d, now)) ||
      (period==="month" && sameMonth(d, now)) ||
      (period==="year" && sameYear(d, now));
    if(!ok) return;

    soldQty += Number(s.qty||0);
    revenue += Number(s.totalRevenue||0);
    profit  += Number(s.totalProfit||0);
  });

  document.getElementById("soldQty").textContent = fmt(soldQty);
  document.getElementById("revenue").textContent = fmt(revenue);
  const pEl = document.getElementById("profitVal");
  pEl.textContent = fmt(profit);
  pEl.style.color = profit>=0 ? "green" : "red";

  drawMonthlyProfitChart();
}

function drawMonthlyProfitChart(){
  const canvas = document.getElementById("profitChart");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const now = new Date();
  const year = now.getFullYear();
  const profits = Array(12).fill(0);

  sales.forEach(s=>{
    const d = new Date(s.ts);
    if(d.getFullYear() !== year) return;
    profits[d.getMonth()] += Number(s.totalProfit||0);
  });

  const pad = 22;
  const chartW = w - pad*2;
  const chartH = h - pad*2;
  const maxAbs = Math.max(1, ...profits.map(v=>Math.abs(v)));
  const zeroY = pad + chartH/2;

  // axes
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h-pad);
  ctx.lineTo(w-pad, h-pad);
  ctx.stroke();

  // baseline
  ctx.beginPath();
  ctx.moveTo(pad, zeroY);
  ctx.lineTo(w-pad, zeroY);
  ctx.stroke();

  const gap = chartW/12;
  const barW = gap*0.6;

  for(let i=0;i<12;i++){
    const v = profits[i];
    const barH = (Math.abs(v)/maxAbs) * (chartH/2 - 8);
    const x = pad + i*gap + (gap-barW)/2;
    const y = v>=0 ? (zeroY-barH) : zeroY;

    ctx.fillStyle = v>=0 ? "green" : "red";
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle="#333";
    ctx.font="10px system-ui";
    ctx.fillText(String(i+1), x+barW/2-3, h-6);
  }
}

// initial
showPage("home");
