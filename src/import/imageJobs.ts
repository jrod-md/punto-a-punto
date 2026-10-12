import type {
  Crop,
  ImageMesh,
  ImportedDrawing,
  PixelImage,
  Rgba,
} from '../core/imageImport';

export type ImageJob =
  | { kind: 'decode'; file: File }
  | { kind: 'rotate'; image: PixelImage }
  | { kind: 'detect'; image: PixelImage; crop: Crop }
  | {
      kind: 'colors';
      samples: Rgba[];
      cols: number;
      rows: number;
      maximum: number;
    }
  | { kind: 'sample'; image: PixelImage; mesh: ImageMesh; maximum: number };

export interface ImageJobResult {
  image?: PixelImage;
  crop?: Crop;
  mesh?: ImageMesh | null;
  drawing?: ImportedDrawing;
  samples?: Rgba[];
}
export interface ImageWorkerReply {
  id: number;
  progress?: string;
  error?: string;
  result?: ImageJobResult;
}

export class ImageJobs {
  private worker = new Worker(new URL('./imageWorker.ts', import.meta.url), {
    type: 'module',
  });
  private serial = 0;
  private pending = new Map<
    number,
    {
      resolve(result: ImageJobResult): void;
      reject(error: Error): void;
      progress(message: string): void;
    }
  >();

  constructor() {
    this.worker.onmessage = (event: MessageEvent<ImageWorkerReply>) => {
      const reply = event.data;
      const job = this.pending.get(reply.id);
      if (!job) return;
      if (reply.progress) {
        job.progress(reply.progress);
        return;
      }
      this.pending.delete(reply.id);
      if (reply.error) job.reject(new Error(reply.error));
      else if (reply.result) job.resolve(reply.result);
    };
    this.worker.onerror = () =>
      this.cancel('No se pudo procesar la imagen. Vuelve a elegirla.');
  }

  run(
    job: ImageJob,
    progress: (message: string) => void,
  ): Promise<ImageJobResult> {
    return new Promise((resolve, reject) => {
      const id = ++this.serial;
      this.pending.set(id, { resolve, reject, progress });
      this.worker.postMessage({ ...job, id });
    });
  }

  private cancel(message: string) {
    for (const job of this.pending.values()) job.reject(new Error(message));
    this.pending.clear();
  }

  dispose() {
    this.cancel('Importación cancelada.');
    this.worker.terminate();
  }
}
