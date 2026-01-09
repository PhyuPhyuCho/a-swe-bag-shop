const PIN = "1234"; // change later
let currentPage = "home";

function unlock() {
  const val = document.getElementById("pinInput").value;
  if (val === PIN) {
    document.getElementById("lockScreen").style.display = "none";
    showPage("home");
  } else {
    alert("Wrong PIN");
  }
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  currentPage = id;
}

function goHome() {
  showPage("home");
}

/* Placeholder logic */
function addBag() {
  alert("Next step: save bag data");
}
