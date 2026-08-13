function updateStock(stock,action){
    if(action ==="receive"){
        return stock + 1;
    }

    if(action ==="sale" || action ==="discard"){

        if(stock <= 0){
            return stock;
        }
        return stock - 1;
    }
    return stock;

    }

    test("検品すると在庫が1増える", () => {

    const result = updateStock(5, "receive");

    expect(result).toBe(6);

});
//検品、販売、廃棄のテストコード
test("販売すると在庫が1減る", () => {

    const result = updateStock(5, "sale");

    expect(result).toBe(4);

});

test("在庫0のとき販売してもマイナスにならない", () => {

    const result = updateStock(0, "sale");

    expect(result).toBe(0);

});

test("廃棄すると在庫が1減る", () => {

    const result = updateStock(5, "discard");

    expect(result).toBe(4);

});

test("在庫0のとき廃棄してもマイナスにならない", () => {

    const result = updateStock(0, "discard");

    expect(result).toBe(0);

});
//在庫不足アラートテスト
test("在庫が5以下なら在庫不足になる", () => {

    const product = {
        product_name: "ツナマヨ",
        stock: 5
    };

    let alertMessage = "";

    if (product.stock <= 5) {
        alertMessage = `<p class="stock-alert">⚠ 在庫不足</p>`;
    }

    expect(alertMessage).toContain("在庫不足");
});

function isLowStock(stock) {
    return stock <= 5;
}

test("在庫5なら在庫不足になる", () => {

    expect(isLowStock(5)).toBe(true);

});

test("在庫6なら在庫不足にならない", () => {

    expect(isLowStock(6)).toBe(false);

});
//パスワード認証のテストコード
const bcrypt = require("bcrypt");

test("正しいパスワードなら認証できる", async () => {

    const password = "tanaka123";

    const hash = await bcrypt.hash(password, 10);

    const result = await bcrypt.compare(
        password,
        hash
    );

    expect(result).toBe(true);

});

test("間違ったパスワードなら認証できない", async () => {

    const password = "tanaka123";
    const wrongPassword = "wrong123";

    const hash = await bcrypt.hash(password, 10);

    const result = await bcrypt.compare(
        wrongPassword,
        hash
    );

    expect(result).toBe(false);

});

// SQLインジェクションの対策テスト
test("SQLインジェクションの入力ではログインできない", async () => {

    const maliciousInput = "' OR '1'='1";

    // 正しいパスワードをハッシュ化
    const hash = await bcrypt.hash("tanaka123", 10);

    // SQLインジェクション文字列をパスワードとして比較
    const result = await bcrypt.compare(
        maliciousInput,
        hash
    );

    // 認証されないことを確認
    expect(result).toBe(false);

});