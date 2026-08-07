const logoutBtn = document.getElementById("logoutBtn");
let allProducts = [];
let activeSearchTerm = "";
let currentPage = 1;
const pageSize = 10;
const productFormSection = document.getElementById("productFormSection");

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

function renderCurrentProducts() {
    const filteredProducts = getFilteredProducts();
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pagedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

    renderProducts(pagedProducts);
    renderPageNumbers(filteredProducts.length);
}

async function loadProducts() {
    try {
        const response = await fetch("/products");

        if (!response.ok) {
            throw new Error("商品データの取得に失敗しました");
        }

        const products = await response.json();
        allProducts = products;
        renderCurrentProducts();
    } catch (error) {
        console.error(error);
        const productList = document.getElementById("productList");

        if (productList) {
            productList.innerHTML = "<p>商品データの取得に失敗しました</p>";
        }
    }
}

loadProducts();

async function updateStock(id, action) {

    try {
        const userId = Number(localStorage.getItem("userId"));

        if (!Number.isInteger(userId)) {
            alert("ログイン情報が見つかりません。再ログインしてください。");
            return;
        }

        const response = await fetch("/stock/update", {
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

async function deleteProduct(id) {
    try {
        const response = await fetch(`/products/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
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
        const response = await fetch(`/products/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productName,
                janCode
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
        const response = await fetch("/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productName,
                janCode,
                stock
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

const searchInput = document.getElementById("searchProduct");
const searchButton = document.getElementById("searchProductBtn");
const resetSearchButton = document.getElementById("resetSearchBtn");

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

if (resetSearchButton && searchInput) {
    resetSearchButton.addEventListener("click", () => {
        activeSearchTerm = "";
        searchInput.value = "";
        currentPage = 1;
        renderCurrentProducts();
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
