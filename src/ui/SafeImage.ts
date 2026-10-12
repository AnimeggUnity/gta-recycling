import { decodeImage } from './AssetLoader';
import { gameAssets } from './GameAssets';

export type ImageState = 'loading' | 'ready' | 'error';
/** Never expose the browser's broken-image icon or enable invisible draggable objects. */
export function displayImage(image: HTMLImageElement, url: string, stateChanged: (state: ImageState) => void = () => {}): void {
  image.dataset.imageState = 'loading';
  stateChanged('loading');
  void decodeImage(gameAssets.get(url)?.src ?? url, image).then(() => {
    image.dataset.imageState = 'ready'; stateChanged('ready');
  }).catch(() => {
    image.removeAttribute('src');
    image.dataset.imageState = 'error'; stateChanged('error');
  });
}
