let bags = JSON.parse(localStorage.getItem("bags") || "[]");
let currentFilter = "all";
let currentView = "today";

function save() {
  localStorage.setItem("bags", JSON.stringify(bags));
}

function addBag() {
  const cost = Number(costEl.value);
  const price = Number(priceEl.value);
  const photo = photoEl.files[0];

  if (!cost || !price) return alert("Fill prices");

  const reader = new FileReader();
  reader.onload = () => {
    bags.push({
      id: "B" + String(bags.length + 1).padStart(3, "0"),
      cost,
      price,
      photo: reader.result,
      sold: false,
      date: new Date().toISOString()
    });
    save();
    render();
  };
  reader.readAsDataURL(photo);
}

function filterList(type) {
  currentFilter = type;
  render();
}

function setView(view) {
  currentView = view;
  renderSummary();
}

function toggleSold(id) {
  const bag = bags.find(b => b.id === id);
  bag.sold = !bag.sold;
  save();
  render();
}

function render() {
  const list = document.getElementById("bagList");
  list.innerHTML = "";

  let filtered = bags.filter(b =>
    currentFilter === "all" ||
    (currentFilter === "sold" && b.sold) ||
    (currentFilter === "instock" && !b.sold)
  );

  filtered.forEach(b => {
    const profit = b.price - b.cost;
    const li = document.createElement("li");

    li.innerHTML = `
      <img src="${b.photo}">
      ${b.id}
      <span style="color:${profit>=0?'green':'red'}">
        ${profit} MMK
      </span>
      <input type="checkbox" ${b.sold?'checked':''}
        onchange="toggleSold('${b.id}')">
    `;

    list.appendChild(li);
  });

  renderSummary();
}

function renderSummary() {
  let now = new Date();
  let totalProfit = 0;
  let soldCount = 0;

  bags.forEach(b => {
    if (!b.sold) return;
    let d = new Date(b.date);

    if (
      (currentView === "today" && d.toDateString() === now.toDateString()) ||
      (currentView === "month" && d.getMonth() === now.getMonth()) ||
      (currentView === "year" && d.getFullYear() === now.getFullYear())
    ) {
      soldCount++;
      totalProfit += (b.price - b.cost);
    }
  });

  soldCountEl.innerText = soldCount;
  totalProfitEl.innerText = totalProfit + " MMK";
  totalProfitEl.className = totalProfit >= 0 ? "profit green" : "profit red";
}

const photoEl = document.getElementById("photo");
const costEl = document.getElementById("cost");
const priceEl = document.getElementById("price");
const soldCountEl = document.getElementById("soldCount");
const totalProfitEl = document.getElementById("totalProfit");

render();
