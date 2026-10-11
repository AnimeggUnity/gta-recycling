/** Stable instance-based placement: removing a top item never rearranges the pile. */
export function sortingScatter(instanceId: number): Readonly<{ x: number; y: number; rotation: number; scale: number }> {
  const unit = (salt: number) => {
    let value = Math.imul(instanceId ^ salt, 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
  };
  return { x: 34 + unit(17) * 32, y: 32 + unit(81) * 38, rotation: -55 + unit(31) * 110, scale: 0.88 + unit(61) * 0.22 };
}
