import { CanvasEngine } from '../src/editor/canvasEngine';
import type { CanvasOptions } from '../src/editor/canvasEngine';
import { paintStroke } from '../src/core/editor';
import { TEST_PROFILE, TEST_PROJECT } from '../src/core/testFixtures';
import type { Project } from '../src/core/types';
import { yarn } from '../src/core/yarn';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
const results = document.querySelector('#results')!;
const summary = document.querySelector('#summary')!;
const button = document.querySelector<HTMLButtonElement>('#run')!;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

button.onclick = async () => {
  button.disabled = true;
  results.textContent = '';
  summary.textContent = 'Ejecutando…';
  let failures = 0;
  let checks = 0;
  function check(name: string, condition: boolean) {
    checks += 1;
    const item = document.createElement('li');
    item.textContent = `${condition ? 'Correcto' : 'Falló'}: ${name}`;
    results.append(item);
    if (!condition) failures += 1;
  }
  let reads = 0;
  let commits = 0;
  let painted = new Set<number>();
  const cells = new Proxy(Array<number>(40000).fill(0), {
    get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/.test(property)) reads += 1;
      return Reflect.get(target, property, receiver) as unknown;
    },
  });
  let project: Project = { ...TEST_PROJECT, cols: 200, rows: 200, cells };
  const engine = new CanvasEngine(canvas);
  const originalCapture = canvas.setPointerCapture;
  // Synthetic events have no native pointer capture; only this isolated test overrides it.
  canvas.setPointerCapture = () => {};
  const context = canvas.getContext('2d')!;
  const originalDraw = context.drawImage.bind(context);
  const timings: number[] = [];
  context.drawImage = (image: CanvasImageSource, ...coordinates: number[]) => {
    const start = performance.now();
    Reflect.apply(originalDraw, context, [image, ...coordinates]);
    timings.push(performance.now() - start);
  };
  const options: CanvasOptions = {
    project,
    profile: TEST_PROFILE,
    tool: 'paint',
    colorIndex: 1,
    centers: true,
    selection: null,
    onStroke(indices, color) {
      commits += 1;
      painted = new Set(indices);
      project = paintStroke(project, indices, color);
      engine.update({ ...options, project });
    },
    onFill() {},
    onSelect() {},
    onMove() {},
  };
  function pointer(
    type: string,
    id: number,
    x: number,
    y: number,
    pointerType = 'touch',
    mouseButton = 0,
  ) {
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType,
        button: mouseButton,
        clientX: rect.left + x,
        clientY: rect.top + y,
        bubbles: true,
      }),
    );
  }
  try {
    engine.update(options);
    await nextFrame();
    await nextFrame();
    const baselineReads = reads;
    pointer('pointerdown', 1, 50, 50);
    for (let index = 0; index < 120; index += 1)
      pointer('pointermove', 1, 50 + index * 1.5, 50 + index * 0.7);
    check(
      '120 movimientos no leen, copian ni validan toda la cuadrícula',
      reads === baselineReads && commits === 0,
    );
    pointer('pointerup', 1, 230, 134);
    await nextFrame();
    check(
      'El trazo de 200 × 200 se confirma una sola vez',
      commits === 1 && painted.size > 10,
    );
    const colorful: Project = {
      ...project,
      palette: Array.from({ length: 12 }, (_, index) => ({
        id: `color-${index}`,
        name: `Color ${index + 1}`,
        hex: '#345678',
      })),
      backgroundColorId: 'color-0',
      cells: Array.from({ length: 40000 }, (_, index) => index % 12),
    };
    const yarnTimes: number[] = [];
    let colorCount = 0;
    for (let index = 0; index < 5; index += 1) {
      const start = performance.now();
      colorCount = yarn(colorful, TEST_PROFILE).length;
      yarnTimes.push(performance.now() - start);
    }
    const medianYarn = yarnTimes.sort((a, b) => a - b)[2]!;
    check(
      `Hilo para 200 × 200 y 12 colores: mediana ${medianYarn.toFixed(2)} ms al terminar el trazo`,
      colorCount === 12 && medianYarn < 35,
    );
    const beforeGesture = commits;
    pointer('pointerdown', 2, 120, 120);
    pointer('pointerdown', 3, 220, 220);
    const frames: number[] = [];
    for (let index = 0; index < 30; index += 1) {
      const start = performance.now();
      pointer('pointermove', 2, 120 - index, 120 - index);
      pointer('pointermove', 3, 220 + index, 220 + index);
      await nextFrame();
      frames.push(performance.now() - start);
    }
    pointer('pointerup', 2, 90, 90);
    pointer('pointerup', 3, 250, 250);
    check(
      'Dos dedos amplían y desplazan sin confirmar un trazo accidental',
      commits === beforeGesture,
    );
    const medianFrame = [...frames].sort((a, b) => a - b)[
      Math.floor(frames.length / 2)
    ]!;
    const maxDraw = Math.max(...timings);
    check(
      `Dibujo rasterizado: máximo ${maxDraw.toFixed(2)} ms por drawImage`,
      maxDraw < 16.7,
    );
    check(
      `Gestos: mediana ${medianFrame.toFixed(2)} ms por fotograma`,
      medianFrame < 35,
    );
    pointer('pointerdown', 4, 100, 100, 'mouse', 1);
    pointer('pointermove', 4, 180, 150, 'mouse', 1);
    pointer('pointerup', 4, 180, 150, 'mouse', 1);
    check('Arrastrar con botón central no pinta', commits === beforeGesture);
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        clientX: canvas.getBoundingClientRect().left + 160,
        clientY: canvas.getBoundingClientRect().top + 160,
        cancelable: true,
      }),
    );
    await nextFrame();
    check(
      'La rueda amplía sin confirmar cambios en el diseño',
      commits === beforeGesture,
    );
    pointer('pointerdown', 5, 150, 150);
    pointer('pointermove', 5, 190, 170);
    pointer('pointercancel', 5, 190, 170);
    check('Un gesto cancelado no se guarda', commits === beforeGesture);
    summary.textContent = `${checks} comprobaciones; ${failures} fallidas. Estas mediciones corresponden al navegador de este equipo, no a un teléfono físico.`;
  } catch (reason) {
    summary.textContent = `La prueba no se completó: ${reason instanceof Error ? reason.message : 'error desconocido'}`;
  } finally {
    engine.destroy();
    canvas.setPointerCapture = originalCapture;
    context.drawImage = originalDraw;
    button.disabled = false;
  }
};
