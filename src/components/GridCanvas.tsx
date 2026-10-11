import { useEffect, useRef } from 'react';
import { CanvasEngine } from '../editor/canvasEngine';
import type { CanvasOptions } from '../editor/canvasEngine';

export default function GridCanvas(options: CanvasOptions) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<CanvasEngine | null>(null);
  useEffect(() => {
    if (!canvas.current) return;
    engine.current = new CanvasEngine(canvas.current);
    return () => { engine.current?.destroy(); engine.current = null; };
  }, []);
  useEffect(() => { engine.current?.update(options); }, [options]);
  return <div className="canvas-area">
    <div className="zoom-controls"><button aria-label="Alejar cuadrícula" onClick={() => engine.current?.zoom(0.8)}>−</button><button aria-label="Acercar cuadrícula" onClick={() => engine.current?.zoom(1.25)}>+</button><button onClick={() => engine.current?.fit()}>Ver completa</button></div>
    <canvas ref={canvas} className="grid-canvas" tabIndex={0} aria-label={`Cuadrícula de ${options.project.cols} puntos por ${options.project.rows} filas. Un dedo dibuja; dos dedos desplazan y amplían.`} />
    <p className="canvas-help">Un dedo usa la herramienta. Dos dedos desplazan y amplían. En PC: rueda para ampliar; botón central o espacio y arrastre para desplazar.</p>
  </div>;
}
