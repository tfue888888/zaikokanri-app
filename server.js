
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");
const { count } = require("console");

const app = express();
const port = 3000;

require("dotenv").config();

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000
});

const createPurchaseOrdersTableSql = `
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        supplier_name VARCHAR(100) NOT NULL,
        quantity INT NOT NULL,
        expected_date DATE NULL,
        status ENUM('未入荷', '入荷済', 'キャンセル') DEFAULT '未入荷',
        order_note VARCHAR(255) NULL,
        created_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        received_at DATETIME NULL,
        INDEX idx_product_id (product_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
    )
`;

const safeQuery = (sql, params, callback) => {
    db.execute(sql, params, callback);
};

const isValidUserId = (value) => Number.isInteger(Number(value));
const isValidPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isValidJanCode = (value) => /^\d{13}$/.test(String(value).trim());

const writeOperationLog = (userId, productId, productName, action, callback) => {
    const safeUserId = isValidUserId(userId) ? Number(userId) : 0;

    db.query(
        `
            INSERT INTO operation_logs
            (user_id, product_id, product_name, action, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `,
        [safeUserId, productId, productName, action],
        (error) => {
            if (error) {
                console.error("操作ログ保存失敗:", error);
            }

            if (typeof callback === "function") {
                callback(error);
            }
        }
    );
};

const writeStockLog = (userId, productId, action, quantity, callback) => {
    const safeUserId = isValidUserId(userId) ? Number(userId) : 0;

    db.query(
        `
            INSERT INTO stock_logs
            (user_id, product_id, action, quantity, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `,
        [safeUserId, productId, action, quantity],
        (error) => {
            if (error) {
                console.error("在庫ログ保存失敗:", error);
            }

            if (typeof callback === "function") {
                callback(error);
            }
        }
    );
};

db.on("error", (err) => {
    console.error("MySQL接続エラー:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
        console.error("MySQL接続が切断されました。再接続を試みます。");
    }
});

db.query(createPurchaseOrdersTableSql, (tableErr) => {
    if (tableErr) {
        console.error("発注テーブル作成失敗:", tableErr);
        return;
    }
    console.log("MySQL接続成功");
});

app.post("/login",(req,res) => {
    const {employeeId,password} = req.body;
    const sql = `SELECT * FROM users WHERE employee_id = ?`;
    safeQuery(sql, [employeeId], (err, results) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(results);

        if (results.length === 0) {
    return res.json({
        success: false,
        message: "社員IDが存在しません"
    });
}
      bcrypt.compare(
    password,
    results[0].password,
    (err, result) => {

        if(err){
            return res.json({
                success:false
            });
        }

        if(!result){
            return res.json({
                success:false,
                message:"パスワードが違います"
            });
        }

        const user = results[0];
        const normalizedUser = {
            ...user,
            role: user.role || (employeeId === "EMP001" ? "admin" : "employee")
        };

        res.json({
            success:true,
            user: normalizedUser
        });

    }
);

});

    });    
        
app.get("/products", (req, res) => {

    const sql = "SELECT * FROM products";

    db.query(sql, (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "商品一覧の取得に失敗しました"
            });
        }

        res.json(results);

    });

});

app.get("/dashboard/product-count",(req,res) => {

    const sql = `SELECT COUNT (*) AS count FROM products`;
    db.query(sql,(err,results) => {
        if(err){
            console.log(err);

            return res.status(500).json({success:false});
        }
        res.json({success: true,count:results[0].count})
    })
})

app.get("/dashboard/lowstock",(req,res)=>{

    const sql =` SELECT COUNT(*) AS count
    FROM products
    WHERE stock <= 5`;

    db.query(sql,(err,results)=>{

        if(err){
            console.log(err);

            return res.status(500).json({
                success:false
            });
        }

        res.json({
            success:true,
            count:results[0].count
        });
    });
});

app.get("/dashboard/low-stock", (req, res) => {
    const sql = `SELECT COUNT(*) AS count
                 FROM products
                 WHERE stock <= 5`;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: "在庫不足数の取得に失敗しました" });
        }

        res.json({
            success: true,
            count: results[0].count
        });
    });
});

app.get("/dashboard/today-sales",(req,res) =>{

    const sql =`SELECT COALESCE(SUM(quantity),0) AS count
    FROM stock_logs
    WHERE action = '売上'
    AND DATE(created_at) = CURDATE()`;

    db.query(sql,(err,results) => {

        if(err){
            console.log(err);

            return
        res.status(500).json({
            success:false
        });
        }

        res.json({
            success:true,
            count:
            results[0].count
        });
    });
});

app.get("/dashboard/today-actions",(req,res) => {

    const sql = `SELECT COUNT(*) AS count
                FROM stock_logs
                WHERE DATE(created_at) = CURDATE()`;

    db.query(sql,(err,results) => {
        if(err){
            console.log(err);

            return res.status(500).json({
                success:false
            });
        }

        res.json({
            success:true,
            count:results[0].count
        });
    });

});

app.get("/purchase-orders", (req, res) => {
    const sql = `
        SELECT *
        FROM purchase_orders
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "発注一覧の取得に失敗しました。"
            });
        }

        res.json({ success: true, orders: results });
    });
});

app.post("/purchase-orders", (req, res) => {
    const {
        productId,
        supplierName,
        quantity,
        expectedDate,
        notes,
        userId
    } = req.body;

    const parsedProductId = Number(productId);
    const parsedUserId = Number(userId);
    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
        return res.status(400).json({ success: false, message: "対象商品を選択してください。" });
    }

    if (typeof supplierName !== "string" || supplierName.trim().length === 0 || supplierName.trim().length > 50) {
        return res.status(400).json({ success: false, message: "仕入先名は1〜50文字で入力してください。" });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ success: false, message: "発注数量は1以上で入力してください。" });
    }

    const productSql = `SELECT product_name FROM products WHERE id = ?`;

    db.query(productSql, [parsedProductId], (productErr, productResults) => {
        if (productErr) {
            console.log(productErr);
            return res.status(500).json({ success: false, message: "商品情報の確認に失敗しました。" });
        }

        if (productResults.length === 0) {
            return res.status(404).json({ success: false, message: "商品が見つかりません。" });
        }

        const orderNote = typeof notes === "string" ? notes.trim().slice(0, 255) : "";

        const insertSql = `
            INSERT INTO purchase_orders
            (product_id, product_name, supplier_name, quantity, expected_date, order_note, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, '未入荷')
        `;

        db.query(
            insertSql,
            [
                parsedProductId,
                productResults[0].product_name,
                supplierName.trim(),
                parsedQuantity,
                expectedDate || null,
                orderNote || null,
                Number.isInteger(parsedUserId) ? parsedUserId : null
            ],
            (insertErr) => {
                if (insertErr) {
                    console.log(insertErr);
                    return res.status(500).json({ success: false, message: "発注登録に失敗しました。" });
                }

                const logSql = `
                    INSERT INTO operation_logs
                    (user_id, product_id, product_name, action, created_at)
                    VALUES (?, ?, ?, ?, NOW())
                `;

                db.query(
                    logSql,
                    [
                        Number.isInteger(parsedUserId) ? parsedUserId : 0,
                        parsedProductId,
                        productResults[0].product_name,
                        "発注"
                    ],
                    (logErr) => {
                        if (logErr) {
                            console.log(logErr);
                        }

                        res.json({ success: true, message: "発注を登録しました。" });
                    }
                );
            }
        );
    });
});

app.put("/purchase-orders/:id/receive", (req, res) => {
    const orderId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(400).json({ success: false, message: "発注IDが不正です。" });
    }

    const selectSql = `SELECT * FROM purchase_orders WHERE id = ?`;

    db.query(selectSql, [orderId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: "発注情報の取得に失敗しました。" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "発注情報が見つかりません。" });
        }

        const order = results[0];

        const updateProductSql = `
            UPDATE products
            SET stock = stock + ?
            WHERE id = ?
        `;

        db.query(updateProductSql, [order.quantity, order.product_id], (stockErr) => {
            if (stockErr) {
                console.log(stockErr);
                return res.status(500).json({ success: false, message: "在庫への反映に失敗しました。" });
            }

            const deleteOrderSql = `
                DELETE FROM purchase_orders
                WHERE id = ?
            `;

            db.query(deleteOrderSql, [orderId], (deleteErr) => {
                if (deleteErr) {
                    console.log(deleteErr);
                    return res.status(500).json({ success: false, message: "発注履歴の削除に失敗しました。" });
                }

                const stockLogSql = `
                    INSERT INTO stock_logs
                    (user_id, product_id, action, quantity, created_at)
                    VALUES (?, ?, '入荷', ?, NOW())
                `;

                db.query(
                    stockLogSql,
                    [Number.isInteger(userId) ? userId : 0, order.product_id, order.quantity],
                    (logErr) => {
                        if (logErr) {
                            console.log(logErr);
                        }

                        const operationLogSql = `
                            INSERT INTO operation_logs
                            (user_id, product_id, product_name, action, created_at)
                            VALUES (?, ?, ?, ?, NOW())
                        `;

                        db.query(
                            operationLogSql,
                            [
                                Number.isInteger(userId) ? userId : 0,
                                order.product_id,
                                order.product_name,
                                "入荷"
                            ],
                            (opErr) => {
                                if (opErr) {
                                    console.log(opErr);
                                }

                                res.json({ success: true, message: "入荷を反映し、発注履歴を削除しました。" });
                            }
                        );
                    }
                );
            });
        });
    });
});

app.post("/stock/update", (req, res) => {
    const { id, action, userId, quantity } = req.body;

    const productId = Number(id);
    const parsedUserId = Number(userId);
    const requestedQuantity = Number(quantity);
    const effectiveQuantity = Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 1;

    if (!Number.isInteger(productId) || !Number.isInteger(parsedUserId)) {
        return res.status(400).json({
            success: false,
            message: "商品IDまたはユーザーIDが不正です"
        });
    }

    let change = 0;
    let logAction = "";

    if (action === "receive") {
        change = effectiveQuantity;
        logAction = "検品";
    } else if (action === "sale") {
        change = -effectiveQuantity;
        logAction = "売上";
    } else if (action === "discard") {
        change = -effectiveQuantity;
        logAction = "廃棄";
    } else {
        return res.status(400).json({
            success: false,
            message: "不正な操作です"
        });
    }

    // 現在の在庫を取得
    const checkSql = `
        SELECT stock
        FROM products
        WHERE id = ?
    `;

    db.query(checkSql, [productId], (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "在庫確認に失敗しました"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "商品が存在しません"
            });
        }

        const currentStock = results[0].stock;

        // 販売・廃棄で在庫不足なら更新しない
        if (change < 0 && currentStock < Math.abs(change)) {
            return res.json({
                success: false,
                message: "在庫が不足しています"
            });
        }

        // 在庫を更新
        const updateSql = `
            UPDATE products
            SET stock = stock + ?
            WHERE id = ?
        `;

        db.query(updateSql, [change, productId], (err, result) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "在庫更新に失敗しました"
                });
            }

            // 履歴を保存
            const logSql = `
                INSERT INTO stock_logs
                (user_id, product_id, action, quantity, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `;

            db.query(
    logSql,
    [parsedUserId, productId, logAction, effectiveQuantity],
    (err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "履歴保存に失敗しました"
            });
        }

        // 商品名を取得
        const productSql = `
            SELECT product_name
            FROM products
            WHERE id = ?
        `;

        db.query(productSql, [productId], (err, productResults) => {

            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "商品情報の取得に失敗しました"
                });
            }

            const productName = productResults[0].product_name;

            // 操作履歴を保存
            const operationLogSql = `
                INSERT INTO operation_logs
                (user_id, product_id, product_name, action, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `;

            db.query(
                operationLogSql,
                [
                    parsedUserId,
                    productId,
                    productName,
                    logAction
                ],
                (err) => {

                    if (err) {
                        console.log(err);

                        return res.status(500).json({
                            success: false,
                            message: "操作履歴の保存に失敗しました"
                        });
                    }

                    res.json({
                        success: true,
                        message: "在庫を更新しました"
                    });

                }
            );
        });
    }
);
        });

    });

});

app.post("/products", (req, res) => {
    const { productName, janCode, stock, userId } = req.body;
    const trimmedProductName = typeof productName === "string" ? productName.trim() : "";
    const normalizedJanCode = typeof janCode === "string" ? janCode.trim() : "";
    const parsedStock = Number(stock);
    const parsedUserId = Number(userId);

    if (trimmedProductName.length === 0 || trimmedProductName.length > 50) {
        return res.status(400).json({
            success: false,
            message: "商品名は1〜50文字で入力してください。"
        });
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        return res.status(400).json({
            success: false,
            message: "在庫は0以上の整数で入力してください。"
        });
    }

    if (!isValidJanCode(normalizedJanCode)) {
        return res.status(400).json({
            success: false,
            message: "JANコードは13桁の半角数字で入力してください。"
        });
    }

    const checkSql = `
        SELECT id
        FROM products
        WHERE product_name = ?
           OR jan_code = ?
    `;

    db.query(checkSql, [trimmedProductName, normalizedJanCode], (duplicateError, duplicateResults) => {
        if (duplicateError) {
            console.error("商品重複確認に失敗しました:", duplicateError);
            return res.status(500).json({
                success: false,
                message: "登録前の重複チェックに失敗しました。"
            });
        }

        if (duplicateResults.length > 0) {
            return res.json({
                success: false,
                message: "同じ商品名または同じJANコードの商品はすでに登録されています。"
            });
        }

        const insertSql = `
            INSERT INTO products (product_name, jan_code, stock)
            VALUES (?, ?, ?)
        `;

        db.query(insertSql, [trimmedProductName, normalizedJanCode, parsedStock], (insertError, insertResult) => {
            if (insertError) {
                console.error("商品追加に失敗しました:", insertError);
                return res.status(500).json({
                    success: false,
                    message: "商品追加に失敗しました。"
                });
            }

            const newProductId = insertResult.insertId;

            writeOperationLog(parsedUserId, newProductId, trimmedProductName, "追加", (logError) => {
                if (logError) {
                    return res.status(500).json({
                        success: false,
                        message: "操作履歴の保存に失敗しました。"
                    });
                }

                return res.json({ success: true });
            });
        });
    });
});

app.delete("/products/:id", (req, res) => {
    const productId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!Number.isInteger(productId) || !Number.isInteger(userId)) {
        return res.status(400).json({
            success: false,
            message: "商品IDまたはユーザーIDが不正です。"
        });
    }

    const selectSql = `SELECT product_name FROM products WHERE id = ?`;

    db.query(selectSql, [productId], (selectError, productResults) => {
        if (selectError) {
            console.error("商品取得に失敗しました:", selectError);
            return res.status(500).json({
                success: false,
                message: "商品の取得に失敗しました。"
            });
        }

        if (productResults.length === 0) {
            return res.status(404).json({
                success: false,
                message: "商品が見つかりません。"
            });
        }

        const productName = productResults[0].product_name;
        const deleteSql = `DELETE FROM products WHERE id = ?`;

        db.query(deleteSql, [productId], (deleteError) => {
            if (deleteError) {
                console.error("商品削除に失敗しました:", deleteError);
                return res.status(500).json({
                    success: false,
                    message: "商品削除に失敗しました。"
                });
            }

            writeOperationLog(userId, productId, productName, "削除", (logError) => {
                if (logError) {
                    return res.status(500).json({
                        success: false,
                        message: "操作履歴の保存に失敗しました。"
                    });
                }

                return res.json({
                    success: true,
                    message: "商品を削除しました。"
                });
            });
        });
    });
});

app.put("/products/:id", (req, res) => {
    const productId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const productName = typeof req.body.productName === "string" ? req.body.productName.trim() : "";
    const janCode = typeof req.body.janCode === "string" ? req.body.janCode.trim() : "";

    if (!Number.isInteger(productId) || !Number.isInteger(userId)) {
        return res.status(400).json({
            success: false,
            message: "商品IDまたはユーザーIDが不正です。"
        });
    }

    if (productName.length === 0 || productName.length > 50) {
        return res.status(400).json({
            success: false,
            message: "商品名は1〜50文字で入力してください。"
        });
    }

    if (!isValidJanCode(janCode)) {
        return res.status(400).json({
            success: false,
            message: "JANコードは13桁の半角数字で入力してください。"
        });
    }

    const checkSql = `
        SELECT id
        FROM products
        WHERE (product_name = ? OR jan_code = ?)
          AND id != ?
    `;

    db.query(checkSql, [productName, janCode, productId], (duplicateError, duplicateResults) => {
        if (duplicateError) {
            console.error("重複チェックに失敗しました:", duplicateError);
            return res.status(500).json({
                success: false,
                message: "重複チェックに失敗しました。"
            });
        }

        if (duplicateResults.length > 0) {
            return res.json({
                success: false,
                message: "同じ商品名または同じJANコードの商品がすでに存在します。"
            });
        }

        const updateSql = `
            UPDATE products
            SET product_name = ?, jan_code = ?
            WHERE id = ?
        `;

        db.query(updateSql, [productName, janCode, productId], (updateError, updateResult) => {
            if (updateError) {
                console.error("商品情報の更新に失敗しました:", updateError);
                return res.status(500).json({
                    success: false,
                    message: "商品情報の更新に失敗しました。"
                });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "商品が見つかりません。"
                });
            }

            writeOperationLog(userId, productId, productName, "編集", (logError) => {
                if (logError) {
                    return res.status(500).json({
                        success: false,
                        message: "操作履歴の保存に失敗しました。"
                    });
                }

                return res.json({
                    success: true,
                    message: "商品情報を更新しました。"
                });
            });
        });
    });
});

if(require.main === module ){
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, "0.0.0.0",() => {
        console.log(`サーバー起動:${PORT}`);
    });
}

app.get("/products/barcode/:barcode", (req, res) => {
    const { barcode } = req.params;

    const sql = `SELECT * FROM products WHERE jan_code = ? LIMIT 1`;

    db.query(sql, [barcode], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, message: "商品検索に失敗しました" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "該当する商品がありません" });
        }

        res.json({ success: true, product: results[0] });
    });
});

app.get("/operation-logs", (req, res) => {
    const keyword = (req.query.q || "").trim();
    const filterDate = (req.query.date || "").trim();
    const filterAction = (req.query.action || "").trim();
    const filterDays = Number(req.query.days || 0);

    let sql = `SELECT operation_logs.id, operation_logs.product_id,
                 operation_logs.product_name, operation_logs.action,
                 operation_logs.created_at,
                 users.employee_id,
                 users.name
               FROM operation_logs
               INNER JOIN users ON operation_logs.user_id = users.id`;

    const conditions = [];
    const params = [];

    if (keyword) {
        conditions.push(`(operation_logs.product_name LIKE ? OR users.name LIKE ?)`);
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (filterDate) {
        conditions.push(`DATE(operation_logs.created_at) = ?`);
        params.push(filterDate);
    }

    if (filterAction) {
        conditions.push(`operation_logs.action = ?`);
        params.push(filterAction);
    }

    if (Number.isFinite(filterDays) && filterDays > 0) {
        conditions.push(`operation_logs.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`);
        params.push(filterDays);
    }

    if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY operation_logs.created_at DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "操作履歴の取得に失敗しました。"
            });
        }

        res.json({ success: true, logs: results });
    });
});
app.db = db;

module.exports = app;