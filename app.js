const LS = "MARKET_POS_PRO_DATA_V1";

const defaultData = {
  user: { username: "admin", password: "1234", shopName: "Market POS Pro", phone: "0770 000 0000" },
  products: [
    {id: crypto.randomUUID(), barcode:"1001", name:"نان", category:"خواردن", price:500, cost:350, stock:80, minStock:10},
    {id: crypto.randomUUID(), barcode:"1002", name:"شیر", category:"خواردن", price:1000, cost:750, stock:40, minStock:8},
    {id: crypto.randomUUID(), barcode:"1003", name:"چای", category:"خواردن", price:1500, cost:1000, stock:30, minStock:5},
    {id: crypto.randomUUID(), barcode:"1004", name:"ئاو", category:"خواردن", price:250, cost:150, stock:120, minStock:20}
  ],
  customers: [],
  sales: []
};

let data = loadData();
let state = { page:"pos", cart:[], logged:false, editingProduct:null };

function loadData(){
  const raw = localStorage.getItem(LS);
  if(!raw){ localStorage.setItem(LS, JSON.stringify(defaultData)); return structuredClone(defaultData); }
  try { return JSON.parse(raw); } catch { return structuredClone(defaultData); }
}
function save(){ localStorage.setItem(LS, JSON.stringify(data)); }
function money(n){ return Number(n||0).toLocaleString() + " IQD"; }
function today(){ return new Date().toISOString().slice(0,10); }
function month(){ return new Date().toISOString().slice(0,7); }
function byId(id){ return document.getElementById(id); }

function render(){
  const app = byId("app");
  if(!state.logged){
    app.innerHTML = `
      <div class="login card">
        <h2>چوونەژوورەوە</h2>
        <p class="muted">سیستەمی کاشێری مارکێت</p>
        <label>Username</label><input id="loginUser" value="admin">
        <label>Password</label><input id="loginPass" type="password" value="1234">
        <button onclick="login()" style="margin-top:12px">Login</button>
      </div>`;
    return;
  }

  app.innerHTML = `
  <div class="app">
    <div class="topbar">
      <div class="brand">${data.user.shopName}</div>
      <div class="actions">
        <span class="badge">${new Date().toLocaleDateString()}</span>
        <button class="secondary" onclick="logout()">Logout</button>
      </div>
    </div>
    <div class="layout">
      <div class="sidebar">
        ${nav("pos","🧾 فرۆشتن")}
        ${nav("products","📦 کاڵاکان")}
        ${nav("customers","👥 کڕیار/قەرز")}
        ${nav("reports","📊 ڕاپۆرت")}
        ${nav("settings","⚙️ ڕێکخستن")}
      </div>
      <div class="content">${pageHtml()}</div>
    </div>
  </div>
  <div id="printArea" class="hidden"></div>`;
  afterRender();
}
function nav(p,t){ return `<button class="navbtn ${state.page===p?'active':''}" onclick="go('${p}')">${t}</button>`; }
function go(p){ state.page=p; render(); }
function login(){
  const u=byId("loginUser").value.trim(), p=byId("loginPass").value;
  if(u===data.user.username && p===data.user.password){ state.logged=true; render(); }
  else alert("Username یان Password هەڵەیە");
}
function logout(){ state.logged=false; render(); }

function pageHtml(){
  if(state.page==="pos") return posHtml();
  if(state.page==="products") return productsHtml();
  if(state.page==="customers") return customersHtml();
  if(state.page==="reports") return reportsHtml();
  return settingsHtml();
}

function posHtml(){
  const total = state.cart.reduce((s,i)=>s+i.qty*i.price,0);
  return `
  <div class="grid two">
    <div class="card">
      <h2>فرۆشتن / POS</h2>
      <div class="row">
        <input id="scanInput" placeholder="بارکۆد یان ناوی کاڵا بنووسە">
        <button onclick="addScan()">زیادکردن</button>
      </div>
      <div class="tablewrap" style="margin-top:12px">
        <table>
          <thead><tr><th>کاڵا</th><th>دانە</th><th>نرخ</th><th>کۆ</th><th></th></tr></thead>
          <tbody>${state.cart.map((i,idx)=>`
            <tr>
              <td>${i.name}</td>
              <td><input style="width:80px" type="number" value="${i.qty}" min="1" onchange="setQty(${idx},this.value)"></td>
              <td>${money(i.price)}</td>
              <td>${money(i.qty*i.price)}</td>
              <td><button class="red" onclick="removeCart(${idx})">X</button></td>
            </tr>`).join("") || `<tr><td colspan="5" class="muted">سەبەتە بەتاڵە</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h2>پارەدان</h2>
      <div class="kpi">${money(total)}</div>
      <label>داشکاندن</label><input id="discount" type="number" value="0">
      <label>شێوازی پارەدان</label>
      <select id="payType" onchange="toggleCustomer()">
        <option value="cash">Cash</option>
        <option value="debt">Debt / قەرز</option>
      </select>
      <div id="customerBox" class="hidden">
        <label>کڕیار</label><select id="customerSelect">${data.customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}</select>
      </div>
      <label>پارەی وەرگیراو</label><input id="paid" type="number" value="${total}">
      <div class="actions" style="margin-top:12px">
        <button class="green" onclick="checkout()">فرۆشتن</button>
        <button class="secondary" onclick="clearCart()">پاککردنەوە</button>
      </div>
    </div>
  </div>`;
}
function afterRender(){
  const s=byId("scanInput"); if(s) s.focus();
}
function addScan(){
  const q=byId("scanInput").value.trim().toLowerCase();
  if(!q) return;
  const p=data.products.find(x=>x.barcode.toLowerCase()===q || x.name.toLowerCase().includes(q));
  if(!p) return alert("کاڵا نەدۆزرایەوە");
  if(p.stock<=0) return alert("ئەم کاڵایە لە ستۆکدا نەماوە");
  const item=state.cart.find(x=>x.id===p.id);
  if(item){ if(item.qty+1>p.stock) return alert("ستۆک بەس نییە"); item.qty++; }
  else state.cart.push({id:p.id, name:p.name, price:Number(p.price), cost:Number(p.cost||0), qty:1});
  render();
}
function setQty(idx,v){
  const qty=Math.max(1,Number(v||1));
  const p=data.products.find(x=>x.id===state.cart[idx].id);
  if(qty>p.stock){ alert("ستۆک بەس نییە"); render(); return; }
  state.cart[idx].qty=qty; render();
}
function removeCart(i){ state.cart.splice(i,1); render(); }
function clearCart(){ state.cart=[]; render(); }
function toggleCustomer(){ byId("customerBox").classList.toggle("hidden", byId("payType").value!=="debt"); }

function checkout(){
  if(!state.cart.length) return alert("سەبەتە بەتاڵە");
  const subtotal=state.cart.reduce((s,i)=>s+i.qty*i.price,0);
  const discount=Number(byId("discount").value||0);
  const total=Math.max(0, subtotal-discount);
  const paid=Number(byId("paid").value||0);
  const payType=byId("payType").value;
  if(payType==="cash" && paid<total) return alert("پارەی وەرگیراو کەمە");
  if(payType==="debt" && !data.customers.length) return alert("سەرەتا کڕیار زیاد بکە");
  const sale={
    id: Date.now().toString(),
    date: new Date().toISOString(),
    items: structuredClone(state.cart),
    subtotal, discount, total, paid: payType==="debt"?0:paid,
    change: payType==="cash"?paid-total:0,
    payType,
    customerId: payType==="debt" ? byId("customerSelect").value : null
  };
  sale.items.forEach(it=>{
    const p=data.products.find(x=>x.id===it.id);
    if(p) p.stock-=it.qty;
  });
  if(payType==="debt"){
    const c=data.customers.find(x=>x.id===sale.customerId);
    if(c) c.debt = Number(c.debt||0)+total;
  }
  data.sales.unshift(sale);
  save();
  printReceipt(sale);
  state.cart=[];
  render();
}
function printReceipt(sale){
  const shop=data.user.shopName;
  const lines=sale.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${money(i.qty*i.price)}</td></tr>`).join("");
  byId("printArea").innerHTML=`
  <div class="receipt">
    <h3 style="text-align:center">${shop}</h3>
    <p>Receipt: ${sale.id}</p>
    <p>Date: ${new Date(sale.date).toLocaleString()}</p>
    <hr>
    <table>${lines}</table>
    <hr>
    <p>Subtotal: ${money(sale.subtotal)}</p>
    <p>Discount: ${money(sale.discount)}</p>
    <h3>Total: ${money(sale.total)}</h3>
    <p>Paid: ${money(sale.paid)}</p>
    <p>Change: ${money(sale.change)}</p>
    <p style="text-align:center">Thank you</p>
  </div>`;
  window.print();
}

function productsHtml(){
  return `
  <div class="grid two">
    <div class="card">
      <h2>${state.editingProduct?'دەستکاریکردنی کاڵا':'زیادکردنی کاڵا'}</h2>
      <label>بارکۆد</label><input id="pBarcode">
      <label>ناو</label><input id="pName">
      <label>جۆر</label><input id="pCategory">
      <div class="row">
        <div><label>نرخی فرۆشتن</label><input id="pPrice" type="number"></div>
        <div><label>نرخی کڕین</label><input id="pCost" type="number"></div>
      </div>
      <div class="row">
        <div><label>ستۆک</label><input id="pStock" type="number"></div>
        <div><label>ئاگاداری ستۆک</label><input id="pMin" type="number" value="5"></div>
      </div>
      <div class="actions" style="margin-top:12px">
        <button class="green" onclick="saveProduct()">هەڵگرتن</button>
        <button class="secondary" onclick="state.editingProduct=null;render()">نوێ</button>
      </div>
    </div>
    <div class="card">
      <h2>کاڵاکان</h2>
      <input id="prodSearch" placeholder="گەڕان..." oninput="renderProductsTable()">
      <div id="productsTable" style="margin-top:12px"></div>
    </div>
  </div>`;
}
function renderProductsTable(){
  const q=(byId("prodSearch")?.value||"").toLowerCase();
  const rows=data.products.filter(p=>p.name.toLowerCase().includes(q)||p.barcode.includes(q)).map(p=>`
  <tr>
    <td>${p.barcode}</td><td>${p.name}</td><td>${money(p.price)}</td>
    <td><span class="badge ${p.stock<=p.minStock?'low':''}">${p.stock}</span></td>
    <td><button class="blue" onclick="editProduct('${p.id}')">Edit</button></td>
  </tr>`).join("");
  byId("productsTable").innerHTML=`<div class="tablewrap"><table><thead><tr><th>Barcode</th><th>ناو</th><th>نرخ</th><th>ستۆک</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function saveProduct(){
  const p={
    id: state.editingProduct || crypto.randomUUID(),
    barcode: byId("pBarcode").value.trim(),
    name: byId("pName").value.trim(),
    category: byId("pCategory").value.trim(),
    price: Number(byId("pPrice").value||0),
    cost: Number(byId("pCost").value||0),
    stock: Number(byId("pStock").value||0),
    minStock: Number(byId("pMin").value||0)
  };
  if(!p.barcode||!p.name||!p.price) return alert("بارکۆد، ناو و نرخ پێویستن");
  const exists=data.products.find(x=>x.barcode===p.barcode && x.id!==p.id);
  if(exists) return alert("ئەم بارکۆدە پێشتر هەیە");
  const idx=data.products.findIndex(x=>x.id===p.id);
  if(idx>=0) data.products[idx]=p; else data.products.unshift(p);
  state.editingProduct=null; save(); render();
}
function editProduct(id){
  state.editingProduct=id; render();
  const p=data.products.find(x=>x.id===id);
  byId("pBarcode").value=p.barcode; byId("pName").value=p.name; byId("pCategory").value=p.category||"";
  byId("pPrice").value=p.price; byId("pCost").value=p.cost; byId("pStock").value=p.stock; byId("pMin").value=p.minStock||0;
}

function customersHtml(){
  return `
  <div class="grid two">
    <div class="card">
      <h2>کڕیار</h2>
      <label>ناو</label><input id="cName">
      <label>ژمارەی مۆبایل</label><input id="cPhone">
      <button class="green" style="margin-top:12px" onclick="addCustomer()">زیادکردن</button>
    </div>

    <div class="card">
      <h2>قەرزەکان</h2>
      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>ناو</th>
              <th>مۆبایل</th>
              <th>قەرز</th>
              <th>پارەدان</th>
              <th>Delete</th>
            </tr>
          </thead>

          <tbody>
          ${data.customers.map(c=>`
            <tr>
              <td>${c.name}</td>
              <td>${c.phone || ""}</td>
              <td>
                <input 
                  type="number"
                  value="${c.debt || 0}"
                  onchange="updateDebt('${c.id}', this.value)"
                  style="width:100px"
                >
              </td>

              <td>
                <button class="green"
                onclick="payDebt('${c.id}')">
                پارەدان
                </button>
              </td>

              <td>
                <button class="red"
                onclick="deleteCustomer('${c.id}')">
                Delete
                </button>
              </td>
            </tr>
          `).join("")}
          </tbody>

        </table>
      </div>
    </div>
  </div>`;
}

function addCustomer(){
  const name = byId("cName").value.trim();
  if(!name) return alert("ناو بنووسە");

  data.customers.unshift({
    id: crypto.randomUUID(),
    name,
    phone: byId("cPhone").value.trim(),
    debt:0
  });

  save();
  render();
}

function updateDebt(id,value){
  const c=data.customers.find(x=>x.id===id);
  if(!c) return;

  c.debt = Number(value || 0);

  save();
}

function deleteCustomer(id){
  if(!confirm("دڵنیایت؟")) return;

  data.customers =
  data.customers.filter(x=>x.id!==id);

  save();
  render();
}

function payDebt(id){
  const c=data.customers.find(x=>x.id===id);

  const amount=
  Number(prompt("بڕی پارەدان:", c.debt)||0);

  if(amount>0){
    c.debt=Math.max(
      0,
      Number(c.debt||0)-amount
    );

    save();
    render();
  }
}

function reportsHtml(){
  const daySales=data.sales.filter(s=>s.date.slice(0,10)===today());
  const monthSales=data.sales.filter(s=>s.date.slice(0,7)===month());
  const totalDay=daySales.reduce((s,x)=>s+x.total,0);
  const profitDay=daySales.reduce((s,x)=>s+x.items.reduce((a,i)=>a+(i.price-i.cost)*i.qty,0)-x.discount,0);
  const totalMonth=monthSales.reduce((s,x)=>s+x.total,0);
  return `
  <div class="grid three">
    <div class="card"><div class="muted">فرۆشتنی ئەمڕۆ</div><div class="kpi">${money(totalDay)}</div></div>
    <div class="card"><div class="muted">قازانجی ئەمڕۆ</div><div class="kpi">${money(profitDay)}</div></div>
    <div class="card"><div class="muted">فرۆشتنی مانگ</div><div class="kpi">${money(totalMonth)}</div></div>
  </div>
  <div class="card" style="margin-top:14px">
    <h2>دوایین فرۆشتنەکان</h2>
    <div class="tablewrap"><table>
      <thead><tr><th>ژمارە</th><th>کات</th><th>جۆر</th><th>کۆ</th></tr></thead>
      <tbody>${data.sales.slice(0,100).map(s=>`<tr><td>${s.id}</td><td>${new Date(s.date).toLocaleString()}</td><td>${s.payType}</td><td>${money(s.total)}</td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}
function settingsHtml(){
  return `
  <div class="grid two">
    <div class="card">
      <h2>ڕێکخستنی دوکان</h2>
      <label>ناوی دوکان</label><input id="shopName" value="${data.user.shopName}">
      <label>مۆبایل</label><input id="shopPhone" value="${data.user.phone}">
      <label>Password نوێ</label><input id="newPass" placeholder="بەتاڵی بهێڵە ئەگەر ناگۆڕیت">
      <button class="green" style="margin-top:12px" onclick="saveSettings()">هەڵگرتن</button>
    </div>
    <div class="card">
      <h2>Backup</h2>
      <div class="actions">
        <button class="blue" onclick="exportBackup()">Export Backup</button>
        <button class="amber" onclick="byId('importFile').click()">Import Backup</button>
        <input id="importFile" type="file" accept=".json" class="hidden" onchange="importBackup(event)">
      </div>
      <p class="muted">بۆ مەرکێت گرنگە هەفتانە Backup بکەیت.</p>
      <button class="red" onclick="resetAll()">Reset System</button>
    </div>
  </div>`;
}
function saveSettings(){
  data.user.shopName=byId("shopName").value.trim()||"Market POS Pro";
  data.user.phone=byId("shopPhone").value.trim();
  const np=byId("newPass").value; if(np) data.user.password=np;
  save(); render();
}
function exportBackup(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="market-pos-backup.json"; a.click();
}
function importBackup(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ data=JSON.parse(r.result); save(); alert("Backup گەڕایەوە"); render(); }catch{ alert("فایل هەڵەیە"); } };
  r.readAsText(f);
}
function resetAll(){
  if(confirm("دڵنیایت هەموو داتا بسڕدرێتەوە؟")){
    localStorage.removeItem(LS); data=loadData(); state.cart=[]; render();
  }
}

if("serviceWorker" in navigator){ navigator.serviceWorker.register("./service-worker.js"); }
render();