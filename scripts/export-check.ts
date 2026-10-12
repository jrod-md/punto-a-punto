import { createGridPng } from '../src/export/png';
import { TEST_PROFILE, TEST_PROJECT } from '../src/core/testFixtures';

const button = document.querySelector<HTMLButtonElement>('#run')!;
const results = document.querySelector('#results')!;
const summary = document.querySelector('#summary')!;
button.onclick = async () => {
  button.disabled = true;
  results.textContent = '';
  summary.textContent = 'Ejecutando…';
  let passed = 0;
  let failed = 0;
  for (const [cols, rows] of [
    [64, 72],
    [200, 200],
    [1000, 1000],
  ] as const) {
    const item = document.createElement('li');
    try {
      const project = {
        ...TEST_PROJECT,
        cols,
        rows,
        cells: Array.from({ length: cols * rows }, (_, index) => index % 3),
      };
      const blob = await createGridPng(project, TEST_PROFILE);
      const bitmap = await createImageBitmap(blob);
      const { width, height } = bitmap;
      bitmap.close();
      if (
        blob.type !== 'image/png' ||
        width > 4096 ||
        height > 4096 ||
        width < cols * 2 ||
        height < rows * 2
      )
        throw new Error(
          'La imagen supera el límite o pierde la resolución mínima.',
        );
      item.textContent = `Correcto: PNG ${cols} × ${rows}: ${width} × ${height} px, ${blob.size} bytes; abre y respeta el límite.`;
      passed += 1;
    } catch (reason) {
      item.textContent = `Falló: ${reason instanceof Error ? reason.message : 'Error desconocido'}`;
      failed += 1;
    }
    results.append(item);
  }
  summary.textContent = `${passed} comprobaciones correctas; ${failed} fallidas.`;
  button.disabled = false;
};
