# 回收物像素試樣 v1

本輪依前一輪五類試樣建立，每類五種外形，共 25 張獨立透明 PNG；不是原始 14 種物品各五張。未修改玩法、線上網站或部署設定。

## 預覽與清單

- `index.html`：五類各五張的比較頁，直接以瀏覽器開啟；格紋為預覽底色，不在圖片內。
- `preview.png`：比較頁的瀏覽器截圖，僅供選樣，不作為遊戲素材圖集。
- `manifest.json`：素材名稱、相對路徑與建議遊戲分類。
- `prompts.json`：每張圖實際使用的完整生成提示，方便重製與微調。

### 寶特瓶

- `pet-bottle/01-tall-ribbed.png`：細長圓瓶
- `pet-bottle/02-short-wide.png`：矮胖圓瓶
- `pet-bottle/03-square-body.png`：方身瓶
- `pet-bottle/04-waisted-sport.png`：腰身運動瓶
- `pet-bottle/05-crushed-bent.png`：壓扁折彎瓶

### 紙餐盒

- `paper-meal-box/01-rectangular-clamshell.png`：長方掀蓋盒
- `paper-meal-box/02-square-folded.png`：方形折角盒
- `paper-meal-box/03-round-bowl.png`：圓形紙碗
- `paper-meal-box/04-oval-tray.png`：橢圓紙托盤
- `paper-meal-box/05-trapezoid-box.png`：梯形折紙盒

### 易開罐／罐頭

- `metal-can/01-standard-soda.png`：標準飲料罐
- `metal-can/02-tall-slim.png`：細長飲料罐
- `metal-can/03-short-wide.png`：矮寬易開罐
- `metal-can/04-ribbed-food.png`：波紋罐頭
- `metal-can/05-crushed-flat.png`：壓扁易開罐

### 揉紙

- `crumpled-paper/01-round-ball.png`：圓球紙團
- `crumpled-paper/02-pointed-wad.png`：尖角紙團
- `crumpled-paper/03-flattened-star.png`：扁星形紙團
- `crumpled-paper/04-loose-folded.png`：鬆散摺皺紙
- `crumpled-paper/05-elongated-twist.png`：長條扭皺紙

### 衛生紙（退回）

- `used-tissue/01-soft-wad.png`：鬆軟紙團
- `used-tissue/02-folded-napkin.png`：折疊餐巾
- `used-tissue/03-damp-flat.png`：濕扁紙團
- `used-tissue/04-torn-strip.png`：撕裂長條
- `used-tissue/05-open-fan.png`：展開扇形

## 製作與來源

使用內建 `image_gen` 生成，共 25 次獨立生成；無外部參考圖片或品牌素材。原始生成檔保留，專案內為副本。生成來源與提示已記錄，這是 AI 生成素材，不宣稱具有獨占性或已完成法律審查。

共同提示規格：64×64 邏輯像素風格、硬邊、大色塊、深青描邊、奶油白與低飽和配色、左上光源、偏俯視三分之四角度、單一完整物件、透明背景、無品牌／文字／地面陰影。要求外形差異，而非僅換色。

## 接入前限制

- 「64×64 邏輯像素風格」是提示要求，不代表生成檔實際為 64×64。原始 PNG 尺寸依工具輸出保留，未縮圖或改動原圖。
- 24 張原圖為 1254×1254；橢圓紙托盤為 1024×1536，最大 alpha 為 254（接近完全不透明），需在正式輸出階段校正。各檔精確尺寸與 alpha 範圍記錄於清單。
- 目前是風格試樣，不是已校正的嚴格像素網格或最終 sprite atlas。接入前要確認縮小辨識度、修整邊緣並統一尺寸。
- 紙餐盒以紙材質與折角設計；揉紙以印刷痕跡區分衛生紙。實際分類須由遊戲資料另行決定。
- `suggestedTarget` 是遊戲設計草案，並非真實地區的回收政策；不包含容量、重量或髒污條件的最終平衡。
