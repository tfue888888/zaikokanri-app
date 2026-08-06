
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const path = require("path");

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

app.post("/login",(req,res) => {
    const {employeeId,password} = req.body;
    const sql = `SELECT*FROM users WHERE employee_id = ?`;
    db.query(sql,[employeeId],(err,results) => {
        if(err){console.log(err);
            return;}
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

        res.json({
            success:true,
            user:results[0]
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

    const checkSql = `SELECT stock FROM products WHERE id = ?`;
    
    const updateSql = `
        UPDATE products
        SET stock = stock + ?
        WHERE id = ?
    `;

    db.query(updateSql, [change, productId], (err, result) => {
        db.query(checkSql,[productId],(err,results) => {
        if(err){
            console.log(err);

            return res.json({
              success:false
            });

        if(results.length === 0){
            return res.json({
                success:false,
                message:"商品が存在しません"
            })
        }
        
        const currentStock = results[0].stock;
        if(change === -1 && currentStock <= 0){
            return res .json({
                success:false,
                message:"在庫が不足しています"
            })
        }
        }
    });
        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "在庫更新に失敗しました"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "対象の商品が見つかりません"
            });
        }

        const logSql = `
            INSERT INTO stock_logs (user_id, product_id, action, quantity, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;

       db.query(logSql, [parsedUserId, productId, logAction, Math.abs(change)], (err) => {

    console.log(err);

    if (err) {
        return res.json({
            success: false
        });
    }

    res.json({
        success: true
    });

});
    });
});




app.listen(port, () => {
    console.log(`サーバー起動：http://localhost:${port}`);
});

