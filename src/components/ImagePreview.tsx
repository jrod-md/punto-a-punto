import { useEffect, useRef } from 'react';
import type {
  Crop,
  ImageMesh,
  ImportedDrawing,
  PixelImage,
} from '../core/imageImport';

export default function ImagePreview({
  image,
  crop,
  mesh,
  drawing,
  stitchRatio = 1,
}: {
  image?: PixelImage | undefined;
  crop?: Crop | undefined;
  mesh?: ImageMesh | undefined;
  drawing?: ImportedDrawing | undefined;
  stitchRatio?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    if (drawing) {
      const scale = Math.max(1, Math.min(16, 640 / drawing.cols));
      canvas.width = Math.round(drawing.cols * scale);
      canvas.height = Math.round(drawing.rows * scale * stitchRatio);
      drawing.cells.forEach((color, i) => {
        context.fillStyle = drawing.palette[color]!.hex;
        const x = i % drawing.cols;
        const y = drawing.rows - 1 - Math.floor(i / drawing.cols);
        context.fillRect(
          x * scale,
          y * scale * stitchRatio,
          scale + 0.5,
          scale * stitchRatio + 0.5,
        );
      });
    } else if (image) {
      canvas.width = image.width;
      canvas.height = image.height;
      context.putImageData(
        new ImageData(
          new Uint8ClampedArray(image.data),
          image.width,
          image.height,
        ),
        0,
        0,
      );
      if (crop) {
        context.fillStyle = '#30382f99';
        context.fillRect(0, 0, image.width, crop.y);
        context.fillRect(
          0,
          crop.y + crop.height,
          image.width,
          image.height - crop.y - crop.height,
        );
        context.fillRect(0, crop.y, crop.x, crop.height);
        context.fillRect(
          crop.x + crop.width,
          crop.y,
          image.width - crop.x - crop.width,
          crop.height,
        );
        context.strokeStyle = '#ad593a';
        context.lineWidth = Math.max(2, image.width / 200);
        context.strokeRect(crop.x, crop.y, crop.width, crop.height);
      }
      if (mesh) {
        context.lineWidth = Math.max(1, image.width / 360);
        context.strokeStyle = '#ff6b22';
        context.beginPath();
        for (const x of mesh.x) {
          context.moveTo(x, 0);
          context.lineTo(x, image.height);
        }
        for (const y of mesh.y) {
          context.moveTo(0, y);
          context.lineTo(image.width, y);
        }
        context.stroke();
      }
    }
  }, [image, crop, mesh, drawing, stitchRatio]);
  return (
    <canvas
      className="image-preview"
      ref={ref}
      role="img"
      aria-label={
        drawing
          ? 'Vista previa del dibujo en proporción real del punto'
          : 'Imagen con el recorte o la rejilla superpuesta'
      }
    />
  );
}
