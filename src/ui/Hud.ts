export class Hud {
  public readonly element: HTMLDivElement;

  public constructor() {
    this.element = document.createElement('div');
    this.element.className = 'hud';
    document.body.append(this.element);
  }

  public update(speed: number): void {
    this.element.innerHTML = `<strong>下一站：和平東路收運站</strong><br>距離 0.8 km　ETA 03:12<br>車速 ${Math.round(Math.abs(speed))} km/h<br><small>方向鍵駕駛　Space 緊急煞車</small>`;
  }
}
