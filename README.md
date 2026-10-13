# 街頭回收隊

台灣街景的資源回收車與垃圾車遊戲，使用 TypeScript、Phaser 與 Vite。

[開啟遊戲](https://gtar.0928029003.org/) · [更新紀錄](CHANGELOG.md) · [專案與驗證紀錄](PROJECT.md)

## 遊戲內容

- 回收車：駛往三個收運站，將居民交付的物品分類，將不可回收物退回民眾。
- 垃圾車：將垃圾袋甩入壓縮車，完成壓縮並等待人員就位。
- 一般模式自行駕駛；簡單模式自動開車，收運操作仍由玩家完成。

## 開發

```bash
npm ci
npm run dev
```

```bash
npm run check
npm run test
npm run build
```

`npm run assets:optimize` 重建遊戲用小尺寸素材，原稿與圖片生成提示保留在 `assets/`。`npm run deploy:staging` 部署既有 Cloudflare 測試環境。

專案目前保留 35 張使用中分類素材，其中 15 張為不可回收物；枕頭與衛生紙原稿保留備用。素材來源與提示記錄於各素材目錄。
