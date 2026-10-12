import {
  cropPixels,
  emptyBorderCrop,
  inspectImageGrid,
  reduceColors,
  rotatePixels,
  sampleMesh,
} from '../core/imageImport';
import type { ImageJob, ImageJobResult, ImageWorkerReply } from './imageJobs';

// Decoding, downscaling and all pixel work stay off the interface thread.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ImageJob & { id: number }>) => void) | null;
  postMessage(message: ImageWorkerReply): void;
};
scope.onmessage = (event) => {
  const job = event.data;
  const progress = (message: string) =>
    scope.postMessage({ id: job.id, progress: message });
  void (async () => {
    try {
      let result: ImageJobResult;
      if (job.kind === 'decode') {
        progress('Abriendo la imagen en este dispositivo…');
        if (
          typeof createImageBitmap !== 'function' ||
          typeof OffscreenCanvas !== 'function'
        )
          throw new Error(
            'Este navegador no puede procesar imágenes en segundo plano. Abre la app en un navegador actualizado.',
          );
        const bitmap = await createImageBitmap(job.file);
        const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * ratio));
        const height = Math.max(1, Math.round(bitmap.height * ratio));
        progress(
          ratio < 1
            ? 'Reduciendo la imagen antes de analizarla…'
            : 'Preparando la vista previa…',
        );
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context)
          throw new Error('No se pudo abrir la imagen en este navegador.');
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const image = {
          width,
          height,
          data: context.getImageData(0, 0, width, height).data,
        };
        result = { image, crop: emptyBorderCrop(image) };
      } else if (job.kind === 'rotate') {
        progress('Girando la imagen…');
        const image = rotatePixels(job.image);
        result = { image, crop: emptyBorderCrop(image) };
      } else if (job.kind === 'detect') {
        progress('Buscando los bordes de los cuadros…');
        const image = cropPixels(job.image, job.crop);
        const inspection = inspectImageGrid(image);
        result = { image, mesh: inspection.mesh, inspection };
      } else if (job.kind === 'inspect') {
        progress('Buscando el otro eje con tu número de cuadros…');
        const inspection = inspectImageGrid(job.image, job.hint);
        result = { mesh: inspection.mesh, inspection };
      } else if (job.kind === 'colors') {
        progress('Ajustando la paleta…');
        result = {
          drawing: reduceColors(job.samples, job.cols, job.rows, job.maximum),
        };
      } else {
        progress('Leyendo el color del centro de cada cuadro…');
        const samples = sampleMesh(job.image, job.mesh);
        progress('Uniendo tonos parecidos y preparando los colores…');
        result = {
          drawing: reduceColors(
            samples,
            job.mesh.cols,
            job.mesh.rows,
            job.maximum,
          ),
          samples,
        };
      }
      scope.postMessage({ id: job.id, result });
    } catch (reason) {
      scope.postMessage({
        id: job.id,
        error:
          reason instanceof Error && !(reason instanceof DOMException)
            ? reason.message
            : 'No se pudo leer esta imagen. Elige un PNG, JPEG o WebP válido.',
      });
    }
  })();
};
