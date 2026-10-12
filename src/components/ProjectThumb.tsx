import { useEffect, useRef } from 'react';
import type { Project } from '../core/types';

const MAX_SIDE = 96;

// A miniature of the drawing, so projects are recognised at a glance.
export default function ProjectThumb({ project }: { project: Project }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const step = Math.max(
      1,
      Math.ceil(Math.max(project.cols, project.rows) / MAX_SIDE),
    );
    const width = Math.ceil(project.cols / step);
    const height = Math.ceil(project.rows / step);
    canvas.width = width;
    canvas.height = height;
    for (let y = 0; y < height; y += 1) {
      const row = project.rows - 1 - Math.min(project.rows - 1, y * step);
      for (let x = 0; x < width; x += 1) {
        const cell = project.cells[row * project.cols + x * step] ?? 0;
        context.fillStyle = project.palette[cell]?.hex ?? '#fffdf8';
        context.fillRect(x, y, 1, 1);
      }
    }
  }, [project]);
  return <canvas className="project-thumb" ref={ref} aria-hidden="true" />;
}
