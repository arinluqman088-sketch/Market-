const ACCOUNTS_LS = "AR_GROUP_POS_ACCOUNTS_V2";
const DATA_PREFIX = "AR_GROUP_POS_DATA_V6_";
const defaultAccounts = [
  {
    key: "market1",
    username: "market1",
    password: "1111",
    shopName: "Market 1 POS",
    phone: "0770 000 0001"
  },
  {
    key: "market2",
    username: "market2",
    password: "2222",
    shopName: "Market 2 POS",
    phone: "0770 000 0002"
  }
];

function uid(){
  if(window.crypto && typeof window.crypto.randomUUID === "function"){
    return window.crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function clone(obj){
  if(typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function defaultDataForAccount(account){
  return {
    user: {
      username: account.username,
      password: account.password,
      shopName: account.shopName,
      phone: account.phone
    },
    products: [
      {id: uid(), barcode:"1001", name:"نان", category:"خواردن", price:500, cost:350, stock:80, minStock:10},
      {id: uid(), barcode:"1002", name:"شیر", category:"خواردن", price:1000, cost:750, stock:40, minStock:8},
      {id: uid(), barcode:"1003", name:"چای", category:"خواردن", price:1500, cost:1000, stock:30, minStock:5},
      {id: uid(), barcode:"1004", name:"ئاو", category:"خواردن", price:250, cost:150, stock:120, minStock:20}
    ],
    customers: [],
    sales: []
  };
}

let accounts = loadAccounts();
let currentAccount = null;
let data = null;

let state = {
  page: "dashboard",
  cart: [],
  logged: false,
  editingProduct: null
};

function loadAccounts(){
  const raw = localStorage.getItem(ACCOUNTS_LS);

  if(!raw){
    localStorage.setItem(ACCOUNTS_LS, JSON.stringify(defaultAccounts));
    return clone(defaultAccounts);
  }

  try{
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed) || parsed.length < 2){
      localStorage.setItem(ACCOUNTS_LS, JSON.stringify(defaultAccounts));
      return clone(defaultAccounts);
    }
    return parsed;
  }catch{
    localStorage.setItem(ACCOUNTS_LS, JSON.stringify(defaultAccounts));
    return clone(defaultAccounts);
  }
}

function saveAccounts(){
  localStorage.setItem(ACCOUNTS_LS, JSON.stringify(accounts));
}

function dataKey(){
  return DATA_PREFIX + currentAccount.key;
}

function loadData(){
  const raw = localStorage.getItem(dataKey());

  if(!raw){
    const fresh = defaultDataForAccount(currentAccount);
    localStorage.setItem(dataKey(), JSON.stringify(fresh));
    return clone(fresh);
  }

  try{
    const parsed = JSON.parse(raw);
    parsed.user = parsed.user || defaultDataForAccount(currentAccount).user;
    parsed.products = parsed.products || [];
    parsed.customers = parsed.customers || [];
    parsed.sales = parsed.sales || [];
    return parsed;
  }catch{
    const fresh = defaultDataForAccount(currentAccount);
    localStorage.setItem(dataKey(), JSON.stringify(fresh));
    return clone(fresh);
  }
}

function save(){
  if(currentAccount && data){
    localStorage.setItem(dataKey(), JSON.stringify(data));
  }
}

function byId(id){
  return document.getElementById(id);
}

function money(n){
  return Number(n || 0).toLocaleString() + " IQD";
}

function today(){
  return new Date().toISOString().slice(0, 10);
}

function month(){
  return new Date().toISOString().slice(0, 7);
}

function showMsg(text){
  alert(text);
}

function render(){
  const app = byId("app");

  if(!state.logged){
    app.innerHTML = `
      <div class="login-page">
        <div class="login card">
          <div class="logo-box">🛒</div>

          <h1>پەرەی پێدراوە لە لایەن گروپی AR group</h1>
          <p class="muted">سیستەمی کاشێری مارکێت و دوکان</p>

          <label>Username</label>
          <input id="loginUser" placeholder="Username" autocomplete="username">

          <label>Password</label>
          <input id="loginPass" type="password" value="" placeholder="Password" autocomplete="current-password">

          <button onclick="login()" style="margin-top:14px">Login</button>

          <div class="login-info">
            <div><b>Market 1:</b> market1 / 1111</div>
            <div><b>Market 2:</b> market2 / 2222</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="app">
      <div class="topbar">
        <div>
          <div class="brand">🛒 ${data.user.shopName}</div>
          <div class="muted small">Powered by AR Group</div>
        </div>

        <div class="actions">
          <span class="badge">${currentAccount.username}</span>
          <span class="badge">${new Date().toLocaleDateString()}</span>
          <button class="secondary" onclick="logout()">Logout</button>
        </div>
      </div>

      <div class="layout">
        <div class="sidebar">
          ${nav("dashboard","🏠 داشبۆرد")}
          ${nav("pos","🧾 فرۆشتن")}
          ${nav("products","📦 کاڵاکان")}
          ${nav("customers","👥 کڕیار / قەرز")}
          ${nav("reports","📊 ڕاپۆرت")}
          ${nav("settings","⚙️ ڕێکخستن")}
        </div>

        <div class="content">${pageHtml()}</div>
      </div>
    </div>

    <div id="printArea" class="hidden"></div>
  `;

  afterRender();
}

function nav(p,t){
  return `<button class="navbtn ${state.page === p ? "active" : ""}" onclick="go('${p}')">${t}</button>`;
}

function go(p){
  state.page = p;
  state.editingProduct = null;
  render();
}

function login(){
  const u = byId("loginUser").value.trim();
  const p = byId("loginPass").value;

  const found = accounts.find(acc => acc.username === u && acc.password === p);

  if(!found){
    showMsg("Username یان Password هەڵەیە");
    return;
  }

  currentAccount = found;
  data = loadData();

  data.user.username = currentAccount.username;
  data.user.password = currentAccount.password;
  data.user.shopName = currentAccount.shopName;
  data.user.phone = currentAccount.phone;
  save();

  state.logged = true;
  state.page = "dashboard";
  state.cart = [];
  state.editingProduct = null;

  render();
}

function logout(){
  state.logged = false;
  currentAccount = null;
  data = null;
  state.cart = [];
  render();
}

function pageHtml(){
  if(state.page === "dashboard") return dashboardHtml();
  if(state.page === "pos") return posHtml();
  if(state.page === "products") return productsHtml();
  if(state.page === "customers") return customersHtml();
  if(state.page === "reports") return reportsHtml();
  return settingsHtml();
}

function dashboardHtml(){
  const todaySales = data.sales.filter(s => s.date.slice(0,10) === today());
  const monthSales = data.sales.filter(s => s.date.slice(0,7) === month());

  const totalToday = todaySales.reduce((s,x) => s + Number(x.total || 0), 0);
  const totalMonth = monthSales.reduce((s,x) => s + Number(x.total || 0), 0);
  const stockValue = data.products.reduce((s,p) => s + Number(p.stock || 0) * Number(p.cost || 0), 0);
  const debtTotal = data.customers.reduce((s,c) => s + Number(c.debt || 0), 0);

  return `
    <div class="hero card">
      <div>
        <h1>بەخێربێیت 👋</h1>
        <p class="muted">هەموو فرۆشتن، کاڵا، ستۆک و قەرزەکانت لە یەک شوێن بەڕێوە ببە.</p>
      </div>
      <button onclick="go('pos')">+ فرۆشتنی نوێ</button>
    </div>

    <div class="grid four">
      <div class="card stat"><div class="muted">فرۆشتنی ئەمڕۆ</div><div class="kpi">${money(totalToday)}</div></div>
      <div class="card stat"><div class="muted">فرۆشتنی مانگ</div><div class="kpi">${money(totalMonth)}</div></div>
      <div class="card stat"><div class="muted">ژمارەی کاڵاکان</div><div class="kpi">${data.products.length}</div></div>
      <div class="card stat"><div class="muted">قەرزی کڕیاران</div><div class="kpi">${money(debtTotal)}</div></div>
    </div>

    <div class="grid two" style="margin-top:14px">
      <div class="card">
        <h2>کاڵای کەم لە ستۆک</h2>
        <div class="tablewrap">
          <table>
            <thead><tr><th>کاڵا</th><th>ستۆک</th><th>ئاگاداری</th></tr></thead>
            <tbody>
              ${
                data.products
                .filter(p => Number(p.stock) <= Number(p.minStock))
                .map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td><span class="badge low">${p.stock}</span></td>
                    <td>${p.minStock}</td>
                  </tr>
                `).join("") || `<tr><td colspan="3" class="muted">هیچ کاڵایەک کەم نییە</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>زانیاری ستۆک</h2>
        <div class="big-number">${money(stockValue)}</div>
        <p class="muted">نرخی گشتی کاڵاکانی ناو ستۆک بە نرخی کڕین.</p>
      </div>
    </div>
  `;
}

function posHtml(){
  const total = state.cart.reduce((s,i) => s + Number(i.qty) * Number(i.price), 0);

  return `
    <div class="grid two">
      <div class="card">
        <h2>فرۆشتن / POS</h2>

        <div class="row">
          <div class="searchBox">
            <input
              id="scanInput"
              placeholder="بارکۆد یان ناوی کاڵا بنووسە"
              autocomplete="off"
              onfocus="showScanOptions()"
              oninput="showScanOptions()"
              onkeydown="if(event.key==='Enter'){ addScan(); }"
            >
            <div id="scanOptions" class="scan-options hidden"></div>
          </div>

          <button onclick="addScan()">زیادکردن</button>
        </div>

        <div class="tablewrap" style="margin-top:12px">
          <table>
            <thead><tr><th>کاڵا</th><th>دانە</th><th>نرخ</th><th>کۆ</th><th></th></tr></thead>
            <tbody>
              ${
                state.cart.map((i,idx) => `
                  <tr>
                    <td>${i.name}</td>
                    <td><input style="width:80px" type="number" value="${i.qty}" min="1" onchange="setQty(${idx}, this.value)"></td>
                    <td>${money(i.price)}</td>
                    <td>${money(i.qty * i.price)}</td>
                    <td><button class="red" onclick="removeCart(${idx})">X</button></td>
                  </tr>
                `).join("") || `<tr><td colspan="5" class="muted">سەبەتە بەتاڵە</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>پارەدان</h2>
        <div class="kpi">${money(total)}</div>

        <label>داشکاندن</label>
        <input id="discount" type="number" value="0">

        <label>شێوازی پارەدان</label>
        <select id="payType" onchange="toggleCustomer()">
          <option value="cash">Cash</option>
          <option value="debt">Debt / قەرز</option>
        </select>

        <div id="customerBox" class="hidden">
          <label>کڕیار</label>
          <select id="customerSelect">
            ${data.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
          </select>
        </div>

        <label>پارەی وەرگیراو</label>
        <input id="paid" type="number" value="${total}">

        <div class="actions" style="margin-top:12px">
          <button class="green" onclick="checkout()">فرۆشتن</button>
          <button class="secondary" onclick="clearCart()">پاککردنەوە</button>
        </div>
      </div>
    </div>
  `;
}

function afterRender(){
  const s = byId("scanInput");
  if(s) s.focus();

  if(byId("productsTable")){
    renderProductsTable();
  }
}

document.addEventListener("click", function(e){
  const box = byId("scanOptions");
  const input = byId("scanInput");

  if(box && input && !input.contains(e.target) && !box.contains(e.target)){
    box.classList.add("hidden");
  }
});

function showScanOptions(){
  const input = byId("scanInput");
  const box = byId("scanOptions");
  if(!input || !box) return;

  const q = input.value.trim().toLowerCase();

  let list = data.products.filter(p =>
    String(p.name).toLowerCase().includes(q) ||
    String(p.barcode).toLowerCase().includes(q) ||
    String(p.category || "").toLowerCase().includes(q)
  );

  if(!q){
    list = data.products;
  }

  list = list.slice(0, 15);

  if(!list.length){
    box.innerHTML = `<div class="scan-option muted">هیچ کاڵایەک نەدۆزرایەوە</div>`;
    box.classList.remove("hidden");
    return;
  }

  box.innerHTML = list.map(p => `
    <div class="scan-option" onclick="selectScanProduct('${p.id}')">
      <div>
        <b>${p.name}</b>
        <small>${p.barcode} - ${p.category || "بێ جۆر"} - ستۆک: ${p.stock}</small>
      </div>
      <span>${money(p.price)}</span>
    </div>
  `).join("");

  box.classList.remove("hidden");
}

function selectScanProduct(id){
  const p = data.products.find(x => x.id === id);
  if(!p) return;

  addProductToCart(p);

  const input = byId("scanInput");
  const box = byId("scanOptions");

  if(input) input.value = "";
  if(box) box.classList.add("hidden");

  render();
}

function addProductToCart(p){
  if(Number(p.stock) <= 0) return showMsg("ئەم کاڵایە لە ستۆکدا نەماوە");

  const item = state.cart.find(x => x.id === p.id);

  if(item){
    if(item.qty + 1 > Number(p.stock)) return showMsg("ستۆک بەس نییە");
    item.qty++;
  }else{
    state.cart.push({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      cost: Number(p.cost || 0),
      qty: 1
    });
  }
}

function addScan(){
  const input = byId("scanInput");
  const q = input.value.trim().toLowerCase();

  if(!q){
    showScanOptions();
    return;
  }

  const p = data.products.find(x =>
    String(x.barcode).toLowerCase() === q ||
    String(x.name).toLowerCase().includes(q)
  );

  if(!p) return showMsg("کاڵا نەدۆزرایەوە");

  addProductToCart(p);

  input.value = "";
  render();
}

function setQty(idx, v){
  const qty = Math.max(1, Number(v || 1));
  const cartItem = state.cart[idx];
  const p = data.products.find(x => x.id === cartItem.id);

  if(!p) return;

  if(qty > Number(p.stock)){
    showMsg("ستۆک بەس نییە");
    render();
    return;
  }

  state.cart[idx].qty = qty;
  render();
}

function removeCart(i){
  state.cart.splice(i,1);
  render();
}

function clearCart(){
  state.cart = [];
  render();
}

function toggleCustomer(){
  const box = byId("customerBox");
  const pay = byId("payType");
  if(box && pay) box.classList.toggle("hidden", pay.value !== "debt");
}

function checkout(){
  if(!state.cart.length) return showMsg("سەبەتە بەتاڵە");

  const subtotal = state.cart.reduce((s,i) => s + Number(i.qty) * Number(i.price), 0);
  const discount = Number(byId("discount").value || 0);
  const total = Math.max(0, subtotal - discount);
  const paid = Number(byId("paid").value || 0);
  const payType = byId("payType").value;

  if(payType === "cash" && paid < total) return showMsg("پارەی وەرگیراو کەمە");
  if(payType === "debt" && !data.customers.length) return showMsg("سەرەتا کڕیار زیاد بکە");

  const sale = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    items: clone(state.cart),
    subtotal,
    discount,
    total,
    paid: payType === "debt" ? 0 : paid,
    change: payType === "cash" ? paid - total : 0,
    payType,
    customerId: payType === "debt" ? byId("customerSelect").value : null
  };

  sale.items.forEach(it => {
    const p = data.products.find(x => x.id === it.id);
    if(p) p.stock = Number(p.stock || 0) - Number(it.qty || 0);
  });

  if(payType === "debt"){
    const c = data.customers.find(x => x.id === sale.customerId);
    if(c) c.debt = Number(c.debt || 0) + total;
  }

  data.sales.unshift(sale);
  save();
  printReceipt(sale);
  state.cart = [];
  render();
}

function printReceipt(sale){
  const shop = data.user.shopName;

  const lines = sale.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${money(i.qty * i.price)}</td>
    </tr>
  `).join("");

  byId("printArea").innerHTML = `
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
    </div>
  `;

  window.print();
}

function productsHtml(){
  return `
    <div class="grid two">
      <div class="card">
        <h2>${state.editingProduct ? "دەستکاریکردنی کاڵا" : "زیادکردنی کاڵا"}</h2>

        <label>بارکۆد</label>
        <input id="pBarcode" placeholder="1005">

        <label>ناو</label>
        <input id="pName" placeholder="ناوی کاڵا">

        <label>جۆر</label>
        <input id="pCategory" placeholder="خواردن / پاککەرەوە / ...">

        <div class="row">
          <div>
            <label>نرخی فرۆشتن</label>
            <input id="pPrice" type="number" placeholder="1000">
          </div>

          <div>
            <label>نرخی کڕین</label>
            <input id="pCost" type="number" placeholder="800">
          </div>
        </div>

        <div class="row">
          <div>
            <label>ستۆک</label>
            <input id="pStock" type="number" placeholder="50">
          </div>

          <div>
            <label>ئاگاداری ستۆک</label>
            <input id="pMin" type="number" value="5">
          </div>
        </div>

        <div class="actions" style="margin-top:12px">
          <button class="green" onclick="saveProduct()">هەڵگرتن</button>
          <button class="secondary" onclick="newProduct()">نوێ</button>
        </div>
      </div>

      <div class="card">
        <h2>کاڵاکان</h2>
        <input id="prodSearch" placeholder="گەڕان بە ناو یان بارکۆد..." oninput="renderProductsTable()">
        <div id="productsTable" style="margin-top:12px"></div>
      </div>
    </div>
  `;
}

function renderProductsTable(){
  const table = byId("productsTable");
  if(!table) return;

  const q = (byId("prodSearch")?.value || "").toLowerCase();

  const rows = data.products
    .filter(p =>
      String(p.name).toLowerCase().includes(q) ||
      String(p.barcode).toLowerCase().includes(q) ||
      String(p.category || "").toLowerCase().includes(q)
    )
    .map(p => `
      <tr>
        <td>${p.barcode}</td>
        <td>${p.name}</td>
        <td>${p.category || ""}</td>
        <td>${money(p.price)}</td>
        <td><span class="badge ${Number(p.stock) <= Number(p.minStock) ? "low" : ""}">${p.stock}</span></td>
        <td>
          <button class="blue" onclick="editProduct('${p.id}')">Edit</button>
          <button class="red" onclick="deleteProduct('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="muted">هیچ کاڵایەک نییە</td></tr>`;

  table.innerHTML = `
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>ناو</th>
            <th>جۆر</th>
            <th>نرخ</th>
            <th>ستۆک</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function saveProduct(){
  const p = {
    id: state.editingProduct || uid(),
    barcode: byId("pBarcode").value.trim(),
    name: byId("pName").value.trim(),
    category: byId("pCategory").value.trim(),
    price: Number(byId("pPrice").value || 0),
    cost: Number(byId("pCost").value || 0),
    stock: Number(byId("pStock").value || 0),
    minStock: Number(byId("pMin").value || 0)
  };

  if(!p.barcode || !p.name || !p.price){
    return showMsg("بارکۆد، ناو و نرخ پێویستن");
  }

  const exists = data.products.find(x =>
    String(x.barcode) === String(p.barcode) &&
    x.id !== p.id
  );

  if(exists) return showMsg("ئەم بارکۆدە پێشتر هەیە");

  const idx = data.products.findIndex(x => x.id === p.id);

  if(idx >= 0){
    data.products[idx] = p;
    showMsg("کاڵاکە نوێکرایەوە");
  }else{
    data.products.unshift(p);
    showMsg("کاڵاکە بە سەرکەوتوویی زیاد کرا");
  }

  state.editingProduct = null;
  save();
  render();
}

function editProduct(id){
  state.editingProduct = id;
  render();

  const p = data.products.find(x => x.id === id);
  if(!p) return;

  byId("pBarcode").value = p.barcode;
  byId("pName").value = p.name;
  byId("pCategory").value = p.category || "";
  byId("pPrice").value = p.price;
  byId("pCost").value = p.cost;
  byId("pStock").value = p.stock;
  byId("pMin").value = p.minStock || 0;
}

function deleteProduct(id){
  if(!confirm("دڵنیایت دەتەوێت ئەم کاڵایە بسڕیتەوە؟")) return;
  data.products = data.products.filter(x => x.id !== id);
  save();
  render();
}

function newProduct(){
  state.editingProduct = null;
  render();
}

function customersHtml(){
  return `
    <div class="grid two">
      <div class="card">
        <h2>زیادکردنی کڕیار</h2>

        <label>ناو</label>
        <input id="cName" placeholder="ناوی کڕیار">

        <label>ژمارەی مۆبایل</label>
        <input id="cPhone" placeholder="0770 000 0000">

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
              ${
                data.customers.map(c => `
                  <tr>
                    <td>${c.name}</td>
                    <td>${c.phone || ""}</td>
                    <td>
                      <input type="number" value="${c.debt || 0}" onchange="updateDebt('${c.id}', this.value)" style="width:110px">
                    </td>
                    <td><button class="green" onclick="payDebt('${c.id}')">پارەدان</button></td>
                    <td><button class="red" onclick="deleteCustomer('${c.id}')">Delete</button></td>
                  </tr>
                `).join("") || `<tr><td colspan="5" class="muted">هیچ کڕیارێک نییە</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function addCustomer(){
  const name = byId("cName").value.trim();
  if(!name) return showMsg("ناو بنووسە");

  data.customers.unshift({
    id: uid(),
    name,
    phone: byId("cPhone").value.trim(),
    debt: 0
  });

  save();
  showMsg("کڕیار بە سەرکەوتوویی زیاد کرا");
  render();
}

function updateDebt(id, value){
  const c = data.customers.find(x => x.id === id);
  if(!c) return;
  c.debt = Number(value || 0);
  save();
}

function deleteCustomer(id){
  if(!confirm("دڵنیایت دەتەوێت ئەم کڕیارە بسڕیتەوە؟")) return;
  data.customers = data.customers.filter(x => x.id !== id);
  save();
  render();
}

function payDebt(id){
  const c = data.customers.find(x => x.id === id);
  if(!c) return;

  const amount = Number(prompt("بڕی پارەدان:", c.debt) || 0);

  if(amount > 0){
    c.debt = Math.max(0, Number(c.debt || 0) - amount);
    save();
    render();
  }
}

function reportsHtml(){
  const daySales = data.sales.filter(s => s.date.slice(0,10) === today());
  const monthSales = data.sales.filter(s => s.date.slice(0,7) === month());

  const totalDay = daySales.reduce((s,x) => s + Number(x.total || 0), 0);

  const profitDay = daySales.reduce((s,x) =>
    s + x.items.reduce((a,i) =>
      a + (Number(i.price || 0) - Number(i.cost || 0)) * Number(i.qty || 0), 0
    ) - Number(x.discount || 0)
  , 0);

  const totalMonth = monthSales.reduce((s,x) => s + Number(x.total || 0), 0);

  return `
    <div class="grid three">
      <div class="card stat"><div class="muted">فرۆشتنی ئەمڕۆ</div><div class="kpi">${money(totalDay)}</div></div>
      <div class="card stat"><div class="muted">قازانجی ئەمڕۆ</div><div class="kpi">${money(profitDay)}</div></div>
      <div class="card stat"><div class="muted">فرۆشتنی مانگ</div><div class="kpi">${money(totalMonth)}</div></div>
    </div>

    <div class="card" style="margin-top:14px">
      <h2>دوایین فرۆشتنەکان</h2>
      <div class="tablewrap">
        <table>
          <thead><tr><th>ژمارە</th><th>کات</th><th>جۆر</th><th>کۆ</th></tr></thead>
          <tbody>
            ${
              data.sales.slice(0,100).map(s => `
                <tr>
                  <td>${s.id}</td>
                  <td>${new Date(s.date).toLocaleString()}</td>
                  <td>${s.payType}</td>
                  <td>${money(s.total)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4" class="muted">هیچ فرۆشتنێک نییە</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function settingsHtml(){
  return `
    <div class="grid two">
      <div class="card">
        <h2>ڕێکخستنی دوکان</h2>

        <label>ناوی دوکان</label>
        <input id="shopName" value="${data.user.shopName}">

        <label>مۆبایل</label>
        <input id="shopPhone" value="${data.user.phone}">

        <label>Username</label>
        <input id="newUser" value="${currentAccount.username}">

        <label>Password نوێ</label>
        <input id="newPass" type="password" placeholder="بەتاڵی بهێڵە ئەگەر ناگۆڕیت">

        <button class="green" style="margin-top:12px" onclick="saveSettings()">هەڵگرتن</button>
      </div>

      <div class="card">
        <h2>Backup</h2>

        <div class="actions">
          <button class="blue" onclick="exportBackup()">Export Backup</button>
          <button class="amber" onclick="byId('importFile').click()">Import Backup</button>
          <input id="importFile" type="file" accept=".json" class="hidden" onchange="importBackup(event)">
        </div>

        <p class="muted">Backup تەنها بۆ ئەم مارکێتەیە، مارکێتی تر کاری پێ ناکرێت.</p>
        <button class="red" onclick="resetThisMarket()">Reset ئەم مارکێتە</button>
      </div>
    </div>
  `;
}

function saveSettings(){
  const newShopName = byId("shopName").value.trim() || "AR Group POS";
  const newPhone = byId("shopPhone").value.trim();
  const newUsername = byId("newUser").value.trim() || currentAccount.username;
  const newPassword = byId("newPass").value;

  const duplicated = accounts.find(acc => acc.username === newUsername && acc.key !== currentAccount.key);
  if(duplicated){
    showMsg("ئەم Username ـە پێشتر بۆ مارکێتێکی تر بەکارهاتووە");
    return;
  }

  currentAccount.shopName = newShopName;
  currentAccount.phone = newPhone;
  currentAccount.username = newUsername;

  if(newPassword){
    currentAccount.password = newPassword;
  }

  data.user.shopName = currentAccount.shopName;
  data.user.phone = currentAccount.phone;
  data.user.username = currentAccount.username;
  data.user.password = currentAccount.password;

  saveAccounts();
  save();

  showMsg("ڕێکخستنەکان هەڵگیران");
  render();
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = currentAccount.key + "-backup.json";
  a.click();
}

function importBackup(e){
  const f = e.target.files[0];
  if(!f) return;

  const r = new FileReader();

  r.onload = () => {
    try{
      data = JSON.parse(r.result);
      data.user = data.user || {};
      data.user.shopName = currentAccount.shopName;
      data.user.phone = currentAccount.phone;
      data.user.username = currentAccount.username;
      data.user.password = currentAccount.password;
      data.products = data.products || [];
      data.customers = data.customers || [];
      data.sales = data.sales || [];
      save();
      showMsg("Backup گەڕایەوە");
      render();
    }catch{
      showMsg("فایل هەڵەیە");
    }
  };

  r.readAsText(f);
}

function resetThisMarket(){
  if(confirm("دڵنیایت هەموو داتای ئەم مارکێتە بسڕدرێتەوە؟")){
    localStorage.removeItem(dataKey());
    data = loadData();
    state.cart = [];
    state.page = "dashboard";
    render();
  }
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./service-worker.js");
}

render();