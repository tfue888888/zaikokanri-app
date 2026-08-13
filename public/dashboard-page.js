async function
loadProductCount(){

    const response = await fetch("/dashboard/product-count");
    const data = await response.json();

document.getElementById("productCount").textContent = data.count + "件";
}

loadProductCount();

async function loadLowStockCount(){

    const response =
      await fetch("/dashboard/low-stock");

    const data = await response.json();

document.getElementById("lowStockCount")

   .textContent = data.count + "件";
}

async function loadTodaySales(){
    const response = await fetch("/dashboard/today-sales");
    const data = await response.json();

document.getElementById("todaySales")
    .textContent = data.count + "個";
}

async function loadTodayActions(){
    const response = await fetch("/dashboard/today-actions");
    const data = await response.json();

    document.getElementById("todayActions")
        .textContent = data.count + "件";
}

loadProductCount();
loadLowStockCount();
loadTodaySales();
loadTodayActions();

const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");

function setMenuButtonVisibility(isOpen) {
    if (menuButton) {
        menuButton.style.display = isOpen ? "none" : "inline-flex";
    }
}

if (menuButton && sideMenu) {
    menuButton.addEventListener("click", () => {
        const opening = !sideMenu.classList.contains("open");
        sideMenu.classList.toggle("open");
        setMenuButtonVisibility(opening);
    });

    document.addEventListener("click", (event) => {
        if (!sideMenu.classList.contains("open")) {
            return;
        }

        const target = event.target;
        if (target === menuButton || sideMenu.contains(target)) {
            return;
        }

        sideMenu.classList.remove("open");
        setMenuButtonVisibility(false);
    });
}

const dashboardButton = document.getElementById("dashboardButton");
if (dashboardButton) {
    dashboardButton.addEventListener("click", () => {
        window.location.href = "dashboard-page.html";
    });
}

const productButton = document.getElementById("productButton");
if (productButton) {
    productButton.addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });
}
