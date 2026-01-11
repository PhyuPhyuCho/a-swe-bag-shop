// v20260111_7b - Stable build (no nested template literals)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
}

let items = JSON.parse(localStorage.getItem('items') || '[]');
let sales = JSON.parse(localStorage.getItem('sales') || '[]');

let currentCategory = 'bag';
let currentFilter = 'all';
let period = 'today';

function saveAll() {
  localStorage.setItem('items', JSON.stringify(items));
  localStorage.setItem('sales', JSON.stringify(sales));
}

function fmt(n) { return (Number(n) || 0).toLocaleString('en-US'); }

function setFab(enabled) {
  document.body.classList.toggle('showFab', !!enabled);
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  setFab(['list','discounts','profit'].includes(id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() { showPage('home'); }

function openList(cat) {
  currentCategory = cat || 'bag';
  document.getElementById('listTitle').textContent = (currentCategory === 'clothes') ? 'Clothes List' : 'Bag List';
  document.getElementById('listHint').textContent = (currentCategory === 'clothes') ? 'Clothes inventory' : 'Bag inventory';
  showPage('list');
  renderList('all');
}

function openDiscounts() {
  showPage('discounts');
  renderDiscounts();
}

function openProfit() {
  showPage('profit');
  renderDashboard();
}

function nextNormalId() {
  const nums = items.filter(x => !x.discounted).map(x => Number(String(x.id || '').replace(/\D/g,'')) || 0);
  const n = Math.max(0, ...nums) + 1;
  return 'I' + String(n).padStart(3,'0');
}

function nextDiscountId() {
  const nums = items.filter(x => x.discounted).map(x => Number(String(x.id || '').replace(/\D/g,'')) || 0);
  const n = Math.max(0, ...nums) + 1;
  return 'D' + String(n).padStart(3,'0');
}

function addItem() {
  const file = document.getElementById('photo').files[0];
  const category = document.getElementById('category').value || 'bag';
  let name = (document.getElementById('name').value || '').trim();

  const qty = Number(document.getElementById('qty').value);
  const cost = Number(document.getElementById('cost').value);
  const price = Number(document.getElementById('price').value);

  if (!qty || qty < 0) return alert('Enter quantity');
  if (!Number.isFinite(cost)) return alert('Enter cost');
  if (!Number.isFinite(price)) return alert('Enter sell price');

  const id = nextNormalId();
  if (!name) name = 'Item ' + id;

  const commit = (photoData) => {
    items.push({
      id, name, category,
      qty, cost, price,
      photo: photoData || '',
      discounted: false,
      parentId: null,
      createdAt: new Date().toISOString()
    });
    saveAll();
    alert('Saved ✅');

    document.getElementById('photo').value = '';
    document.getElementById('name').value = '';
    document.getElementById('qty').value = '';
    document.getElementById('cost').value = '';
    document.getElementById('price').value = '';

    openList(category);
  };

  if (file) {
    const r = new FileReader();
    r.onload = () => commit(r.result);
    r.readAsDataURL(file);
  } else {
    commit('');
  }
}

// Qty modal
let qtyCallback = null;
let qtyMode = 'sell';

function openQtyModal(title, maxQty, mode, cb) {
  qtyCallback = cb;
  qtyMode = mode || 'sell';
  document.getElementById('qtyTitle').textContent = title;

  const priceWrap = document.getElementById('discountPriceWrap');
  if (qtyMode === 'discount') {
    priceWrap.classList.remove('hidden');
    document.getElementById('discountPriceInput').value = '';
  } else {
    priceWrap.classList.add('hidden');
  }

  const grid = document.getElementById('qtyGrid');
  grid.innerHTML = '';

  const m = Number(maxQty) || 0;
  if (m <= 0) {
    grid.innerHTML = '<div class="small" style="padding:8px;text-align:center">No stock</div>';
  } else {
    const maxButtons = Math.min(12, m);
    for (let i = 1; i <= maxButtons; i++) {
      const b = document.createElement('button');
      b.className = 'qtyBtn';
      b.textContent = String(i);
      b.onclick = () => confirmQty(i);
      grid.appendChild(b);
    }
    if (m > 12) {
      const plus = document.createElement('button');
      plus.className = 'qtyBtn';
      plus.textContent = '+';
      plus.onclick = () => {
        const q = prompt('Enter quantity (1-' + m + ')');
        if (q === null) return;
        const n = Number(q);
        if (!n || n < 1 || n > m) return alert('Invalid');
        confirmQty(n);
      };
      grid.appendChild(plus);
    }
    const all = document.createElement('button');
    all.className = 'qtyBtn primary';
    all.textContent = 'All (' + m + ')';
    all.onclick = () => confirmQty('all');
    grid.appendChild(all);
  }

  document.getElementById('qtyModal').classList.remove('hidden');
}

function closeQtyModal() {
  document.getElementById('qtyModal').classList.add('hidden');
  qtyCallback = null;
}

function confirmQty(qty) {
  let discountPrice = null;
  if (qtyMode === 'discount') {
    discountPrice = Number(document.getElementById('discountPriceInput').value);
    if (!Number.isFinite(discountPrice)) return alert('Enter discount price');
  }
  const cb = qtyCallback;
  closeQtyModal();
  if (cb) cb(qty, discountPrice);
}

// Edit modal
let editId = null;

function openEdit(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;

  editId = id;
  document.getElementById('editTitle').textContent = 'Edit ' + it.id;
  document.getElementById('editName').value = it.name || '';
  document.getElementById('editCost').value = String(it.cost ?? '');
  document.getElementById('editPrice').value = String(it.price ?? '');
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEdit() {
  document.getElementById('editModal').classList.add('hidden');
  editId = null;
}

function saveEdit() {
  const it = items.find(x => x.id === editId);
  if (!it) return closeEdit();

  const name = (document.getElementById('editName').value || '').trim();
  const cost = Number(document.getElementById('editCost').value);
  const price = Number(document.getElementById('editPrice').value);

  if (!Number.isFinite(cost)) return alert('Enter cost');
  if (!Number.isFinite(price)) return alert('Enter price');

  if (name) it.name = name;
  it.cost = cost;
  it.price = price;

  saveAll();
  alert('Updated ✅');
  closeEdit();

  if (!document.getElementById('discounts').classList.contains('hidden')) {
    renderDiscounts();
  } else if (!document.getElementById('list').classList.contains('hidden')) {
    renderList(currentFilter);
  }
  renderDashboard();
}

function deleteItem(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  if (!confirm('Delete ' + it.id + '?')) return;

  if (!it.discounted) {
    items = items.filter(x => !(x.discounted && x.parentId === it.id));
  }
  items = items.filter(x => x.id !== id);

  saveAll();
  alert('Deleted ✅');

  renderList(currentFilter);
  renderDiscounts();
  renderDashboard();
}

function renderList(filter) {
  currentFilter = filter || 'all';
  const wrap = document.getElementById('itemList');
  wrap.innerHTML = '';

  const list = items
    .filter(x => !x.discounted)
    .filter(x => (x.category || 'bag') === currentCategory)
    .filter(it => {
      if (currentFilter === 'instock') return it.qty > 0;
      if (currentFilter === 'soldout') return it.qty <= 0;
      return true;
    });

  if (!list.length) {
    wrap.innerHTML = '<div class="small" style="text-align:center">No items</div>';
    return;
  }

  list.forEach(it => {
    const unitProfit = (Number(it.price) || 0) - (Number(it.cost) || 0);
    const isSoldOut = (Number(it.qty) || 0) <= 0;

    const photoHtml = it.photo
      ? '<img src="' + it.photo + '">'
      : '<div style="aspect-ratio:1/1;background:rgba(107,78,255,.12)"></div>';

    const soldBadge = isSoldOut ? '<span class="soldOutBadge">SOLD OUT</span>' : '';
    const qtyClass = isSoldOut ? 'soldOutQty' : '';
    const cardClass = isSoldOut ? 'soldOutCard' : '';

    let actionHtml = '';
    if (!isSoldOut) {
      actionHtml += '<button onclick="sellNormal(\'' + it.id + '\')">Sell</button>';
      actionHtml += '<button class="ghost" onclick="discountSplit(\'' + it.id + '\')">Discount</button>';
    }
    actionHtml += '<button class="secondaryBtn smallBtn" onclick="openEdit(\'' + it.id + '\')">Edit</button>';
    actionHtml += '<button class="dangerBtn smallBtn" onclick="deleteItem(\'' + it.id + '\')">Delete</button>';

    const html =
      '<div class="itemCard ' + cardClass + '">' +
        photoHtml +
        '<div class="itemInfo">' +
          '<div class="itemTop">' +
            '<div>' +
              '<div style="font-weight:900">' + (it.name || '') + soldBadge + '</div>' +
              '<span class="badge">' + it.id + '</span>' +
            '</div>' +
            '<div class="qtyBig ' + qtyClass + '">' + fmt(it.qty) + '</div>' +
          '</div>' +
          '<div class="small" style="margin-top:6px">' +
            'Unit Cost: <b>' + fmt(it.cost) + '</b> • Unit Sell: <b>' + fmt(it.price) + '</b><br>' +
            '<span style="color:' + (unitProfit >= 0 ? 'green' : 'red') + ';font-weight:900">' +
              'Unit Profit: ' + fmt(unitProfit) +
            '</span>' +
          '</div>' +
          '<div class="rowBtns">' + actionHtml + '</div>' +
        '</div>' +
      '</div>';

    wrap.insertAdjacentHTML('beforeend', html);
  });
}

function renderDiscounts() {
  const wrap = document.getElementById('discountList');
  wrap.innerHTML = '';

  const ds = items.filter(x => x.discounted && (Number(x.qty) || 0) > 0);
  if (!ds.length) {
    wrap.innerHTML = '<div class="small" style="text-align:center">No discount items</div>';
    return;
  }

  ds.forEach(it => {
    const unitProfit = (Number(it.price) || 0) - (Number(it.cost) || 0);
    const catTag = (it.category === 'clothes') ? '👗' : '👜';

    const photoHtml = it.photo
      ? '<img src="' + it.photo + '">'
      : '<div style="aspect-ratio:1/1;background:rgba(107,78,255,.12)"></div>';

    let actionHtml = '';
    actionHtml += '<button onclick="sellDiscount(\'' + it.id + '\')">Sell</button>';
    actionHtml += '<button class="secondaryBtn smallBtn" onclick="openEdit(\'' + it.id + '\')">Edit</button>';
    actionHtml += '<button class="dangerBtn smallBtn" onclick="deleteItem(\'' + it.id + '\')">Delete</button>';

    const html =
      '<div class="itemCard">' +
        photoHtml +
        '<div class="itemInfo">' +
          '<div class="itemTop">' +
            '<div>' +
              '<div style="font-weight:900">' + catTag + ' ' + (it.name || '') + '<span class="discountTag">DISCOUNT</span></div>' +
              '<span class="badge">' + it.id + '</span>' +
            '</div>' +
            '<div class="qtyBig">' + fmt(it.qty) + '</div>' +
          '</div>' +
          '<div class="small" style="margin-top:6px">' +
            'Discount: <b>' + fmt(it.price) + '</b> • Cost: <b>' + fmt(it.cost) + '</b><br>' +
            '<span style="color:' + (unitProfit >= 0 ? 'green' : 'red') + ';font-weight:900">' +
              'Unit Profit: ' + fmt(unitProfit) +
            '</span>' +
          '</div>' +
          '<div class="rowBtns">' + actionHtml + '</div>' +
        '</div>' +
      '</div>';

    wrap.insertAdjacentHTML('beforeend', html);
  });
}

function sellNormal(id) {
  const it = items.find(x => x.id === id && !x.discounted);
  if (!it || it.qty <= 0) return alert('No stock');

  openQtyModal('Sell quantity (In stock: ' + it.qty + ')', it.qty, 'sell', (qty) => {
    const q = (qty === 'all') ? it.qty : Number(qty);
    const rev = (Number(it.price) || 0) * q;
    const prof = ((Number(it.price) || 0) - (Number(it.cost) || 0)) * q;

    it.qty -= q;

    sales.push({
      ts: new Date().toISOString(),
      qty: q,
      totalRevenue: rev,
      totalProfit: prof
    });

    saveAll();
    alert('Sold ✅');
    renderList(currentFilter);
    renderDashboard();
  });
}

function discountSplit(id) {
  const it = items.find(x => x.id === id && !x.discounted);
  if (!it || it.qty <= 0) return alert('No stock');

  openQtyModal('Discount quantity (In stock: ' + it.qty + ')', it.qty, 'discount', (qty, discountPrice) => {
    const q = (qty === 'all') ? it.qty : Number(qty);
    if (!q || q < 1 || q > it.qty) return alert('Invalid qty');

    it.qty -= q;

    items.push({
      id: nextDiscountId(),
      parentId: it.id,
      name: it.name,
      category: it.category || 'bag',
      qty: q,
      cost: Number(it.cost) || 0,
      price: Number(discountPrice) || 0,
      photo: it.photo || '',
      discounted: true,
      createdAt: new Date().toISOString()
    });

    saveAll();
    alert('Discount created ✅');
    openDiscounts();
  });
}

function sellDiscount(id) {
  const it = items.find(x => x.id === id && x.discounted);
  if (!it || it.qty <= 0) return alert('No stock');

  openQtyModal('Sell discount qty (In stock: ' + it.qty + ')', it.qty, 'sell', (qty) => {
    const q = (qty === 'all') ? it.qty : Number(qty);
    const rev = (Number(it.price) || 0) * q;
    const prof = ((Number(it.price) || 0) - (Number(it.cost) || 0)) * q;

    it.qty -= q;

    sales.push({
      ts: new Date().toISOString(),
      qty: q,
      totalRevenue: rev,
      totalProfit: prof
    });

    saveAll();
    alert('Sold ✅');
    renderDiscounts();
    renderDashboard();
  });
}

// Profit
function sameDay(a,b) { return a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth() && a.getDate()==b.getDate(); }
function sameMonth(a,b) { return a.getFullYear()==b.getFullYear() && a.getMonth()==b.getMonth(); }
function sameYear(a,b) { return a.getFullYear()==b.getFullYear(); }

function setPeriod(p) { period = p; renderDashboard(); }

function renderDashboard() {
  const soldQtyEl = document.getElementById('soldQty');
  const revenueEl = document.getElementById('revenue');
  const profitEl = document.getElementById('profitVal');
  if (!soldQtyEl || !revenueEl || !profitEl) return;

  const now = new Date();
  let sq = 0, rv = 0, pf = 0;

  sales.forEach(s => {
    const d = new Date(s.ts);
    const ok =
      (period === 'today' && sameDay(d, now)) ||
      (period === 'month' && sameMonth(d, now)) ||
      (period === 'year' && sameYear(d, now));

    if (!ok) return;
    sq += Number(s.qty) || 0;
    rv += Number(s.totalRevenue) || 0;
    pf += Number(s.totalProfit) || 0;
  });

  soldQtyEl.textContent = fmt(sq);
  revenueEl.textContent = fmt(rv);
  profitEl.textContent = fmt(pf);
  profitEl.style.color = (pf >= 0) ? 'green' : 'red';

  drawChart();
  renderDaily();
}

function drawChart() {
  const c = document.getElementById('profitChart');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);

  const year = new Date().getFullYear();
  const p = Array(12).fill(0);

  sales.forEach(s => {
    const d = new Date(s.ts);
    if (d.getFullYear() === year) p[d.getMonth()] += Number(s.totalProfit) || 0;
  });

  const pad=20, w=c.width-pad*2, h=c.height-pad*2;
  const zero = pad + h/2;
  const max = Math.max(1, ...p.map(v => Math.abs(v)));

  ctx.beginPath(); ctx.moveTo(pad, zero); ctx.lineTo(c.width-pad, zero); ctx.stroke();

  const gap = w/12, bw = gap*0.6;
  p.forEach((v,i) => {
    const bh = (Math.abs(v)/max) * (h/2 - 6);
    const x = pad + i*gap + (gap-bw)/2;
    const y = (v >= 0) ? (zero-bh) : zero;
    ctx.fillStyle = (v >= 0) ? 'green' : 'red';
    ctx.fillRect(x, y, bw, bh);
  });
}

function ymd(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + dd;
}

function inPeriod(d) {
  const now = new Date();
  if (period === 'today') return sameDay(d, now);
  if (period === 'month') return sameMonth(d, now);
  return sameYear(d, now);
}

function renderDaily() {
  const box = document.getElementById('dailyList');
  if (!box) return;

  const map = {};
  sales.forEach(s => {
    const d = new Date(s.ts);
    if (!inPeriod(d)) return;
    const key = ymd(s.ts);
    if (!map[key]) map[key] = {qty:0, rev:0, prof:0};
    map[key].qty += Number(s.qty) || 0;
    map[key].rev += Number(s.totalRevenue) || 0;
    map[key].prof += Number(s.totalProfit) || 0;
  });

  const keys = Object.keys(map).sort().reverse();
  if (!keys.length) {
    box.innerHTML = '<div class="small" style="text-align:center">No sales in this period.</div>';
    return;
  }

  box.innerHTML = '';
  keys.forEach(k => {
    const r = map[k];
    const c = (r.prof >= 0) ? 'green' : 'red';
    const html =
      '<div class="dayRow">' +
        '<div>' +
          '<div class="dayLeft">' + k + '</div>' +
          '<div class="small">Sold: ' + fmt(r.qty) + '</div>' +
        '</div>' +
        '<div class="dayRight">' +
          '<div class="small">Revenue</div>' +
          '<div><b>' + fmt(r.rev) + '</b> MMK</div>' +
          '<div class="small">Profit</div>' +
          '<div style="color:' + c + ';font-weight:900">' + fmt(r.prof) + ' MMK</div>' +
        '</div>' +
      '</div>';
    box.insertAdjacentHTML('beforeend', html);
  });
}

showPage('home');
