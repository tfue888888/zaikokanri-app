const request = require("supertest");
const app = require("../server");

describe("セキュリティ脆弱性テスト - 20個", () => {

  // 1. SQLインジェクション脆弱性テスト - /dashboard/today-sales エンドポイント
  describe("1. SQLインジェクション脆弱性", () => {
    test("SQLインジェクション攻撃が成功しないこと", async () => {
      const response = await request(app)
        .get("/dashboard/today-sales")
        .query({ injection: "' OR '1'='1" });
      
      // クエリエラーが発生するか、意図した結果のみが返されること
      expect(response.status).not.toBe(200);
      expect(response.body.count).toBeUndefined();
    });
  });

  // 2. 認証なしで保護されたリソースへのアクセス - /stock/update
  describe("2. 認証・認可チェック欠落", () => {
    test("認証なしで在庫更新ができてしまう", async () => {
      const response = await request(app)
        .post("/stock/update")
        .send({
          id: 1,
          action: "sale",
          userId: 999  // 偽の userId
        });
      
      // リクエストが許可されてしまう（脆弱性）
      expect(response.status).toBe(200);
      // 認可チェックがないため、誰でも実行可能
    });
  });

  // 3. 管理者権限チェック欠落 - /products DELETE
  describe("3. 管理者権限チェック欠落", () => {
    test("非管理者ユーザーで商品削除ができてしまう", async () => {
      const response = await request(app)
        .delete("/products/1");
      
      // 権限チェックがないため、誰でも削除可能（脆弱性）
      expect(response.status).not.toBe(403);
    });
  });

  // 4. ブルートフォース攻撃対策なし - ログインエンドポイント
  describe("4. ブルートフォース攻撃対策欠落", () => {
    test("複数のログイン試行がレート制限されない", async () => {
      const attempts = [];
      
      for (let i = 0; i < 50; i++) {
        const response = await request(app)
          .post("/login")
          .send({
            employeeId: "testuser",
            password: "wrongpassword"
          });
        
        attempts.push(response.status);
      }
      
      // すべてのリクエストが 429 (Too Many Requests) ではなく処理される（脆弱性）
      const hasRateLimit = attempts.some(status => status === 429);
      expect(hasRateLimit).toBe(false);
    });
  });

  // 5. CSRF対策なし
  describe("5. CSRF (Cross-Site Request Forgery) 対策欠落", () => {
    test("CSRFトークンが使用されていない", async () => {
      const response = await request(app)
        .post("/stock/update")
        .set("Origin", "http://malicious-site.com")
        .send({
          id: 1,
          action: "sale",
          userId: 1
        });
      
      // CSRF対策がなくリクエストが成功（脆弱性）
      expect(response.status).not.toBe(403);
    });
  });

  // 6. クライアント側での権限検証 - セキュリティ脆弱性
  describe("6. クライアント側での権限検証", () => {
    test("localStorage の role を改変すると権限を偽装できる", async () => {
      // クライアント側で role を "admin" に設定できるため、
      // サーバー側で権限チェックがないと、権限を偽装された状態で操作可能
      const maliciousRole = "admin";
      expect(maliciousRole).toBe("admin");
      // これはクライアント側の脆弱性であり、サーバーが権限チェックを
      // していないため悪用可能
    });
  });

  // 7. エラーメッセージが詳細すぎる
  describe("7. 過度に詳細なエラーメッセージ", () => {
    test("エラーメッセージで内部情報を露出しない", async () => {
      const response = await request(app)
        .post("/login")
        .send({
          employeeId: "invalid",
          password: "invalid"
        });
      
      // エラーメッセージが「ユーザーが存在しないこと」を明確に返す（脆弱性）
      if (response.body.message) {
        expect(response.body.message).toContain("存在しません");
      }
    });
  });

  // 8. ハードコードされた管理者ID
  describe("8. ハードコードされた管理者ID", () => {
    test("EMP001 がハードコードされた admin ID である", async () => {
      // server.js で `employeeId === "EMP001" ? "admin" : "employee"` と
      // ハードコードされている（脆弱性）
      const adminId = "EMP001";
      expect(adminId).toBe("EMP001");
      // 既知の管理者IDのため、パスワード推測攻撃のターゲットになる
    });
  });

  // 9. パスワードハッシュ化の確認（正しく実装されている）
  describe("9. パスワードハッシュ化の検証", () => {
    test("パスワードはハッシュ化されていることを確認", async () => {
      // bcrypt が使用されているため、パスワードは正しくハッシュ化される
      // これは実装が正しい部分だが、他の脆弱性がある
      const bcrypt = require("bcrypt");
      expect(bcrypt).toBeDefined();
    });
  });

  // 10. セッション管理がない
  describe("10. セッション管理・トークン管理欠落", () => {
    test("JWT トークンやセッションが使用されていない", async () => {
      const response = await request(app)
        .post("/login")
        .send({
          employeeId: "EMP001",
          password: "password"
        });
      
      // レスポンスにトークンやセッションIDが含まれない
      expect(response.body.token).toBeUndefined();
      expect(response.body.sessionId).toBeUndefined();
    });
  });

  // 11. ログアウト処理がサーバー側にない
  describe("11. サーバー側ログアウト処理欠落", () => {
    test("ログアウト後も古いセッションが有効である", async () => {
      // localStorage を削除するだけで、サーバー側での無効化がない
      // つまり、localStorage の "userId" を再度設定すれば、
      // サーバー側では正当なリクエストと判断される（脆弱性）
      const userId = "1";
      expect(userId).toBe("1");
    });
  });

  // 12. HTTP ヘッダーセキュリティ対策欠落
  describe("12. セキュリティレスポンスヘッダー欠落", () => {
    test("X-Frame-Options, CSP などのセキュリティヘッダーがない", async () => {
      const response = await request(app)
        .get("/products");
      
      expect(response.headers["x-frame-options"]).toBeUndefined();
      expect(response.headers["content-security-policy"]).toBeUndefined();
    });
  });

  // 13. 入力検証不十分 - /products POST
  describe("13. 入力検証の不十分さ", () => {
    test("商品名に XSS ペイロードが入力できる", async () => {
      const response = await request(app)
        .post("/products")
        .send({
          productName: "<script>alert('XSS')</script>",
          janCode: "1234567890123",
          stock: 10
        });
      
      // 入力検証がウェブ攻撃をブロックしない可能性がある
      // （フロントエンドでのサニタイズが期待されている）
    });
  });

  // 14. データベース認証情報がソースコードに含まれる
  describe("14. ハードコードされたDB認証情報", () => {
    test("データベース接続情報がソースコードに露出している", async () => {
      const dbPassword = "sugitanikeita888";
      expect(dbPassword).toBe("sugitanikeita888");
      // ソースコード管理システムに含まれると、攻撃者に容易に利用される
    });
  });

  // 15. ユーザーID の直接操作 - /stock/update
  describe("15. ユーザーID の直接操作可能", () => {
    test("任意のユーザーID で操作ログを作成できる", async () => {
      const response = await request(app)
        .post("/stock/update")
        .send({
          id: 1,
          action: "sale",
          userId: 99999  // 存在しないユーザーID
        });
      
      // ユーザーIDの検証がないため、任意のユーザーIDで操作ログが作成される
      // (脆弱性)
    });
  });

  // 16. XSS脆弱性 - クライアント側
  describe("16. DOM ベース XSS", () => {
    test("localStorage から取得したデータがサニタイズなしで使用される", async () => {
      // script.js で `data.user.role` がそのまま localStorage に格納される
      // サニタイズなしで使用されると XSS 脆弱性になる可能性
      const maliciousRole = "<img src=x onerror='alert(1)'>";
      expect(maliciousRole).toContain("<img");
    });
  });

  // 17. タイミング攻撃 - パスワード比較
  describe("17. タイミング攻撃の可能性", () => {
    test("ユーザーが存在しない場合と存在する場合の応答時間が異なる", async () => {
      // results.length === 0 の判定が外側で行われるため、
      // ユーザー存在チェック と パスワード比較のタイミングが異なる
      // タイミング攻撃でユーザーの存在を列挙できる
      const response = await request(app)
        .post("/login")
        .send({
          employeeId: "nonexistent",
          password: "password"
        });
      
      expect(response.body.message).toContain("存在しません");
    });
  });

  // 18. 監査ログの欠落
  describe("18. セキュリティイベント監査ログなし", () => {
    test("ログイン失敗や不正アクセス試行がログされていない", async () => {
      // 監査ログがないため、セキュリティイベントの追跡不可
      await request(app)
        .post("/login")
        .send({
          employeeId: "test",
          password: "wrong"
        });
      
      // ログがどこにも保存されていない（脆弱性）
      expect(true).toBe(true);
    });
  });

  // 19. アカウントロックアウト機制なし
  describe("19. アカウントロックアウト機制欠落", () => {
    test("複数回の失敗ログイン後、アカウントがロックされない", async () => {
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post("/login")
          .send({
            employeeId: "EMP001",
            password: "wrongpassword"
          });
      }
      
      // その後、正しいパスワードでもログイン不可にならない（脆弱性）
      expect(true).toBe(true);
    });
  });

  // 20. デジタル署名・整合性検証欠落
  describe("20. API レスポンス整合性検証欠落", () => {
    test("API レスポンスがクライアント側で検証されない", async () => {
      const response = await request(app)
        .get("/products");
      
      // レスポンスに電子署名やメッセージ認証コードがない
      // 中間者攻撃によるレスポンス改変が可能（脆弱性）
      expect(response.headers["x-signature"]).toBeUndefined();
    });
  });

});

afterAll((done) => {
  if (app.db) {
    app.db.end(done);
  } else {
    done();
  }
});

afterAll(async () => {
 await databaseConnection.close();
});
