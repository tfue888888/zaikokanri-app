const request = require("supertest");
const app = require("../server");
//在庫APIのテスト
describe("在庫APIテスト", () => {
//検品で在庫1増えるテスト
    test("検品すると在庫が1増える", async () => {
        const response = await request(app).post("/stock/update").send({
            id:1,
            action:"receive",
            userId:1
        });
    console.log(response.body.success);
    expect(response.body.success).toBe(true);
    })
})

afterAll((done) => {
    app.db.end(done);
});

