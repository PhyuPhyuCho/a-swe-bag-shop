// Storage
let items = JSON.parse(localStorage.getItem("items")||"[]");
let sales = JSON.parse(localStorage.getItem("sales")||"[]");
let period = "today";
let currentFilter = "all";
function saveAll(){localStorage.setItem("items",JSON.stringify(items));localStorage.setItem("sales",JSON.stringify(sales));}

// Nav
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');}
function goHome(){showPage('home');}
function openList(){showPage('list');renderList('all');}
function openProfit(){showPage('profit');renderDashboard();}
function openDiscounts(){showPage('discounts');renderDiscounts();}

// Helpers
function fmt(n){return (n||0).toLocaleString('en-US');}
function nextItemId(){return 'I'+String(items.filter(x=>!x.discounted).length+1).padStart(3,'0');}
function nextDiscountId(){const ds=items.filter(x=>x.discounted).map(x=>Number(x.id.replace('D',''))||0);return 'D'+String((Math.max(0,...ds)+1)).padStart(3,'0');}

// Add item
function addItem(){
  const file=document.getElementById('photo').files[0];
  let name=(document.getElementById('name').value||'').trim();
  const qty=Number(document.getElementById('qty').value);
  const cost=Number(document.getElementById('cost').value);
  const price=Number(document.getElementById('price').value);
  if(!qty||qty<0) return alert('Enter quantity');
  if(!cost) return alert('Enter cost');
  if(!price) return alert('Enter sell price');
  const id=nextItemId();
  if(!name) name='Item '+id;
  const commit=(photo)=>{
    items.push({id,name,qty,cost,price,photo:photo||'',discounted:false,parentId:null,createdAt:new Date().toISOString()});
    saveAll(); alert('Saved');
    document.getElementById('photo').value='';
    document.getElementById('name').value='';
    document.getElementById('qty').value='';
    document.getElementById('cost').value='';
    document.getElementById('price').value='';
    openList();
  };
  if(file){const r=new FileReader(); r.onload=()=>commit(r.result); r.readAsDataURL(file);} else commit('');
}

// List
function renderList(filter){
  currentFilter=filter||'all';
  const wrap=document.getElementById('itemList'); wrap.innerHTML='';
  const normal=items.filter(x=>!x.discounted).filter(it=>{
    if(currentFilter==='instock') return it.qty>0;
    if(currentFilter==='soldout') return it.qty<=0;
    return true;
  });
  if(!normal.length){wrap.innerHTML='<div>No items</div>';return;}
  normal.forEach(it=>{
    const unitProfit=it.price-it.cost;
    wrap.innerHTML+=`
    <div class="itemCard">
      ${it.photo?`<img src="${it.photo}">`:`<div style="aspect-ratio:1/1;background:#efe8ff"></div>`}
      <div class="itemInfo">
        <div class="itemTop">
          <div><b>${it.name}</b><br><span class="badge">${it.id}</span></div>
          <div class="qtyBig">${fmt(it.qty)}</div>
        </div>
        <div style="margin-top:6px">
          Unit Cost: ${fmt(it.cost)}<br>
          Unit Sell: ${fmt(it.price)}<br>
          <span style="color:${unitProfit>=0?'green':'red'}">Unit Profit: ${fmt(unitProfit)}</span>
        </div>
        <div class="rowBtns">
          <button onclick="sellNormal('${it.id}')">Sell</button>
          <button class="ghost" onclick="discountSplit('${it.id}')">Discount</button>
        </div>
      </div>
    </div>`;
  });
}

// Qty modal (buttons picker)
let pendingAction=null;
function openQtyModal({title,maxQty,mode,onConfirm}){
  pendingAction=onConfirm;
  document.getElementById('qtyTitle').textContent=title;
  const extra=document.getElementById('qtyExtra');
  extra.classList.toggle('hidden',mode!=='discount');
  if(mode==='discount') document.getElementById('discountPriceInput').value='';
  const grid=document.getElementById('qtyGrid'); grid.innerHTML='';
  const m=Number(maxQty)||0;
  if(m<=0){grid.innerHTML='<div>No stock</div>';}
  else{
    const maxButtons=Math.min(12,m);
    for(let i=1;i<=maxButtons;i++){
      const b=document.createElement('button'); b.className='qtyBtn'; b.textContent=i;
      b.onclick=()=>confirmQty(i); grid.appendChild(b);
    }
    if(m>12){
      const b=document.createElement('button'); b.className='qtyBtn'; b.textContent='+';
      b.onclick=()=>{const q=prompt(`Enter quantity (1-${m})`); if(q===null) return; const n=Number(q); if(!n||n<1||n>m) return alert('Invalid'); confirmQty(n);};
      grid.appendChild(b);
    }
    const all=document.createElement('button'); all.className='qtyBtn primary'; all.textContent=`All (${m})`; all.onclick=()=>confirmQty('all'); grid.appendChild(all);
  }
  document.getElementById('qtyModal').classList.remove('hidden');
}
function closeQty(){document.getElementById('qtyModal').classList.add('hidden'); pendingAction=null;}
function confirmQty(qty){
  let discountPrice=null;
  if(!document.getElementById('qtyExtra').classList.contains('hidden')){
    discountPrice=Number(document.getElementById('discountPriceInput').value);
    if(!discountPrice&&discountPrice!==0) return alert('Enter discount price');
  }
  closeQty(); if(pendingAction) pendingAction({qty,discountPrice});
}

// Sell / Discount
function sellNormal(id){
  const it=items.find(x=>x.id===id&&!x.discounted); if(!it||it.qty<=0) return;
  openQtyModal({title:`Sell quantity (In stock: ${it.qty})`,maxQty:it.qty,mode:'sell',onConfirm:({qty})=>{
    const q=(qty==='all')?it.qty:Number(qty);
    const rev=it.price*q, prof=(it.price-it.cost)*q;
    it.qty-=q; sales.push({ts:new Date().toISOString(),itemId:it.id,itemName:it.name,qty:q,unitPrice:it.price,unitCost:it.cost,totalRevenue:rev,totalProfit:prof,saleType:'normal'});
    saveAll(); alert('Sold'); renderList(currentFilter); renderDashboard();
  }});
}
function discountSplit(id){
  const it=items.find(x=>x.id===id&&!x.discounted); if(!it||it.qty<=0) return;
  openQtyModal({title:`Discount quantity (In stock: ${it.qty})`,maxQty:it.qty,mode:'discount',onConfirm:({qty,discountPrice})=>{
    const q=(qty==='all')?it.qty:Number(qty); it.qty-=q;
    items.push({id:nextDiscountId(),parentId:it.id,name:it.name,qty:q,cost:it.cost,price:discountPrice,photo:it.photo||'',discounted:true,createdAt:new Date().toISOString()});
    saveAll(); openDiscounts(); renderDashboard();
  }});
}
function renderDiscounts(){
  const wrap=document.getElementById('discountList'); wrap.innerHTML='';
  const ds=items.filter(x=>x.discounted);
  if(!ds.length){wrap.innerHTML='<div>No discount items</div>'; return;}
  ds.forEach(it=>{
    const unitProfit=it.price-it.cost;
    wrap.innerHTML+=`
    <div class="itemCard">
      ${it.photo?`<img src="${it.photo}">`:`<div style="aspect-ratio:1/1;background:#efe8ff"></div>`}
      <div class="itemInfo">
        <div class="itemTop">
          <div><b>${it.name}</b><span class="discountTag">DISCOUNT</span></div>
          <div class="qtyBig">${fmt(it.qty)}</div>
        </div>
        <div>
          Discount: <b>${fmt(it.price)}</b><br>
          Cost: ${fmt(it.cost)}<br>
          <span style="color:${unitProfit>=0?'green':'red'}">Unit Profit: ${fmt(unitProfit)}</span>
        </div>
        <div class="rowBtns">
          <button onclick="sellDiscount('${it.id}')">Sell</button>
        </div>
      </div>
    </div>`;
  });
}
function sellDiscount(id){
  const it=items.find(x=>x.id===id&&x.discounted); if(!it||it.qty<=0) return;
  openQtyModal({title:`Sell discount qty (In stock: ${it.qty})`,maxQty:it.qty,mode:'sell',onConfirm:({qty})=>{
    const q=(qty==='all')?it.qty:Number(qty);
    const rev=it.price*q, prof=(it.price-it.cost)*q;
    it.qty-=q; sales.push({ts:new Date().toISOString(),itemId:it.id,itemName:it.name+' (Discount)',qty:q,unitPrice:it.price,unitCost:it.cost,totalRevenue:rev,totalProfit:prof,saleType:'discount'});
    saveAll(); alert('Sold'); renderDiscounts(); renderDashboard();
  }});
}

// Profit
function sameDay(a,b){return a.getFullYear()==b.getFullYear()&&a.getMonth()==b.getMonth()&&a.getDate()==b.getDate();}
function sameMonth(a,b){return a.getFullYear()==b.getFullYear()&&a.getMonth()==b.getMonth();}
function sameYear(a,b){return a.getFullYear()==b.getFullYear();}
function setPeriod(p){period=p; renderDashboard();}
function renderDashboard(){
  const now=new Date(); let sq=0,rv=0,pf=0;
  sales.forEach(s=>{const d=new Date(s.ts); const ok=(period==='today'&&sameDay(d,now))||(period==='month'&&sameMonth(d,now))||(period==='year'&&sameYear(d,now)); if(!ok) return; sq+=s.qty; rv+=s.totalRevenue; pf+=s.totalProfit;});
  document.getElementById('soldQty').textContent=fmt(sq);
  document.getElementById('revenue').textContent=fmt(rv);
  const pv=document.getElementById('profitVal'); pv.textContent=fmt(pf); pv.style.color=pf>=0?'green':'red';
  drawChart();
}
function drawChart(){
  const c=document.getElementById('profitChart'); if(!c) return; const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const year=new Date().getFullYear(); const p=Array(12).fill(0);
  sales.forEach(s=>{const d=new Date(s.ts); if(d.getFullYear()===year) p[d.getMonth()]+=s.totalProfit;});
  const pad=20,w=c.width-pad*2,h=c.height-pad*2,zero=pad+h/2,max=Math.max(1,...p.map(v=>Math.abs(v)));
  ctx.beginPath(); ctx.moveTo(pad,zero); ctx.lineTo(c.width-pad,zero); ctx.stroke();
  const gap=w/12,bw=gap*0.6;
  p.forEach((v,i)=>{const bh=(Math.abs(v)/max)*(h/2-6); const x=pad+i*gap+(gap-bw)/2; const y=v>=0?zero-bh:zero; ctx.fillStyle=v>=0?'green':'red'; ctx.fillRect(x,y,bw,bh);});
}
showPage('home');
