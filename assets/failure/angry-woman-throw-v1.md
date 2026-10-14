# 戴眼鏡的暴怒中年婦人

2026-10-14 使用 OpenAI 內建 image_gen 編輯 `angry-citizen-throw-v1.png`，將民眾改成神情刻薄、戴眼鏡的中年婦人；保留前衝投擲姿勢、迎面飛來的垃圾袋與透明背景。獨立素材，未接入遊戲。

## 完整 prompt

Use case: identity-preserve / precise-object-edit. Edit the supplied transparent pixel-art game splash illustration. Change ONLY the civilian character into a clearly middle-aged Taiwanese woman, approximately 50 years old, wearing clearly visible dark rectangular eyeglasses, short slightly curled dark hair with a few gray strands, subtle age lines, and a pinched, mean, spiteful angry expression: narrowed glaring eyes visible through transparent glasses lenses, sharply furrowed brows, pursed snarling lips and clenched teeth. She must read unmistakably as a middle-aged woman rather than the original young muscular man; adapt the face and arms to an ordinary middle-aged woman's proportions, not a bodybuilder. Keep the existing muted brick-red short-sleeved shirt, navy trousers and everyday sneakers. Preserve the exact original dramatic throwing follow-through pose, open hands, twisting forward-lunging torso, strongly foreshortened near shoe, character placement and overall silhouette. Preserve the giant airborne knotted dark green-black garbage bag in the upper-right foreground exactly: same size, position, folds, highlights, flying motion streaks and strong coming-straight-at-the-viewer impact perspective. Preserve the same crisp 1990s pixel-game splash-art style, square pixel clusters, stepped dark outlines, muted teal/navy/cream palette, square canvas and actual transparent alpha background. One woman, one airborne garbage bag. Entire subject contained. No other people, no text, logos, scenery, UI, checkerboard, victim or blood.


## 遊戲接入紀錄

使用者提供原稿路徑 `/var/www/gta-recycling/asset-drafts/angry-citizen/angry-woman-throw-v1.png`。2026-10-14 原 PNG 與本文複製至專案 assets/failure/，PNG 與來源逐位元一致，未重新生成或修改角色。來源原稿為 1254×1254 RGBA，alpha 0～255。

遊戲使用 `assets/optimized/failure/angry-woman-throw-v1.webp`，512×512、最近鄰縮圖、透明無損 WebP，由既有 `npm run assets:optimize` 產生。用於回收車與垃圾車的過站不停失敗，共用一張，開始前預載。這項漏站功能已於 2026-10-14 Cloudflare staging 版本 58a4aacc-4127-4beb-841b-9c5355bb09cc 發布。
