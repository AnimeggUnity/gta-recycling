export class Hud {
  public readonly element: HTMLDivElement;

  public constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hud';
    document.body.append(this.element);
  }

  public update(data: Readonly<{
    speed: number;
    lateralSpeed: number;
    distanceMeters: number;
    status: string;
    cargoVolume: number;
    maxCargoVolume: number;
    cargoWeight: number;
    maxCargoWeight: number;
    crewAnger: number;
    crewEfficiency: number;
    crewReaction: string;
  }>): void {
    const handling = Math.abs(data.lateralSpeed) > 14 ? '輪胎滑動' : '抓地正常';
    const angerBlocks = Math.round(data.crewAnger / 10);
    const angerBar = `${'■'.repeat(angerBlocks)}${'□'.repeat(10 - angerBlocks)}`;
    const angerClass = data.crewAnger >= 50 ? 'danger' : data.crewAnger >= 25 ? 'warning' : 'calm';
    this.element.innerHTML = [
      '<strong>下一站：和平東路收運站</strong>',
      `距離 ${data.distanceMeters} m　車速 ${Math.round(data.speed * 0.35)} km/h　${handling}`,
      `<span class="hud-status">${data.status}</span>`,
      `車斗 ${data.cargoVolume}/${data.maxCargoVolume} 容量　${data.cargoWeight}/${data.maxCargoWeight} kg`,
      `<span class="anger ${angerClass}">怒氣 ${angerBar} ${Math.round(data.crewAnger)}/100　${data.crewReaction}</span>`,
      `作業效率 ${Math.round(data.crewEfficiency * 100)}%`,
      '<small>方向鍵駕駛　Space 緊急煞車</small>',
    ].join('<br>');
  }
}
