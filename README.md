# RoomCheck — 教室設備管理システム

## デプロイ手順（Railway）

1. GitHubアカウントを作る → https://github.com
2. このフォルダをGitHubにアップロード
3. Railway無料登録 → https://railway.app
4. 「Deploy from GitHub」でこのリポジトリを選択
5. 自動でURLが発行される

## ファイル構成
```
roomcheck-server/
├── server.js        # バックエンド
├── package.json     # 依存関係
├── railway.json     # Railway設定
├── public/
│   └── index.html   # フロントエンド
└── data/            # 自動生成（データ保存）
    └── roomcheck.json
```
