import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { drawCrewExpression } from '../src/scenes/TruckArt';
import type { CrewReaction } from '../src/game/CrewDynamics';

describe('worker face rendering', () => {
  it.each<CrewReaction>(['calm', 'annoyed', 'angry', 'furious'])('draws a distinct %s face and clears the previous frame', (reaction) => {
    const graphics = { clear: vi.fn(), fillStyle: vi.fn(), fillCircle: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn(), fillEllipse: vi.fn(), fillRect: vi.fn() };
    for (const method of Object.values(graphics)) method.mockReturnValue(graphics);
    drawCrewExpression(graphics as unknown as Phaser.GameObjects.Graphics, reaction);
    expect(graphics.clear).toHaveBeenCalledOnce();
    const color = { calm: 0xf0d38e, annoyed: 0xefb55c, angry: 0xf08355, furious: 0xed5551 }[reaction];
    expect(graphics.fillStyle).toHaveBeenCalledWith(color);
    expect(graphics.lineBetween).toHaveBeenCalled();
    expect(graphics.fillEllipse).toHaveBeenCalledTimes(reaction === 'furious' ? 1 : 0);
  });
});
