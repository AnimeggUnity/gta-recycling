# 危險物像素素材 v1

使用內建 image_gen 生成，沿用 `assets/styles/gta-recycling-pixel-v1.json` 的 inventory 樣式與既有金屬罐原圖風格參考。

- `gas-canister.png`：便攜高壓氣瓶，頂部閥門、銀灰金屬與低飽和紅色帶。
- `lithium-battery.png`：行動電源，扁長藍灰外殼與充電孔。
- `hazard-bag-gas.png`：打結深青黑垃圾袋，破口露出氣瓶。
- `hazard-bag-battery.png`：使用氣瓶危險袋為編輯目標，替換內容物，保留袋形與光源。
- `normal-bag.png`：使用同一袋形封閉破口、移除氣瓶，作為一般垃圾袋。

`prompts.json` 保存每張實際使用的完整 prompt 與參考圖；`manifest.json` 記錄原始輸出來源、尺寸及 alpha。`index.html` 與 `preview.png` 提供大圖和 48／72／96px 預覽。

原始 PNG 完整保留透明背景，未縮圖、重新量化或校正像素網格。圖片採用 64×64 邏輯像素的風格要求，不代表原稿實際尺寸為 64×64。紅框、警告與退回提示由遊戲介面呈現，未烘焙進素材。

三款袋子已接入 TossPanel，遊戲用最近鄰縮圖、256px 透明無損 WebP 位於 `assets/optimized/toss/`，生成流程為 `npm run assets:optimize`。氣瓶和行動電源單獨素材保留作參考，不預載進遊戲。三款袋子及對應玩法已隨 2026-10-14 Cloudflare staging 版本發布。上次部署目錄中的 SVG 是構圖草稿，這批 PNG 是依現有素材風格生成的版本。
