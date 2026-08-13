
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");
const { count } = require("console");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

const db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"sugitanikeita888",
    database:"stock_management"
});

db.connect((err) => {
    if(err){
        console.log(err);
        return;
    }
    console.log("MySQL接続成功");
});

const safeQuery = (sql, params, callback) => {
    // SQLインジェクション対策:
    // 1) ユーザー入力を SQL 文字列に直接連結しない
    // 2) プレースホルダー ? を使って値を渡す
    db.execute(sql, params, callback);
};

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

            return
            res.status(500).json({success:false});
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

            return
            res.status(500).json({
                success:false
            });
        }

        res.json({
            success:true,
            count:results[0].count
        });
    });
});

app.get("/dashboard/today-sales",(req,res) =>{

    const sql =`SELECT COALESCE(SUM(quantity),0) AS count
    FROM stock_logs
    WHERE action = '売上
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

app.get("/dashbaord/today-actions",(req,res) => {

    const sql = `SELECT COUNT(*) AS count
                FROM stock_logs
                WHERE DATE(create_at) = CURDATE()`;

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
            count:results[0].count
        });
    });

});
app.post("/stock/update", (req, res) => {
    const { id, action, userId } = req.body;

    const productId = Number(id);
    const parsedUserId = Number(userId);

    if (!Number.isInteger(productId) || !Number.isInteger(parsedUserId)) {
        return res.status(400).json({
            success: false,
            message: "商品IDまたはユーザーIDが不正です"
        });
    }

    let change = 0;
    let logAction = "";

    if (action === "receive") {
        change = 1;
        logAction = "検品";
    } else if (action === "sale") {
        change = -1;
        logAction = "売上";
    } else if (action === "discard") {
        change = -1;
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

        // 販売・廃棄で在庫が0なら更新しない
        if (change === -1 && currentStock <= 0) {
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
                [parsedUserId, productId, logAction, Math.abs(change)],
                (err) => {

                    if (err) {
                        console.log(err);
                        return res.status(500).json({
                            success: false,
                            message: "履歴保存に失敗しました"
                        });
                    }

                    res.json({
                        success: true,
                        message: "在庫を更新しました"
                    });

                }
            );

        });

    });

});

app.post("/products", (req, res) => {
    return res.json({
      success:false,
      message:"権限がありません"
    });

    const { productName, janCode, stock } = req.body;

    if (typeof productName !== "string" || productName.trim().length === 0 || productName.trim().length > 50) {
        return res.status(400).json({
            success: false,
            message: "商品名は1〜50文字で入力してください。"
        });
    }

    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) {
        return res.status(400).json({
            success: false,
            message: "在庫は0以上の整数で入力してください。"
        });
    }

    const checkSql = `
        SELECT id
        FROM products
        WHERE product_name = ?
           OR jan_code = ?
    `;

    db.query(checkSql, [productName, janCode], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "登録前の重複チェックに失敗しました。"
            });
        }

        if (results.length > 0) {
            return res.json({
                success: false,
                message: "同じ商品名または同じJANコードの商品はすでに登録されています。"
            });
        }

        const sql = `INSERT INTO products
(product_name,jan_code,stock)
VALUE(?,?,?)`;

        db.query(
            sql,
            [productName, janCode, stock],
            (err) => {
                if (err) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: "商品追加に失敗しました。"
                    });
                }

                res.json({
                    success: true
                });
            }
        );
    });
});

app.delete("/products/:id", (req, res) => {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
        return res.status(400).json({
            success: false,
            message: "商品IDが不正です。"
        });
    }

    const sql = `
        DELETE FROM products
        WHERE id = ?
    `;

    db.query(sql, [productId], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "商品削除に失敗しました。"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "商品が見つかりません。"
            });
        }

        res.json({
            success: true,
            message: "商品を削除しました。"
        });
    });
});

app.put("/products/:id", (req, res) => {
    const productId = Number(req.params.id);
    const { productName, janCode } = req.body;

    if (!Number.isInteger(productId) || !productName || !/^\d{13}$/.test(janCode)) {
        return res.status(400).json({
            success: false,
            message: "商品名とJANコードを正しく入力してください。JANコードは13桁の半角数字です。"
        });
    }

    const checkSql = `
        SELECT id
        FROM products
        WHERE (product_name = ? OR jan_code = ?)
          AND id != ?
    `;

    db.query(checkSql, [productName, janCode, productId], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "商品情報更新前の重複チェックに失敗しました。"
            });
        }

        if (results.length > 0) {
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

        db.query(updateSql, [productName, janCode, productId], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    message: "商品情報の更新に失敗しました。"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "商品が見つかりません。"
                });
            }

            res.json({
                success: true,
                message: "商品情報を更新しました。"
            });
        });
    });
});

if(require.main === module ){
    app.listen(3000,() => {
        console.log("サーバー起動:http://localhost:3000");
    });
}
app.db = db;

module.exports = app;