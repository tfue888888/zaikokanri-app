アプリ名：在庫管理アプリSUGI

内容：コンビニや小売店の販売や廃棄による在庫の変動をこのアプリ一つで管理し、発注まで行えます。店員側と店長側で機能を分けることでセキュリティ面に配慮しつつ安全に在庫の管理が行えます。

画面の写真

<div style="display: grid; grid-template-columns: repeat(2, minmax(120px, 1fr)); gap: 10px; max-width: 320px;">
  <img src="images/108187.jpg" alt="在庫管理画面" style="width: 30%; height: 30%; display: block; border-radius: 6px;">
  <img src="images/108185.jpg" alt="商品一覧画面" style="width: 30%; height: 30%; display: block; border-radius: 6px;">
  <img src="images/108186.jpg" alt="発注画面" style="width: 30%; height: 30%; display: block; border-radius: 6px;">
  <img src="images/108184.jpg" alt="ログイン画面" style="width: 30%; height: 30%; display: block; border-radius: 6px;">
</div>

デモ：実際にアプリを操作できます。（デモアカウント：社員ID：EMP001,パスワード：tanaka123）

Webアプリ：https://zaikokanri-app-one.vercel.app/  API:https://zaikokanri-app.onrender.com

開発背景・目的

実際の店舗業務を想定して、商品の在庫数をWeb上で管理できる在庫管理システムを開発しました。私自身学生時代セブンイレブンで働いており、その際に使っていたモバイル型在庫管理アプリが真っ先に制作物のアイデアとして思いついたので制作を始めました。さらにこの開発を通じて、フロントエンドだけでなく、API・バックエンド・データベース・デプロイまで含めたWebアプリ開発の一連の流れを学ぶことを目的としました。

主な機能<br>
ログイン機能<br>  商品一覧表示<br>  商品在庫数の表示<br>  検品、販売、廃棄による在庫変更<br>  在庫不足アラート<br>  在庫変動履歴の記録<br>  MySQLでのデータ管理<br>  従業員の操作履歴管理<br