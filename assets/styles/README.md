# 街頭回收隊生圖樣式

可重用樣式檔：`gta-recycling-pixel-v1.json`。以既有素材的實際生成 prompt 為依據，保留原始来源路徑。

## 使用方式

1. 讀取樣式 JSON，選擇 `presets.inventory`（物品／袋子）、`presets.environment`（場景）或 `presets.character`（人物）。
2. 組合「Use case、Asset type、Subject」與該 preset 的 `prompt`。修改 Subject 描述所需物件，不任意更動光源、配色、像素風格。
3. 先檢視 `referenceImages` 中的圖，再用內建 image_gen 將它作為風格參考；明確寫出參考圖只提供畫風，避免把原物件生成進去。
4. 將 preset 的 `transparentBackground` 傳入工具。每款素材單獨生成，保留原始 alpha，不使用拼版代替獨立素材。
5. 原始 PNG 與實際完整 prompt 存在同一個版本目錄，記錄來源、尺寸與 alpha；縮圖版分開保存。檢查縮小後的輪廓和內容物辨識度。

物品要求約 65° 三分之四俯視；場景為 90° 正俯視；人物根據用途決定姿勢，狀態頭像不要沿用失敗插圖的誇張全身透視。

64×64 是邏輯像素風格要求，不能把生成結果直接宣稱為已校正的 64×64 網格。危險袋使用破口露出物件；紅框、文字與退回提示由 UI 疊加。

首批使用範例與完整 prompt：`../toss/hazards-v1/prompts.json`。
