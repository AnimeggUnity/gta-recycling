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
  }>): void {
    const handling = Math.abs(data.lateralSpeed) > 14 ? '輪胎滑動' : '抓地正常';
    this.element.innerHTML = [
      '<strong>下一站：和平東路收運站</strong>',
      `距離 ${data.distanceMeters} m　車速 ${Math.round(data.speed * 0.35)} km/h　${handling}`,
      `<span class="hud-status">${data.status}</span>`,
      `車斗 ${data.cargoVolume}/${data.maxCargoVolume} 容量　${data.cargoWeight}/${data.maxCargoWeight} kg`,
      '<small>方向鍵駕駛　Space 緊急煞車</small>',
    ].join('<br>');
  }
}
