import { jsPDF } from 'jspdf';
import fontUrl from '../assets/fonts/NotoSans-Regular.ttf?url';
import symbolFontUrl from '../assets/fonts/NotoSansSymbols-Regular.ttf?url';
import { gauge } from '../core/gauge';
import { gridTiles, patternDocument } from '../core/patternDocument';
import type { GaugeProfile, Project } from '../core/types';

export async function createPatternPdf(
  project: Project,
  profile: GaugeProfile,
  fontData?: ArrayBuffer,
  symbolFontData?: ArrayBuffer,
): Promise<{ blob: Blob; gridPages: number }> {
  let buffer = fontData;
  if (!buffer) {
    const response = await fetch(fontUrl);
    if (!response.ok) throw new Error('No se pudo cargar la fuente del PDF.');
    buffer = await response.arrayBuffer();
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  pdf.addFileToVFS('NotoSans.ttf', btoa(binary));
  pdf.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  pdf.setFont('NotoSans');
  pdf.setTextColor('#30382f');
  let symbolBuffer = symbolFontData;
  if (!symbolBuffer) {
    const response = await fetch(symbolFontUrl);
    if (!response.ok)
      throw new Error('No se pudieron cargar las flechas del PDF.');
    symbolBuffer = await response.arrayBuffer();
  }
  const symbolBytes = new Uint8Array(symbolBuffer);
  let symbols = '';
  for (let offset = 0; offset < symbolBytes.length; offset += 8192)
    symbols += String.fromCharCode(
      ...symbolBytes.subarray(offset, offset + 8192),
    );
  pdf.addFileToVFS('NotoSymbols.ttf', btoa(symbols));
  pdf.addFont('NotoSymbols.ttf', 'NotoSymbols', 'normal');
  const document = patternDocument(project, profile);
  let y = 18;
  const newPage = (title: string) => {
    pdf.addPage();
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(project.name, 178)[0] as string, 16, 14);
    pdf.setFontSize(12);
    pdf.text(title, 16, 24);
    y = 34;
  };
  const write = (text: string, size = 10) => {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, 178) as string[];
    for (const line of lines) {
      if (y + size * 0.5 > 280) newPage('Patrón escrito');
      pdf.setFontSize(size);
      let x = 16;
      for (const part of line.split(/([←→])/)) {
        if (!part) continue;
        pdf.setFont(part === '←' || part === '→' ? 'NotoSymbols' : 'NotoSans');
        pdf.text(part, x, y);
        x += pdf.getTextWidth(part);
      }
      pdf.setFont('NotoSans');
      y += size * 0.5 + 1.5;
    }
  };
  write(project.name, 18);
  document.heading.slice(1).forEach((line) => write(line));
  y += 5;
  write('Leyenda', 13);
  for (let index = 0; index < project.palette.length; index++) {
    const color = project.palette[index]!;
    if (y + 12 > 280) newPage('Leyenda');
    pdf.setFillColor(color.hex);
    pdf.setDrawColor('#707968');
    pdf.rect(16, y - 3, 4, 4, 'FD');
    write(`     ${String.fromCharCode(65 + index)} · ${color.name}`);
  }
  y += 5;
  write('Hilo estimado', 13);
  const meterFormat = new Intl.NumberFormat('es', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  document.estimates.forEach((entry) =>
    write(
      `${entry.color.name}: ${entry.workedStitches} puntos · ${meterFormat.format(entry.meters)} m${entry.balls === undefined ? '' : ` · ${entry.balls} ${entry.balls === 1 ? 'ovillo' : 'ovillos'}`}`,
    ),
  );
  write(`Total estimado: ${meterFormat.format(document.totalMeters)} m`);
  document.warnings.forEach((line) => write(line, 9));
  const measures = gauge(profile);
  const ratio = measures.rowHeightCm / measures.stitchWidthCm;
  const cw = Math.max(2.4, 2.4 / ratio);
  const ch = cw * ratio;
  if (cw > 174 || ch > 226)
    throw new Error(
      'La proporción de esta muestra no permite una cuadrícula legible en el PDF. Revisa las medidas de la muestra.',
    );
  const tiles = gridTiles(
    project.cols,
    project.rows,
    Math.max(1, Math.floor(174 / cw)),
    Math.max(1, Math.floor(226 / ch)),
  );
  for (const [index, tile] of tiles.entries()) {
    newPage(
      `Cuadrícula ${index + 1}/${tiles.length} · columnas ${tile.left + 1}–${tile.left + tile.cols}, filas ${tile.bottom + 1}–${tile.bottom + tile.rows}`,
    );
    const x = 25;
    const top = 42;
    for (let row = 0; row < tile.rows; row++)
      for (let col = 0; col < tile.cols; col++) {
        const color =
          project.palette[
            project.cells[(tile.bottom + row) * project.cols + tile.left + col]!
          ]!;
        pdf.setFillColor(color.hex);
        pdf.rect(x + col * cw, top + (tile.rows - 1 - row) * ch, cw, ch, 'F');
      }
    for (let col = 0; col <= tile.cols; col++) {
      const value = tile.left + col;
      pdf.setDrawColor(value % 10 === 0 ? '#30382f' : '#8b9382');
      pdf.setLineWidth(value % 10 === 0 ? 0.3 : value % 5 === 0 ? 0.16 : 0.06);
      pdf.line(x + col * cw, top, x + col * cw, top + tile.rows * ch);
    }
    for (let row = 0; row <= tile.rows; row++) {
      const value = tile.bottom + row;
      pdf.setDrawColor(value % 10 === 0 ? '#30382f' : '#8b9382');
      pdf.setLineWidth(value % 10 === 0 ? 0.3 : value % 5 === 0 ? 0.16 : 0.06);
      pdf.line(
        x,
        top + (tile.rows - row) * ch,
        x + tile.cols * cw,
        top + (tile.rows - row) * ch,
      );
    }
    pdf.setFontSize(6);
    pdf.setTextColor('#30382f');
    for (let col = 0; col < tile.cols; col++) {
      const value = tile.left + col + 1;
      if (col === 0 || col === tile.cols - 1 || value % 5 === 0) {
        pdf.text(String(value), x + (col + 0.5) * cw, top - 2, {
          align: 'center',
        });
        pdf.text(
          String(value),
          x + (col + 0.5) * cw,
          top + tile.rows * ch + 4,
          { align: 'center' },
        );
      }
    }
    for (let row = 0; row < tile.rows; row++) {
      const value = tile.bottom + row + 1;
      if (row === 0 || row === tile.rows - 1 || value % 5 === 0) {
        const position = top + (tile.rows - row - 0.5) * ch + 0.7;
        pdf.text(String(value), x - 3, position, { align: 'right' });
        pdf.text(String(value), x + tile.cols * cw + 3, position);
      }
    }
    pdf.setFontSize(8);
    pdf.text(
      'Fila 1 abajo. Continúa por los rangos de filas y columnas indicados.',
      16,
      284,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  newPage('Patrón escrito');
  document.written.rows.forEach((row) => write(row.text));
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.text(`Punto a punto · ${page} / ${pages}`, 194, 292, {
      align: 'right',
    });
  }
  return {
    blob: new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' }),
    gridPages: tiles.length,
  };
}
