# 開發守則

- 保持遊戲規則、渲染、資料設定分離；新增玩法先放入 `src/game/`，不要把規則塞進 Phaser Scene。
- 所有邏輯更新必須經 `FixedStepClock`；渲染可使用插值，但不得造成幀率依賴。
- 可調數值集中於 `src/config/balance.ts`，場景不得散落魔術數字。
- 第一版只用程式生成的幾何圖形；新增外部素材前需確認授權與來源。
- 每一功能階段至少執行 `npm run check`、`npm run test`、`npm run build`。
- 不修改其他專案、Nginx 或 Cloudflare 正式路由，除非該變更已明確列入目前工作並通過設定驗證。
- Cloudflare 預設只部署 staging；production 部署或自訂網域切換需要明確核對 DNS、route 與回滾方案。
