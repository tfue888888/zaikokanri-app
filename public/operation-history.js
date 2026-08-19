const HISTORY_PAGE_SIZE = 20;
let historyCurrentPage = 1;
let historyAllLogs = [];

function renderHistoryPageItems(logs) {
    const historyList = document.getElementById("historyList");
    if (!historyList) {
        return;
    }

    historyList.innerHTML = "";

    if (!Array.isArray(logs) || logs.length === 0) {
        historyList.innerHTML = "<p>該当する操作履歴はありません。</p>";
        return;
    }

    logs.forEach((log) => {
        const item = document.createElement("div");
        item.className = "history-item";

        const dateText = new Date(log.created_at).toLocaleString("ja-JP");

        item.innerHTML = `
            <p>
                <strong>日時：</strong>
                ${dateText}
            </p>

            <p>
                <strong>社員：</strong>
                ${log.name}
                （${log.employee_id}）
            </p>

            <p>
                <strong>商品：</strong>
                ${log.product_name}
            </p>

            <p class="history-action">
                <strong>操作：</strong>
                ${log.action}
            </p>
        `;

        historyList.appendChild(item);
    });
}

function renderHistoryPagination(totalPages) {
    const pagination = document.getElementById("historyPagination");
    if (!pagination) {
        return;
    }

    pagination.innerHTML = "";

    if (totalPages <= 1) {
        return;
    }

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.textContent = "前へ";
    prevButton.className = "history-page-btn";
    prevButton.disabled = historyCurrentPage === 1;
    prevButton.addEventListener("click", () => {
        if (historyCurrentPage > 1) {
            historyCurrentPage -= 1;
            renderHistoryPage();
        }
    });
    pagination.appendChild(prevButton);

    for (let page = 1; page <= totalPages; page += 1) {
        const pageButton = document.createElement("button");
        pageButton.type = "button";
        pageButton.textContent = String(page);
        pageButton.className = `history-page-btn ${page === historyCurrentPage ? "active" : ""}`;
        pageButton.setAttribute("aria-label", `${page}ページ目へ`);
        pageButton.addEventListener("click", () => {
            historyCurrentPage = page;
            renderHistoryPage();
        });
        pagination.appendChild(pageButton);
    }

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.textContent = "次へ";
    nextButton.className = "history-page-btn";
    nextButton.disabled = historyCurrentPage === totalPages;
    nextButton.addEventListener("click", () => {
        if (historyCurrentPage < totalPages) {
            historyCurrentPage += 1;
            renderHistoryPage();
        }
    });
    pagination.appendChild(nextButton);
}

function renderHistoryPage() {
    const totalPages = Math.max(1, Math.ceil(historyAllLogs.length / HISTORY_PAGE_SIZE));

    if (historyCurrentPage > totalPages) {
        historyCurrentPage = totalPages;
    }

    const startIndex = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
    const currentPageLogs = historyAllLogs.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

    renderHistoryPageItems(currentPageLogs);
    renderHistoryPagination(totalPages);
}

async function loadOperationHistory(keyword = "", date = "", action = "", days = "") {

    const historyList = document.getElementById("historyList");

    try {
        const params = new URLSearchParams();
        if (keyword.trim()) {
            params.set("q", keyword.trim());
        }
        if (date) {
            params.set("date", date);
        }
        if (action) {
            params.set("action", action);
        }
        if (days) {
            params.set("days", String(days));
        }

        const response = await fetch(`/operation-logs${params.toString() ? `?${params.toString()}` : ""}`);

        if (!response.ok) {
            throw new Error("操作履歴の取得に失敗しました");
        }

        const data = await response.json();
        historyAllLogs = Array.isArray(data.logs) ? data.logs : [];
        historyCurrentPage = 1;

        renderHistoryPage();

    } catch (error) {
        console.error(error);
        historyAllLogs = [];
        historyCurrentPage = 1;
        if (historyList) {
            historyList.innerHTML = "<p>操作履歴の取得に失敗しました。</p>";
        }
        const pagination = document.getElementById("historyPagination");
        if (pagination) {
            pagination.innerHTML = "";
        }
    }
}

const historySearchInput = document.getElementById("historySearchInput");
const historyDateInput = document.getElementById("historyDateInput");
const historyDaysFilter = document.getElementById("historyDaysFilter");
const historyActionFilter = document.getElementById("historyActionFilter");
const historySearchBtn = document.getElementById("historySearchBtn");
const historyClearBtn = document.getElementById("historyClearBtn");

const triggerHistorySearch = () => {
    loadOperationHistory(
        historySearchInput ? historySearchInput.value : "",
        historyDateInput ? historyDateInput.value : "",
        historyActionFilter ? historyActionFilter.value : "",
        historyDaysFilter ? historyDaysFilter.value : ""
    );
};

if (historySearchBtn) {
    historySearchBtn.addEventListener("click", () => {
        historyCurrentPage = 1;
        triggerHistorySearch();
    });
}

if (historySearchInput) {
    historySearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            historyCurrentPage = 1;
            triggerHistorySearch();
        }
    });
}

if (historyDateInput) {
    historyDateInput.addEventListener("change", () => {
        historyCurrentPage = 1;
        triggerHistorySearch();
    });
}

if (historyActionFilter) {
    historyActionFilter.addEventListener("change", () => {
        historyCurrentPage = 1;
        triggerHistorySearch();
    });
}

if (historyDaysFilter) {
    historyDaysFilter.addEventListener("change", () => {
        historyCurrentPage = 1;
        triggerHistorySearch();
    });
}

if (historyClearBtn) {
    historyClearBtn.addEventListener("click", () => {
        if (historySearchInput) historySearchInput.value = "";
        if (historyDateInput) historyDateInput.value = "";
        if (historyDaysFilter) historyDaysFilter.value = "";
        if (historyActionFilter) historyActionFilter.value = "";
        historyCurrentPage = 1;
        loadOperationHistory();
    });
}

loadOperationHistory();


// ====================
// メニュー
// ====================

const menuButton =
    document.getElementById("menuButton");

const sideMenu =
    document.getElementById("sideMenu");

if (menuButton && sideMenu) {

    menuButton.addEventListener("click", () => {

        sideMenu.classList.toggle("open");

    });

    document.addEventListener("click", (event) => {

        if (!sideMenu.classList.contains("open")) {
            return;
        }

        const target = event.target;

        if (
            target === menuButton ||
            sideMenu.contains(target)
        ) {
            return;
        }

        sideMenu.classList.remove("open");

    });
}


// ====================
// ダッシュボード
// ====================

const dashboardButton =
    document.getElementById("dashboardButton");

if (dashboardButton) {

    dashboardButton.addEventListener("click", () => {

        window.location.href =
            "dashboard-page.html";

    });

}


// ====================
// 商品一覧
// ====================

const productButton =
    document.getElementById("productButton");

if (productButton) {

    productButton.addEventListener("click", () => {

        window.location.href =
            "dashboard.html";

    });

}


// ====================
// 操作履歴
// ====================

const historyButton =
    document.getElementById("historyButton");

if (historyButton) {

    historyButton.addEventListener("click", () => {

        window.location.href =
            "operation-history.html";

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
        const response = await fetch("/purchase-orders");
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
        const response = await fetch("/operation-logs");
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


// ====================
// ログアウト
// ====================

const logoutButton =
    document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", () => {

        localStorage.removeItem("userId");
        localStorage.removeItem("employeeId");
        localStorage.removeItem("role");

        window.location.href =
            "index.html";

    });

}