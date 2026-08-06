async function loadProducts() {
    try {
        const response = await fetch("/products");

        if (!response.ok) {
            throw new Error("商品データの取得に失敗しました");
        }

        const products = await response.json();
        const productList = document.getElementById("productList");

        if (!productList) {
            return;
        }

        productList.innerHTML = "";

        if (products.length === 0) {
            productList.innerHTML = "<p>商品がありません</p>";
            return;
        }

        products.forEach(product => {
            let alertMessage = "";
            if(product.stock <= 5){
                alertMessage = `<p class="stock-alert">⚠ 在庫不足</p>`;
            }
            productList.innerHTML += `
                <div class="product-card">
                    <h3>${product.product_name}</h3>
                    <p>在庫：${product.stock}</p>
                    ${alertMessage}
                    <button type="button" class="stock-btn" data-id="${product.id}" data-action="receive">検品</button>
                    <button type="button" class="stock-btn" data-id="${product.id}" data-action="sale">販売</button>
                    <button type="button" class="stock-btn" data-id="${product.id}" data-action="discard">廃棄</button>
                </div>
            `;
        });
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
        const button = event.target.closest(".stock-btn");

        if (!button) {
            return;
        }

        const id = button.dataset.id;
        const action = button.dataset.action;

        updateStock(id, action);
    });
}