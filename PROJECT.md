# 台灣資源回收車（GTA 1 風格）

## 目標

製作純前端、單人遊玩的 2D 俯視角資源回收車遊戲。玩家駕駛開放式回收車，依路線收運並前往收運站；隨車人員與居民以狀態機驅動。

## 技術決策

- Phaser 3、TypeScript、Vite。
- 遊戲規則在 `src/game/`；場景與渲染在 `src/scenes/`；可調資料在 `src/config/`；HUD 在 `src/ui/`。
- 邏輯使用 60Hz 固定時間步長；渲染不直接改變遊戲狀態。
- 第一版以 Phaser 圖形生成幾何物件，不提交正式美術資產。
- Cloudflare Workers Static Assets 用於發布；僅允許先部署 `staging` 環境。

## 里程碑

1. **已完成：基礎駕駛場景**：可操控車輛、台灣街道幾何場景、車斗與人員可視化、固定時間步長、HUD。
2. **已完成：單站停靠循環**：到站停妥、居民排隊、接收、搬運、分類、容量限制、整理與安全離站鎖定。
3. **已完成：車輛動態與怒氣**：加速度、緊急煞車、橫向加速度、jerk 與坑洞會造成人員晃動、怒氣及作業效率下降。
4. **已完成：路線任務**：三站路線、道路圖 A* 導航、動態 ETA、預定抵達時間、延誤與任務結算。
5. **下一階段：發布收尾**：效能與操作體驗整理、Cloudflare 自訂網域及正式發布核對程序。

## 開發與驗證

```bash
npm install
npm run dev
npm run check
npm run test
npm run build
```

`npm run deploy:staging` 只會部署名為 `gta-recycling-staging` 的測試 Worker，未設定正式自訂網域或 route。

原始碼位於 `/mnt/disk3/dev/projects/gta-recycling`；`npm run publish:local` 將 build 產物同步至 `/var/www/gta-recycling`。本機 Nginx 設定的來源檔在 `deploy/nginx.gta.0928029003.org.conf`，僅提供該網站目錄給 `gta.0928029003.org`。

## 發布注意事項

目標網域是 `gta.0928029003.org`。在將測試版綁定至該網域前，必須確認 Cloudflare DNS 中已有 proxied 記錄，且發布者具有 DNS 寫入權限；目前專案不會自行變更 production route。
