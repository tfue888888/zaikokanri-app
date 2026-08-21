const API_BASE_URL = (window.__API_BASE_URL__ || "https://<your-render-app-name>.onrender.com").replace(/\/$/, "");

const logoutBtn = document.getElementById("logoutBtn");
let allProducts = [];
let allPurchaseOrders = [];
let activeSearchTerm = "";
let currentPage = 1;
const DESKTOP_PAGE_SIZE = 20;
const MOBILE_PAGE_SIZE = 10;
const productFormSection = document.getElementById("productFormSection");

function getPageSize() {
    return window.innerWidth <= 768 ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
}

function isAdminUser() {
    const role = localStorage.getItem("role");
    const employeeId = localStorage.getItem("employeeId");
    return role === "admin" || role === "管理者" || employeeId === "EMP001";
}

function applyAdminVisibility() {
    if (productFormSection) {
        productFormSection.style.display = isAdminUser() ? "" : "none";
    }
}

applyAdminVisibility();

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("userId");
        window.location.href = "index.html";
    });
}

const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");

if (menuButton && sideMenu) {
    menuButton.addEventListener("click", () => {
        sideMenu.classList.toggle("open");
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

const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("userId");
        window.location.href = "index.html";
    });
}

function renderProducts(products) {
    const productList = document.getElementById("productList");

    if (!productList) {
        return;
    }

    productList.innerHTML = "";

    if (products.length === 0) {
        productList.innerHTML = "<p>該当する商品がありません</p>";
        return;
    }

    products.forEach(product => {
        let alertMessage = "";
        if (product.stock <= 5) {
            alertMessage = `<p class="stock-alert">⚠ 在庫不足</p>`;
        }

        productList.innerHTML += `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-card-header">
                    <h3>${product.product_name}</h3>
                    <div class="card-actions right-actions">
                        <button type="button" class="edit-btn" data-id="${product.id}">編集</button>
                        <button type="button" class="delete-btn" data-id="${product.id}">削除</button>
                    </div>
                </div>
                <p>在庫：${product.stock}</p>
                ${alertMessage}
                <div class="card-actions">
                    <button type="button" class="stock-btn" data-id="${product.id}" data-action="receive">検品</button>
                    <button type="button" class="stock-btn" data-id="${product.id}" data-action="sale">販売</button>
                    <button type="button" class="stock-btn" data-id="${product.id}" data-action="discard">廃棄</button>
                </div>
                <div class="edit-panel" id="editPanel-${product.id}" aria-hidden="true">
                    <input type="text" class="edit-name" value="${product.product_name}" placeholder="商品名">
                    <input type="text" class="edit-jan" value="${product.jan_code}" maxlength="13" inputmode="numeric" pattern="\d*" placeholder="JANコード">
                    <div class="edit-panel-actions">
                        <button type="button" class="stock-btn save-edit-btn" data-id="${product.id}">保存</button>
                        <button type="button" class="stock-btn cancel-edit-btn" data-id="${product.id}">キャンセル</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function getFilteredProducts() {
    const searchTerm = activeSearchTerm.trim().toLowerCase();

    if (!searchTerm) {
        return allProducts;
    }

    return allProducts.filter((product) => {
        const searchableText = [product.product_name, product.jan_code]
            .filter(Boolean)
            .map((value) => String(value).toLowerCase())
            .join(" ");

        return searchableText.includes(searchTerm);
    });
}

function renderPageNumbers(totalItems) {
    const pageNumbers = document.getElementById("pageNumbers");

    if (!pageNumbers) {
        return;
    }

    const pageSize = getPageSize();
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    pageNumbers.innerHTML = "";

    for (let page = 1; page <= totalPages; page += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `page-number-btn ${page === currentPage ? "active" : ""}`;
        button.textContent = String(page);
        button.addEventListener("click", () => {
            currentPage = page;
            renderCurrentProducts();
        });
        pageNumbers.appendChild(button);
    }
}

function updateResultCount(totalItems, visibleItems) {
    const resultCount = document.getElementById("resultCount");
    if (!resultCount) {
        return;
    }

    resultCount.textContent = `全${totalItems}商品中${visibleItems}商品表示中`;
}

function renderCurrentProducts() {
    const filteredProducts = getFilteredProducts();
    const pageSize = getPageSize();
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pagedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

    renderProducts(pagedProducts);
    renderPageNumbers(filteredProducts.length);
    updateResultCount(filteredProducts.length, pagedProducts.length);
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) {
            throw new Error("商品データの取得に失敗しました");
        }

        const products = await response.json();
        allProducts = products;
        populatePurchaseOrderOptions();
        renderCurrentProducts();
    } catch (error) {
        console.error(error);
        const productList = document.getElementById("productList");

        if (productList) {
            productList.innerHTML = "<p>商品データの取得に失敗しました</p>";
        }
    }
}

function populatePurchaseOrderOptions() {
    const select = document.getElementById("purchaseProductId");
    if (!select) {
        return;
    }

    const selectedValue = select.value;
    select.innerHTML = '<option value="">商品を選択</option>';

    allProducts.forEach((product) => {
        const option = document.createElement("option");
        option.value = String(product.id);
        option.textContent = `${product.product_name}（在庫:${product.stock}）`;
        if (selectedValue && String(product.id) === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

async function loadPurchaseOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders`);

        if (!response.ok) {
            throw new Error("発注データの取得に失敗しました");
        }

        const data = await response.json();
        allPurchaseOrders = Array.isArray(data.orders) ? data.orders : [];
        renderPurchaseOrders();
    } catch (error) {
        console.error(error);
        const panel = document.getElementById("purchaseOrderList");
        if (panel) {
            panel.innerHTML = "<p>発注データの取得に失敗しました。</p>";
        }
    }
}

function renderPurchaseOrders() {
    const panel = document.getElementById("purchaseOrderList");
    if (!panel) {
        return;
    }

    const pendingOrders = allPurchaseOrders.filter((order) => order.status !== "入荷済");

    if (pendingOrders.length === 0) {
        panel.innerHTML = "<p>発注予定はまだありません。</p>";
        return;
    }

    panel.innerHTML = pendingOrders.map((order) => {
        const expectedDate = order.expected_date ? new Date(order.expected_date).toLocaleDateString("ja-JP") : "未設定";

        return `
            <div class="purchase-order-card">
                <div class="purchase-order-head">
                    <strong>${order.product_name}</strong>
                    <span class="purchase-status pending">未入荷</span>
                </div>
                <p>仕入先：${order.supplier_name}</p>
                <p>数量：${order.quantity}個</p>
                <p>希望納品日：${expectedDate}</p>
                <p>備考：${order.order_note || "なし"}</p>
                <button type="button" class="receive-order-btn" data-id="${order.id}">
                    入荷登録
                </button>
            </div>
        `;
    }).join("");
}

async function createPurchaseOrder() {
    const productId = Number(document.getElementById("purchaseProductId")?.value || 0);
    const supplierName = document.getElementById("purchaseSupplier")?.value.trim() || "";
    const quantity = Number(document.getElementById("purchaseQuantity")?.value || 0);
    const expectedDate = document.getElementById("purchaseExpectedDate")?.value || "";
    const notes = document.getElementById("purchaseNote")?.value.trim() || "";
    const userId = Number(localStorage.getItem("userId"));

    if (!Number.isInteger(productId) || productId <= 0) {
        alert("発注する商品を選択してください。");
        return;
    }

    if (!supplierName) {
        alert("仕入先名を入力してください。");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("発注数量は1以上で入力してください。");
        return;
    }

    if (!Number.isInteger(userId)) {
        alert("ログイン情報が見つかりません。再ログインしてください。");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productId,
                supplierName,
                quantity,
                expectedDate,
                notes,
                userId
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "発注登録に失敗しました。");
        }

        document.getElementById("purchaseSupplier").value = "";
        document.getElementById("purchaseQuantity").value = "";
        document.getElementById("purchaseExpectedDate").value = "";
        document.getElementById("purchaseNote").value = "";
        document.getElementById("purchaseProductId").value = "";

        await loadPurchaseOrders();
        await loadProducts();
        alert("発注を登録しました。");
    } catch (error) {
        console.error(error);
        alert(error.message || "発注登録に失敗しました。");
    }
}

async function receivePurchaseOrder(orderId) {
    const userId = Number(localStorage.getItem("userId"));

    if (!Number.isInteger(userId)) {
        alert("ログイン情報が見つかりません。再ログインしてください。");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/receive`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "入荷処理に失敗しました。");
        }

        await loadPurchaseOrders();
        await loadProducts();
        alert("入荷を反映しました。");
    } catch (error) {
        console.error(error);
        alert(error.message || "入荷処理に失敗しました。");
    }
}

loadProducts();
loadPurchaseOrders();

async function updateStock(id, action) {

    try {
        const userId = Number(localStorage.getItem("userId"));

        if (!Number.isInteger(userId)) {
            alert("ログイン情報が見つかりません。再ログインしてください。");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/stock/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id,
                action,
                userId
            })
        });

        const data = await response.json();

        if (data.success) {
            loadProducts();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error(error);
        alert("サーバー通信に失敗しました。サーバーを再起動してください。");
    }
}

const productList = document.getElementById("productList");

if (productList) {
    productList.addEventListener("click", (event) => {
        const button = event.target.closest("button");

        if (!button || !productList.contains(button)) {
            return;
        }

        const id = button.dataset.id;

        if (button.classList.contains("delete-btn")) {
            if (!isAdminUser()) {
                alert("権限がありません。管理者のみ削除できます。");
                return;
            }
            deleteProduct(id);
            return;
        }

        if (button.classList.contains("edit-btn")) {
            if (!isAdminUser()) {
                alert("権限がありません。管理者のみ編集できます。");
                return;
            }
            toggleEditPanel(id);
            return;
        }

        if (button.classList.contains("save-edit-btn")) {
            if (!isAdminUser()) {
                alert("権限がありません。管理者のみ保存できます。");
                return;
            }
            saveEditProduct(id);
            return;
        }

        if (button.classList.contains("cancel-edit-btn")) {
            toggleEditPanel(id, false);
            return;
        }

        const action = button.dataset.action;
        if (!action) {
            return;
        }

        updateStock(id, action);
    });
}

const createPurchaseOrderBtn = document.getElementById("createPurchaseOrderBtn");
if (createPurchaseOrderBtn) {
    createPurchaseOrderBtn.addEventListener("click", createPurchaseOrder);
}

const purchaseOrderList = document.getElementById("purchaseOrderList");
if (purchaseOrderList) {
    purchaseOrderList.addEventListener("click", (event) => {
        const button = event.target.closest("button.receive-order-btn");
        if (!button) {
            return;
        }

        const orderId = Number(button.dataset.id);
        if (Number.isInteger(orderId)) {
            receivePurchaseOrder(orderId);
        }
    });
}

async function deleteProduct(id) {
    try {
        const userId = Number(localStorage.getItem("userId"));
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body:JSON.stringify({userId})
        });

        const data = await response.json();

        if (data.success) {
            alert("商品を削除しました。");
            loadProducts();
        } else {
            alert(data.message || "商品削除に失敗しました。");
        }
    } catch (error) {
        console.error(error);
        alert("サーバー通信に失敗しました。サーバーを再起動してください。");
    }
}

function toggleEditPanel(id, show = null) {
    const panel = document.getElementById(`editPanel-${id}`);
    if (!panel) {
        return;
    }

    const shouldShow = show === null ? !panel.classList.contains("visible") : show;
    panel.classList.toggle("visible", shouldShow);
    panel.setAttribute("aria-hidden", String(!shouldShow));
}

async function saveEditProduct(id) {
    const panel = document.getElementById(`editPanel-${id}`);
    if (!panel) {
        return;
    }

    const nameInput = panel.querySelector(".edit-name");
    const janInput = panel.querySelector(".edit-jan");
    if (!nameInput || !janInput) {
        return;
    }

    const productName = nameInput.value.trim();
    const janCode = janInput.value.trim();

    if (!productName || !/^\d{13}$/.test(janCode)) {
        alert("商品名とJANコードは正しく入力してください。JANコードは13桁の半角数字です。");
        return;
    }

    try {
        const userId = Number(localStorage.getItem("userId"));
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productName,
                janCode,
                userId
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("商品情報を更新しました。");
            loadProducts();
        } else {
            alert(data.message || "商品情報の更新に失敗しました。");
        }
    } catch (error) {
        console.error(error);
        alert("サーバー通信に失敗しました。サーバーを再起動してください。");
    }
}

async function addProduct() {
    const productName = document.getElementById("productName").value.trim();
    const janCode = document.getElementById("janCode").value.trim();
    const stockValue = document.getElementById("stock").value.trim();
    const stock = Number(stockValue);
    const userId = Number(localStorage.getItem("userid"));

    if (!productName || !janCode || stockValue === "" || Number.isNaN(stock)) {
        alert("商品名、JANコード、初期在庫を正しく入力してください。" );
        return;
    }

    if (productName.length > 50) {
        alert("商品名は50文字以内で入力してください。");
        return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
        alert("在庫は0以上の整数で入力してください。");
        return;
    }

    if (!/^\d{13}$/.test(janCode)) {
        alert("JANコードは13桁の半角数字で入力してください。");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productName,
                janCode,
                stock,
                userId
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("商品を追加しました。");
            document.getElementById("productName").value = "";
            document.getElementById("janCode").value = "";
            document.getElementById("stock").value = "";
            loadProducts();
        } else {
            alert(data.message || "商品追加に失敗しました。");
        }
    } catch (error) {
        console.error(error);
        alert("サーバー通信に失敗しました。サーバーを再起動してください。");
    }
}

const addButton = document.getElementById("addProductBtn");
if (addButton) {
    addButton.addEventListener("click", addProduct);
}

const toggleAddFormBtn = document.getElementById("toggleAddFormBtn");
const addProductPanel = document.getElementById("addProductPanel");
if (toggleAddFormBtn && addProductPanel) {
    toggleAddFormBtn.addEventListener("click", () => {
        const isOpen = addProductPanel.classList.toggle("visible");
        toggleAddFormBtn.setAttribute("aria-expanded", String(isOpen));
        toggleAddFormBtn.textContent = isOpen ? "×" : "＋";
    });
}

const togglePurchaseOrderFormBtn = document.getElementById("togglePurchaseOrderFormBtn");
const purchaseOrderPanel = document.getElementById("purchaseOrderPanel");
if (togglePurchaseOrderFormBtn && purchaseOrderPanel) {
    togglePurchaseOrderFormBtn.addEventListener("click", () => {
        const isOpen = purchaseOrderPanel.classList.toggle("visible");
        togglePurchaseOrderFormBtn.setAttribute("aria-expanded", String(isOpen));
        togglePurchaseOrderFormBtn.textContent = isOpen ? "×" : "＋";
    });
}

const searchInput = document.getElementById("searchProduct");
const searchButton = document.getElementById("searchProductBtn");
const clearSearchButton = document.getElementById("clearSearchBtn");

if (searchInput && searchButton) {
    searchButton.addEventListener("click", () => {
        activeSearchTerm = searchInput.value;
        currentPage = 1;
        renderCurrentProducts();
    });

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            activeSearchTerm = searchInput.value;
            currentPage = 1;
            renderCurrentProducts();
        }
    });
}

if (clearSearchButton && searchInput) {
    clearSearchButton.addEventListener("click", () => {
        activeSearchTerm = "";
        searchInput.value = "";
        currentPage = 1;
        renderCurrentProducts();
        searchInput.focus();
    });
}

const fullWidthDigitRegex = /[０-９]/;

function removeFullWidthDigits(input) {
    const value = input.value;
    input.value = value.replace(/[０-９]/g, "");
}

const janCodeInput = document.getElementById("janCode");
if (janCodeInput) {
    janCodeInput.addEventListener("input", () => {
        removeFullWidthDigits(janCodeInput);
    });
}

const stockInput = document.getElementById("stock");
if (stockInput) {
    stockInput.addEventListener("beforeinput", (event) => {
        const insertionTypes = [
            "insertText",
            "insertFromPaste",
            "insertFromDrop",
            "insertCompositionText"
        ];

        if (insertionTypes.includes(event.inputType) && event.data && fullWidthDigitRegex.test(event.data)) {
            event.preventDefault();
        }
    });

    stockInput.addEventListener("input", () => {
        removeFullWidthDigits(stockInput);
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