export class Hud {
  public readonly element: HTMLDivElement;

  public constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hud';
    document.body.append(this.element);
  }

  public update(speed: number, lateralSpeed: number): void {
    const handling = Math.abs(lateralSpeed) > 14 ? '輪胎滑動' : '抓地正常';
    this.element.innerHTML = `<strong>下一站：和平東路收運站</strong><br>距離 0.8 km　ETA 03:12<br>車速 ${Math.round(speed * 0.35)} km/h　${handling}<br><small>方向鍵駕駛　Space 緊急煞車</small>`;
  }
}
