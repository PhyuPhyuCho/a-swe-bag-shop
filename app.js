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
