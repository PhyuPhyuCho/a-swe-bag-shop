// --- Cache fix: unregister any old service worker (if any) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(()=>{});
}

// Storage
let items = JSON.parse(localStorage.getItem("items")||"[]");
let sales = JSON.parse(localStorage.getItem("sales")||"[]");
let period = "today";
let currentFilter = "all";
let currentCategory = "bag";

function saveAll(){
  localStorage.setItem("items", JSON.stringify(items));
  localStorage.setItem("sales", JSON.stringify(sales));
}

// FAB + navigation
function setFab(enabled){
  document.body.classList.toggle('showFab', !!enabled);
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');

  const fabPages = ['list','discounts','profit'];
  setFab(fabPages.includes(id));

  window.scrollTo({top:0, behavior:'smooth'});
}

function goHome(){ showPage('home'); }

function openList(cat){
  currentCategory = cat || 'bag';
  const title = (currentCategory==='clothes') ? 'Clothes List' : 'Bag List';
  const hint  = (currentCategory==='clothes') ? 'Clothes inventory' : 'Bag inventory';
  document.getElementById('listTitle').textContent = title;
  document.getElementById('listHint').textContent  = hint;
  showPage('list');
  renderList('all');
}

function openProfit(){
  showPage('profit');
  renderDashboard();
}
function openDiscounts(){
  showPage('discounts');
  renderDiscounts();
}

// Helpers
function fmt(n){ return (n||0).toLocaleString('en-US'); }
function nextDiscountId(){
  const ds=items.filter(x=>x.discounted).map(x=>Number(String(x.id).replace('D',''))||0);
  return 'D'+String((Math.max(0,...ds)+1)).padStart(3,'0');
}

// Add item
function addItem(){
  const file = document.getElementById('photo').files[0];
  const category = document.getElementById('category').value || 'bag';
  let name = (document.getElementById('name').value||'').trim();

  const qty  = Number(document.getElementById('qty').value);
  const cost = Number(document.getElementById('cost').value);
  const price= Number(document.getElementById('price').value);

  if(!qty || qty < 0) return alert('Enter quantity');
  if(!cost && cost !== 0) return alert('Enter cost');
  if(!price && price !== 0) return alert('Enter sell price');

  const allNormal = items.filter(x=>!x.discounted);
  const id = 'I' + String(allNormal.length+1).padStart(3,'0');

  if(!name) name = 'Item ' + id;

  const commit = (photo)=>{
    items.push({
      id, name, category,
      qty, cost, price,
      photo: photo||'',
      discounted:false,
      parentId:null,
      createdAt:new Date().toISOString()
    });
    saveAll();
    alert('Saved ✅');

    document.getElementById('photo').value='';
    document.getElementById('name').value='';
    document.getElementById('qty').value='';
    document.getElementById('cost').value='';
    document.getElementById('price').value='';

    openList(category);
  };

  if(file){
    const r=new FileReader();
    r.onload=()=>commit(r.result);
    r.readAsDataURL(file);
  } else {
    commit('');
  }
}

// List
function renderList(filter){
  currentFilter = filter || 'all';
  const wrap = document.getElementById('itemList');
  wrap.innerHTML = '';

  const normal = items
    .filter(x=>!x.discounted)
    .filter(x=>(x.category||'bag')===currentCategory)
    .filter(it=>{
      if(currentFilter==='instock') return it.qty>0;
      if(currentFilter==='soldout') return it.qty<=0;
      return true;
    });

  if(!normal.length){
    wrap.innerHTML = '<div class="small" style="text-align:center">No items</div>';
    return;
  }

  normal.forEach(it=>{
    const unitProfit = it.price - it.cost;
    const isSoldOut = (Number(it.qty)||0) <= 0;
    wrap.innerHTML += `
      <div class="itemCard ${isSoldOut?'soldOutCard':''}">
        ${it.photo ? `<img src="${it.photo}">` : `<div style="aspect-ratio:1/1;background:rgba(107,78,255,.12)"></div>`}
        <div class="itemInfo">
          <div class="itemTop">
            <div>
              <div style="font-weight:900">${it.name}${isSoldOut?'<span class="soldOutBadge">SOLD OUT</span>':''}</div>
              <span class="badge">${it.id}</span>
            </div>
            <div class="qtyBig ${isSoldOut?'soldOutQty':''}">${fmt(it.qty)}</div>
          </div>
          <div style="margin-top:6px" class="small">
            Unit Cost: <b>${fmt(it.cost)}</b> • Unit Sell: <b>${fmt(it.price)}</b><br>
            <span style="color:${unitProfit>=0?'green':'red'};font-weight:900">Unit Profit: ${fmt(unitProfit)}</span>
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

// Qty modal
let pendingAction=null;

function openQtyModal({title,maxQty,mode,onConfirm}){
  pendingAction = onConfirm;
  document.getElementById('qtyTitle').textContent = title;

  const extra = document.getElementById('qtyExtra');
  extra.classList.toggle('hidden', mode !== 'discount');
  if(mode === 'discount') document.getElementById('discountPriceInput').value = '';

  const grid = document.getElementById('qtyGrid');
  grid.innerHTML = '';

  const m = Number(maxQty) || 0;
  if(m <= 0){
    grid.innerHTML = '<div class="small" style="padding:8px;text-align:center">No stock</div>';
  } else {
    const maxButtons = Math.min(12, m);
    for(let i=1;i<=maxButtons;i++){
      const b=document.createElement('button');
      b.className='qtyBtn';
      b.textContent=i;
      b.onclick=()=>confirmQty(i);
      grid.appendChild(b);
    }
    if(m > 12){
      const b=document.createElement('button');
      b.className='qtyBtn';
      b.textContent='+';
      b.onclick=()=>{
        const q=prompt(`Enter quantity (1-${m})`);
        if(q===null) return;
        const n=Number(q);
        if(!n || n<1 || n>m) return alert('Invalid');
        confirmQty(n);
      };
      grid.appendChild(b);
    }
    const all=document.createElement('button');
    all.className='qtyBtn primary';
    all.textContent=`All (${m})`;
    all.onclick=()=>confirmQty('all');
    grid.appendChild(all);
  }

  document.getElementById('qtyModal').classList.remove('hidden');
}

function closeQty(){
  document.getElementById('qtyModal').classList.add('hidden');
  pendingAction = null;
}

function confirmQty(qty){
  let discountPrice = null;

  if(!document.getElementById('qtyExtra').classList.contains('hidden')){
    discountPrice = Number(document.getElementById('discountPriceInput').value);
    if(!discountPrice && discountPrice !== 0) return alert('Enter discount price');
  }

  const cb = pendingAction;
  closeQty();
  if(cb) cb({ qty, discountPrice });
}

// Sell / Discount
function sellNormal(id){
  const it = items.find(x=>x.id===id && !x.discounted);
  if(!it || it.qty<=0) return alert('No stock');

  openQtyModal({
    title:`Sell quantity (In stock: ${it.qty})`,
    maxQty: it.qty,
    mode:'sell',
    onConfirm: ({qty})=>{
      const q = (qty==='all') ? it.qty : Number(qty);
      const rev = it.price * q;
      const prof= (it.price - it.cost) * q;

      it.qty -= q;

      sales.push({
        ts:new Date().toISOString(),
        itemId:it.id,
        itemName:it.name,
        category:(it.category||'bag'),
        qty:q,
        unitPrice:it.price,
        unitCost:it.cost,
        totalRevenue:rev,
        totalProfit:prof,
        saleType:'normal'
      });

      saveAll();
      alert('Sold ✅');
      renderList(currentFilter);
      renderDashboard();
    }
  });
}

function discountSplit(id){
  const it = items.find(x=>x.id===id && !x.discounted);
  if(!it || it.qty<=0) return alert('No stock');

  openQtyModal({
    title:`Discount quantity (In stock: ${it.qty})`,
    maxQty: it.qty,
    mode:'discount',
    onConfirm: ({qty,discountPrice})=>{
      const q = (qty==='all') ? it.qty : Number(qty);
      it.qty -= q;

      items.push({
        id: nextDiscountId(),
        parentId: it.id,
        name: it.name,
        category:(it.category||'bag'),
        qty: q,
        cost: it.cost,
        price: discountPrice,
        photo: it.photo||'',
        discounted:true,
        createdAt:new Date().toISOString()
      });

      saveAll();
      openDiscounts();
      renderDashboard();
    }
  });
}

// Discounts
function renderDiscounts(){
  const wrap = document.getElementById('discountList');
  wrap.innerHTML = '';

  const ds = items.filter(x=>x.discounted && x.qty>0);
  if(!ds.length){
    wrap.innerHTML = '<div class="small" style="text-align:center">No discount items</div>';
    return;
  }

  ds.forEach(it=>{
    const unitProfit = it.price - it.cost;
    const catTag = (it.category==='clothes') ? '👗' : '👜';

    wrap.innerHTML += `
      <div class="itemCard">
        ${it.photo ? `<img src="${it.photo}">` : `<div style="aspect-ratio:1/1;background:rgba(107,78,255,.12)"></div>`}
        <div class="itemInfo">
          <div class="itemTop">
            <div>
              <div style="font-weight:900">${catTag} ${it.name}<span class="discountTag">DISCOUNT</span></div>
              <span class="badge">${it.id}</span>
            </div>
            <div class="qtyBig ${isSoldOut?'soldOutQty':''}">${fmt(it.qty)}</div>
          </div>
          <div class="small" style="margin-top:6px">
            Discount: <b>${fmt(it.price)}</b> • Cost: <b>${fmt(it.cost)}</b><br>
            <span style="color:${unitProfit>=0?'green':'red'};font-weight:900">Unit Profit: ${fmt(unitProfit)}</span>
          </div>
          <div class="rowBtns">
            <button onclick="sellDiscount('${it.id}')">Sell</button>
          </div>
        </div>
      </div>
    `;
  });
}

function sellDiscount(id){
  const it = items.find(x=>x.id===id && x.discounted);
  if(!it || it.qty<=0) return alert('No stock');

  openQtyModal({
    title:`Sell discount qty (In stock: ${it.qty})`,
    maxQty: it.qty,
    mode:'sell',
    onConfirm: ({qty})=>{
      const q = (qty==='all') ? it.qty : Number(qty);
      const rev = it.price * q;
      const prof= (it.price - it.cost) * q;

      it.qty -= q;

      sales.push({
        ts:new Date().toISOString(),
        itemId:it.id,
        itemName:it.name+' (Discount)',
        category:(it.category||'bag'),
        qty:q,
        unitPrice:it.price,
        unitCost:it.cost,
        totalRevenue:rev,
        totalProfit:prof,
        saleType:'discount'
      });

      saveAll();
      alert('Sold ✅');
      renderDiscounts();
      renderDashboard();
    }
  });
}

// Profit
function sameDay(a,b){return a.getFullYear()==b.getFullYear()&&a.getMonth()==b.getMonth()&&a.getDate()==b.getDate();}
function sameMonth(a,b){return a.getFullYear()==b.getFullYear()&&a.getMonth()==b.getMonth();}
function sameYear(a,b){return a.getFullYear()==b.getFullYear();}

function setPeriod(p){ period=p; renderDashboard(); }

function renderDashboard(){
  const now=new Date(); let sq=0,rv=0,pf=0;

  sales.forEach(s=>{
    const d=new Date(s.ts);
    const ok=(period==='today'&&sameDay(d,now))||(period==='month'&&sameMonth(d,now))||(period==='year'&&sameYear(d,now));
    if(!ok) return;
    sq += s.qty;
    rv += s.totalRevenue;
    pf += s.totalProfit;
  });

  document.getElementById('soldQty').textContent=fmt(sq);
  document.getElementById('revenue').textContent=fmt(rv);

  const pv=document.getElementById('profitVal');
  pv.textContent=fmt(pf);
  pv.style.color = pf>=0 ? 'green' : 'red';

  drawChart();
  renderDailyBreakdown();
}

function drawChart(){
  const c=document.getElementById('profitChart'); if(!c) return;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);

  const year=new Date().getFullYear();
  const p=Array(12).fill(0);

  sales.forEach(s=>{
    const d=new Date(s.ts);
    if(d.getFullYear()===year) p[d.getMonth()] += s.totalProfit;
  });

  const pad=20,w=c.width-pad*2,h=c.height-pad*2,zero=pad+h/2,max=Math.max(1,...p.map(v=>Math.abs(v)));
  ctx.beginPath(); ctx.moveTo(pad,zero); ctx.lineTo(c.width-pad,zero); ctx.stroke();

  const gap=w/12,bw=gap*0.6;
  p.forEach((v,i)=>{
    const bh=(Math.abs(v)/max)*(h/2-6);
    const x=pad+i*gap+(gap-bw)/2;
    const y=v>=0?zero-bh:zero;
    ctx.fillStyle=v>=0?'green':'red';
    ctx.fillRect(x,y,bw,bh);
  });
}

// Daily breakdown
function ymd(d){
  const x=new Date(d);
  const y=x.getFullYear();
  const m=String(x.getMonth()+1).padStart(2,'0');
  const dd=String(x.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function inPeriod(dateObj){
  const now=new Date();
  if(period==='today') return sameDay(dateObj, now);
  if(period==='month') return sameMonth(dateObj, now);
  return sameYear(dateObj, now);
}
function renderDailyBreakdown(){
  const box=document.getElementById('dailyList');
  if(!box) return;

  const map={};
  sales.forEach(s=>{
    const d=new Date(s.ts);
    if(!inPeriod(d)) return;
    const key=ymd(d);
    if(!map[key]) map[key]={qty:0, rev:0, prof:0};
    map[key].qty += s.qty;
    map[key].rev += s.totalRevenue;
    map[key].prof+= s.totalProfit;
  });

  const dates=Object.keys(map).sort().reverse();
  if(!dates.length){
    box.innerHTML = `<div class="small" style="text-align:center">No sales in this period.</div>`;
    return;
  }

  box.innerHTML = dates.map(dt=>{
    const r=map[dt];
    const c=r.prof>=0?'green':'red';
    return `
      <div class="dayRow">
        <div>
          <div class="dayLeft">${dt}</div>
          <div class="small">Sold: ${fmt(r.qty)}</div>
        </div>
        <div class="dayRight">
          <div class="small">Revenue</div>
          <div><b>${fmt(r.rev)}</b> MMK</div>
          <div class="small">Profit</div>
          <div style="color:${c};font-weight:900">${fmt(r.prof)} MMK</div>
        </div>
      </div>
    `;
  }).join('');
}

// init
showPage('home');
