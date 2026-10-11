# 開發守則

- 保持遊戲規則、渲染、資料設定分離；新增玩法先放入 `src/game/`，不要把規則塞進 Phaser Scene。
- 所有邏輯更新必須經 `FixedStepClock`；渲染可使用插值，但不得造成幀率依賴。
- 可調數值集中於 `src/config/balance.ts`，場景不得散落魔術數字。
- 第一版只用程式生成的幾何圖形；新增外部素材前需確認授權與來源。
- 每一功能階段至少執行 `npm run check`、`npm run test`、`npm run build`。
- 輸入變更需驗證持續油門＋左右換向、多指分別放開、pointercancel／blur 清理；介面需檢查手機直向、橫向及電腦。沿用路線座標時，畫面「向上」與「右側」由 `DISPLAY.roadRotation` 決定，勿只改單一系統座標。
- 手動分類需將物品實例 ID 與素材 ID 分開；UI 投放指令必須在固定時間步長處理並核對目前站點的佇列，不能因分類清空而跳過居民交付或人員安全就位。
- 不修改其他專案、Nginx 或 Cloudflare 正式路由，除非該變更已明確列入目前工作並通過設定驗證。
- Cloudflare 預設只部署 staging；production 部署或自訂網域切換需要明確核對 DNS、route 與回滾方案。
