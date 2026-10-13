/** Stable instance-based placement: removing a top item never rearranges the pile. */
export function sortingScatter(instanceId: number): Readonly<{ x: number; y: number; rotation: number; scale: number }> {
  const unit = (salt: number) => {
    let value = Math.imul(instanceId ^ salt, 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
  };
  // Distribute successive deliveries across the basket floor before layering.
  // A coprime stride visits every cell, while small jitter keeps the pile natural.
  const cell = ((instanceId - 1) * 5) % 12;
  const column = cell % 4;
  const row = Math.floor(cell / 4);
  return {
    x: 18 + column * (64 / 3) + (unit(17) - 0.5) * 4,
    y: 30 + row * 20 + (unit(81) - 0.5) * 4,
    rotation: -40 + unit(31) * 80,
    scale: 0.88 + unit(61) * 0.16,
  };
}
