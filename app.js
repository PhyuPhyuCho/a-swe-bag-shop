let bags = JSON.parse(localStorage.getItem("bags") || "[]");

function save() {
  localStorage.setItem("bags", JSON.stringify(bags));
}

function render() {
  const list = document.getElementById("bagList");
  list.innerHTML = "";

  bags.forEach(b => {
    const profit = b.price - b.cost;
    const li = document.createElement("li");

    li.innerHTML = `
      ${b.id} |
      Profit:
      <span style="color:${profit >= 0 ? 'green' : 'red'}">
        ${profit} MMK
      </span>
      <input type="checkbox" ${b.sold ? "checked" : ""} 
        onchange="toggleSold('${b.id}')">
      Sold
    `;

    list.appendChild(li);
  });
}

function addBag() {
  const cost = Number(document.getElementById("cost").value);
  const price = Number(document.getElementById("price").value);

  if (!cost || !price) return alert("Fill prices");

  const id = "B" + String(bags.length + 1).padStart(3, "0");

  bags.push({
    id,
    cost,
    price,
    sold: false
  });

  save();
  render();
}

function toggleSold(id) {
  const bag = bags.find(b => b.id === id);
  bag.sold = !bag.sold;
  save();
  render();
}

render();
