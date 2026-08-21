const API_BASE_URL = (window.__API_BASE_URL__ || "https://<your-render-app-name>.onrender.com").replace(/\/$/, "");

async function
loadProductCount(){

    const response = await fetch(`${API_BASE_URL}/dashboard/product-count`);
    const data = await response.json();

document.getElementById("productCount").textContent = data.count + "件";
}

loadProductCount();

async function loadLowStockCount(){
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/low-stock`);

        if (!response.ok) {
            throw new Error("在庫不足数の取得に失敗しました");
        }

        const data = await response.json();
        document.getElementById("lowStockCount").textContent = (data.count ?? 0) + "件";
    } catch (error) {
        console.error(error);
        document.getElementById("lowStockCount").textContent = "0件";
    }
}

async function loadTodaySales(){
    const response = await fetch(`${API_BASE_URL}/dashboard/today-sales`);
    const data = await response.json();

document.getElementById("todaySales")
    .textContent = data.count + "個";
}

loadProductCount();
loadLowStockCount();
loadTodaySales();

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

const historyButton = document.getElementById("historyButton");

if(historyButton){
    historyButton.addEventListener("click",() => {
        window.location.href = "operation-history.html";
    });
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function formatCsvDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function buildCsvRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return "";
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(",")];

    rows.forEach((row) => {
        const values = headers.map((header) => {
            const value = row[header] ?? "";
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvLines.push(values.join(","));
    });

    return csvLines.join("\n");
}

function downloadCsv(filename, rows) {
    const content = buildCsvRows(rows);
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function exportPurchaseHistoryCsv() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders`);
        const data = await response.json();
        const rows = Array.isArray(data.orders)
            ? data.orders.map((order) => ({
                日時: formatCsvDate(order.created_at),
                商品名: order.product_name || "",
                仕入先: order.supplier_name || "",
                数量: order.quantity ?? 0,
                状態: order.status || "",
                希望納品日: order.expected_date || "",
                備考: order.order_note || ""
            }))
            : [];

        downloadCsv("purchase_history.csv", rows);
    } catch (error) {
        console.error(error);
        alert("発注履歴のCSV出力に失敗しました。");
    }
}

async function exportDiscardHistoryCsv() {
    try {
        const response = await fetch(`${API_BASE_URL}/operation-logs`);
        const data = await response.json();
        const rows = Array.isArray(data.logs)
            ? data.logs
                .filter((log) => String(log.action) === "廃棄")
                .map((log) => ({
                    日時: formatCsvDate(log.created_at),
                    商品名: log.product_name || "",
                    操作: log.action || "",
                    社員名: log.name || "",
                    社員ID: log.employee_id || ""
                }))
            : [];

        downloadCsv("discard_history.csv", rows);
    } catch (error) {
        console.error(error);
        alert("廃棄履歴のCSV出力に失敗しました。");
    }
}

const csvExportToggle = document.getElementById("csvExportToggle");
const csvExportMenu = document.getElementById("csvExportMenu");
const exportPurchaseHistoryBtn = document.getElementById("exportPurchaseHistoryBtn");
const exportDiscardHistoryBtn = document.getElementById("exportDiscardHistoryBtn");

if (csvExportToggle && csvExportMenu) {
    csvExportToggle.addEventListener("click", () => {
        const isOpen = csvExportMenu.classList.toggle("open");
        csvExportToggle.setAttribute("aria-expanded", String(isOpen));
    });
}

if (exportPurchaseHistoryBtn) {
    exportPurchaseHistoryBtn.addEventListener("click", exportPurchaseHistoryCsv);
}

if (exportDiscardHistoryBtn) {
    exportDiscardHistoryBtn.addEventListener("click", exportDiscardHistoryCsv);
}
