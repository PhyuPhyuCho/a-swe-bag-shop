/********************
 * STORAGE
 ********************/
let items = JSON.parse(localStorage.getItem("items") || "[]"); 
let sales = JSON.parse(localStorage.getItem("sales") || "[]"); 
// sale: {ts, itemId, itemName, qty, unitPrice, unitCost, totalRevenue, totalProfit, saleType: "normal"|"discount"}

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
function nextItemId(){
  const n = items.length + 1;
  return "I" + String(n).padStart(3, "0");
}
function nextDiscountId(){
  // find max D###
  const ds = items.filter(x=>x.discounted).map(x=>x.id);
  let max = 0;
  ds.forEach(id=>{
    const num = Number(String(id).replace("D","")) || 0;
    if(num>max) max=num;
  });
  return "D" + String(max + 1).padStart(3, "0");
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

    let name = (document.getElementById("name").value || "").trim();
    if(!name) name = `Item ${nextItemId()}`;
  if(!qty || qty < 0) return alert("Enter quantity");
  if(!cost) return alert("Enter cost");
  if(!price) return alert("Enter sell price");

  const commit = (photoData) => {
    items.push({
      id: nextItemId(),
      name,
      qty,
      cost,      // per unit
      price,     // per unit
      photo: photoData || "",
      discounted: false,
      parentId: null,
      createdAt: new Date().toISOString()
    });
    saveAll();
    alert("✅ Saved");
    document.getElementById("photo").value = "";
    document.getElementById("name").value = "";
    document.getElementById("qty").value = "";
    document.getElementById("cost").value = "";
    document.getElementById("price").value = "";
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

  // show ONLY normal items here (discounted shown in Discount page)
  const normalItems = items.filter(x => !x.discounted);

  const view = normalItems.filter(it=>{
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
            <button onclick="sellNormal('${it.id}')">Sell</button>
            <button class="ghost" onclick="discountSplit('${it.id}')">Discount</button>
          </div>
        </div>
      </div>
    `;
  });
}

/********************
 * NORMAL SELL (NO DISCOUNT QUESTIONS)
 ********************/
function sellNormal(itemId){
  const it = items.find(x=>x.id===itemId && !x.discounted);
  if(!it) return;
  if(it.qty <= 0) return alert("Sold out!");

  openQtyModal({
    title: `Sell quantity (In stock: ${it.qty})`,
    maxQty: it.qty,
    mode: "sell",
    onConfirm: ({ qty }) => {
      const qtySold = (qty === "all") ? it.qty : qty;
      const unitCost  = Number(it.cost);
      const unitPrice = Number(it.price);

      const totalRevenue = unitPrice * qtySold;
      const totalProfit  = (unitPrice - unitCost) * qtySold;

      it.qty -= qtySold;

      sales.push({
        ts: new Date().toISOString(),
        itemId: it.id,
        itemName: it.name,
        qty: qtySold,
        unitPrice,
        unitCost,
        totalRevenue,
        totalProfit,
        saleType: "normal"
      });

      saveAll();
      alert(`✅ Sold ${qtySold}\nRevenue: ${fmt(totalRevenue)} MMK`);
      renderList(currentFilter);
      renderDashboard();
    }
  });
}

/********************
 * DISCOUNT SPLIT (create discounted stock)
 ********************/
function discountSplit(itemId){
  const it = items.find(x=>x.id===itemId && !x.discounted);
  if(!it) return;
  if(it.qty <= 0) return alert("No stock to discount");

  openQtyModal({
    title: `Discount qty (In stock: ${it.qty})`,
    maxQty: it.qty,
    mode: "discount",
    onConfirm: ({ qty, discountPrice }) => {
      const qtyToDiscount = (qty === "all") ? it.qty : qty;

      // reduce normal stock
      it.qty -= qtyToDiscount;

      // create discounted item
      const did = nextDiscountId();
      items.push({
        id: did,
        parentId: it.id,
        name: it.name || `Item ${it.id}`,
        qty: qtyToDiscount,
        cost: Number(it.cost),
        price: Number(discountPrice),
        photo: it.photo || "",
        discounted: true,
        createdAt: new Date().toISOString()
      });

      saveAll();
      alert("🏷️ Discount applied");
      showPage("discounts");
      renderDiscounts();
      renderDashboard();
    }
  });
}

/********************
 * DISCOUNT PAGE
 ********************/
function renderDiscounts(){
  const wrap = document.getElementById("discountList");
  wrap.innerHTML = "";

  const discItems = items.filter(x=>x.discounted);

  if(discItems.length === 0){
    wrap.innerHTML = `<div style="grid-column:1/-1;color:#666;">No discount items yet.</div>`;
    return;
  }

  discItems.forEach(it=>{
    const parent = items.find(x=>x.id===it.parentId && !x.discounted);
    const normalPrice = parent ? parent.price : null;
    const unitProfit = Number(it.price) - Number(it.cost);

    wrap.innerHTML += `
      <div class="itemCard">
        ${it.photo ? `<img src="${it.photo}" alt="">` : `<div style="aspect-ratio:1/1;background:#efe8ff;"></div>`}
        <div class="itemInfo">
          <div class="itemTop">
            <div>
              <b>${it.name}</b>
              <span class="discountTag">DISCOUNT</span><br>
              <span class="badge">${it.id}</span>
              ${it.parentId ? `<span class="badge">from ${it.parentId}</span>` : ""}
            </div>
            <div class="qtyBig">${fmt(it.qty)}</div>
          </div>

          <div style="margin-top:8px">
            ${normalPrice!=null ? `Normal: <span class="strike">${fmt(normalPrice)} MMK</span><br>` : ""}
            Discount: <b>${fmt(it.price)} MMK</b><br>
            Cost: ${fmt(it.cost)} MMK<br>
            <span style="color:${unitProfit>=0?'green':'red'}">Unit Profit: ${fmt(unitProfit)} MMK</span>
          </div>

          <div class="rowBtns">
            <button onclick="sellDiscount('${it.id}')">Sell</button>
            <button class="ghost" onclick="removeDiscount('${it.id}')">Remove</button>
          </div>
        </div>
      </div>
    `;
  });
}

/********************
 * SELL DISCOUNT ITEM
 ********************/
function sellDiscount(discountId){
  const it = items.find(x=>x.id===discountId && x.discounted);
  if(!it) return;
  if(it.qty <= 0) return alert("Sold out!");

  openQtyModal({
    title: `Sell discount qty (In stock: ${it.qty})`,
    maxQty: it.qty,
    mode: "sell",
    onConfirm: ({ qty }) => {
      const qtySold = (qty === "all") ? it.qty : qty;

      const unitCost  = Number(it.cost);
      const unitPrice = Number(it.price);

      const totalRevenue = unitPrice * qtySold;
      const totalProfit  = (unitPrice - unitCost) * qtySold;

      it.qty -= qtySold;

      sales.push({
        ts: new Date().toISOString(),
        itemId: it.id,
        itemName: (it.name || it.id) + " (Discount)",
        qty: qtySold,
        unitPrice,
        unitCost,
        totalRevenue,
        totalProfit,
        saleType: "discount"
      });

      saveAll();
      alert(`✅ Discount sold ${qtySold}\nRevenue: ${fmt(totalRevenue)} MMK`);
      renderDiscounts();
      renderDashboard();
    }
  });
}

/********************
 * REMOVE DISCOUNT (move stock back to parent)
 ********************/
function removeDiscount(discountId){
  const it = items.find(x=>x.id===discountId && x.discounted);
  if(!it) return;

  const parent = items.find(x=>x.id===it.parentId && !x.discounted);
  if(!parent){
    const ok = confirm("Parent item not found. Delete discount item anyway?");
    if(!ok) return;
    // delete only
    items = items.filter(x=>x.id!==discountId);
    saveAll();
    renderDiscounts();
    return;
  }

  parent.qty += it.qty;

  // delete discount item
  items = items.filter(x=>x.id!==discountId);

  saveAll();
  alert("✅ Discount removed (stock returned)");
  renderDiscounts();
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

  const sq = document.getElementById("soldQty");
  const rv = document.getElementById("revenue");
  const pv = document.getElementById("profitVal");
  if(sq) sq.textContent = fmt(soldQty);
  if(rv) rv.textContent = fmt(revenue);
  if(pv){
    pv.textContent = fmt(profit);
    pv.style.color = profit>=0 ? "green" : "red";
  }

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

// start
showPage("home");
let pendingAction = null;

function openQtyModal({ title, maxQty, mode, onConfirm }) {
  pendingAction = onConfirm;

  document.getElementById("qtyTitle").textContent = title;

  const sel = document.getElementById("qtySelect");
  sel.innerHTML = "";
  // ✅ Placeholder + options
const ph = document.createElement("option");
ph.value = "";
ph.textContent = "Choose quantity...";
ph.disabled = true;
ph.selected = true;
sel.appendChild(ph);

for (let i = 1; i <= Number(maxQty); i++) {
  const opt = document.createElement("option");
  opt.value = String(i);
  opt.textContent = String(i);
  sel.appendChild(opt);
}

const optAll = document.createElement("option");
optAll.value = "all";
optAll.textContent = `All (${maxQty})`;
sel.appendChild(optAll);
    

  // options 1..maxQty
  for (let i = 1; i <= maxQty; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    sel.appendChild(opt);
  }
  // add All option
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = `All (${maxQty})`;
  sel.appendChild(optAll);

  // discount price input show/hide
  const extra = document.getElementById("qtyExtra");
  extra.classList.toggle("hidden", mode !== "discount");

  // numeric keypad for discount price
  if (mode === "discount") {
    document.getElementById("discountPriceInput").value = "";
  }

  document.getElementById("qtyModal").classList.remove("hidden");
  // ✅ iOS Safari auto-open prevent
setTimeout(() => {
  const sel = document.getElementById("qtySelect");
  sel.blur();
  if (document.activeElement) document.activeElement.blur();
}, 0);

}

function closeQty(){
  document.getElementById("qtyModal").classList.add("hidden");
  pendingAction = null;
}

function confirmQty(){
  const val = document.getElementById("qtySelect").value;
if (!val) return alert("Please choose quantity");

  const qty = val === "all" ? "all" : Number(val);

  const extraVisible = !document.getElementById("qtyExtra").classList.contains("hidden");
  let discountPrice = null;
  if (extraVisible) {
    discountPrice = Number(document.getElementById("discountPriceInput").value);
    if (!discountPrice && discountPrice !== 0) return alert("Enter discount price");
  }

  closeQty();
  if (pendingAction) pendingAction({ qty, discountPrice });
}
