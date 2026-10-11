# 回收車分類底圖試樣 v1

- 圖片：`truck-bed-sorting-v1.png`，1024 × 1536，直式 2:3。
- 來源：OpenAI 內建 image_gen 生成，2026-10-11；非第三方下載素材。
- 用途：分類遊戲底圖，已由 `SortingPanel` 接入。空籃子疊加可拖曳物品；四個袋口與分類吊牌、右下退回區的互動座標集中於 `src/config/sortingLayout.ts`。
- 原始輸出：`/home/ubuntu/.codex/generated_images/01a12650-496b-7781-be69-af6a4b2c9f78/exec-d17891bb-43bb-41e6-a1e5-92c2c55bbb68.png`。

## 完整生成提示詞

Use case: stylized-concept
Asset type: pixel-art mobile game sorting environment background, a single portrait image, desired 1024 x 1536 pixels (2:3).
Primary request: a Taiwan recycling truck's cluttered open cargo bed viewed DIRECTLY FROM ABOVE, serving as the fixed background for dragging loose recyclables from a receiving basket into open sacks.
Style: match the existing recycling-item pixel-art samples: crisp visibly square pixels, limited subdued teal-blue, beige, off-white and muted green palette, dark pixel outlines and chunky stepped highlights. Retro 1990s 2D game environment, no smooth painting, no photorealism.
Composition: strict 90-degree bird's-eye orthographic view, NO isometric or side perspective. A single LARGE EMPTY rectangular green plastic receiving basket in the LOWER THIRD, fully visible, occupying about 72% of image width, with an unobstructed interior to later overlay movable objects. ABOVE this basket, FOUR large open crumpled woven recycling sack mouths, loosely arranged in two rows; all openings visible from directly overhead, spacious, clearly separated, pale cream, muted blue, beige and faded green. Their mouths are the focal interactive targets, not upright sacks seen from the side. Leave a little accessible floor between mouths and basket.
Backdrop: weathered blue-green metal truck-bed floor with ribs and scratches; clutter of flattened cardboard, bundled old newspapers, tied used sacks, a few cans and bottles pushed to the OUTER EDGES and upper corners. Work area messy and believable, not a neat classroom sorting diagram. Edge clutter lower contrast than the empty basket and sack rims. Uniform soft daylight rendered with pixel shading.
Constraints: empty receiving basket, empty dark readable sack interiors; all main containers fully inside frame. No characters, hands, gloves, truck cab, street, UI, panels, arrows, labels, writing, logos or watermark. No baked-in loose recyclables in the receiving basket. Exactly one cohesive scene filling the canvas. Opaque background.
