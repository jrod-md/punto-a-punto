import { linePoints, selectionBounds } from '../core/editor';
import type { CellPoint } from '../core/editor';
import { gauge } from '../core/gauge';
import type { Bounds } from '../core/grid';
import type { GaugeProfile, Progress, Project } from '../core/types';
import { readingColumn } from '../core/weaving';
import {
  completeView,
  openingView,
  resizedView,
  RULER_SIZE,
  spacedLabels,
} from './view';
import type { RulerLabel, View, Viewport } from './view';

export type Tool = 'paint' | 'erase' | 'fill' | 'select';
interface Point {
  x: number;
  y: number;
}
export interface CanvasOptions {
  project: Project;
  profile: GaugeProfile;
  tool: Tool;
  colorIndex: number;
  centers: boolean;
  selection: Bounds | null;
  weaving?: Progress;
  onStroke(indices: ReadonlySet<number>, color: number): void;
  onFill(point: CellPoint): void;
  onSelect(bounds: Bounds): void;
  onMove(bounds: Bounds, dx: number, dy: number): void;
}

export class CanvasEngine {
  private options: CanvasOptions | null = null;
  private raster = document.createElement('canvas');
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private width = 0;
  private height = 0;
  private cellWidth = 18;
  private ratio = 1;
  private origin: Point = { x: 36, y: 36 };
  private pointers = new Map<number, Point>();
  private mode:
    'idle' | 'stroke' | 'fill' | 'pan' | 'gesture' | 'select' | 'move' = 'idle';
  private stroke = new Set<number>();
  private lastCell: CellPoint | null = null;
  private startCell: CellPoint | null = null;
  private previewSelection: Bounds | null = null;
  private moving: CellPoint = { col: 0, row: 0 };
  private pinch: { center: Point; distance: number } | null = null;
  private frame = 0;
  private space = false;
  private readonly ruler = RULER_SIZE;
  private complete = false;
  private initialized = false;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Este navegador no permite dibujar la cuadrícula.');
    this.context = context;
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('lostpointercapture', this.pointerCancel);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    canvas.addEventListener('blur', this.blur);
    this.observer = new ResizeObserver(() => {
      const box = canvas.getBoundingClientRect();
      const previous = this.viewport();
      this.width = box.width;
      this.height = box.height;
      canvas.width = Math.round(box.width * devicePixelRatio);
      canvas.height = Math.round(box.height * devicePixelRatio);
      if (this.options && this.width && this.height) {
        this.setView(
          this.initialized && previous.width && previous.height
            ? resizedView(this.view(), previous, this.viewport())
            : openingView(this.viewport()),
        );
        this.initialized = true;
        if (this.options.weaving) this.focusWeaving(!previous.width);
      }
      this.schedule();
    });
    this.observer.observe(canvas);
  }

  update(options: CanvasOptions) {
    const changed =
      this.options?.project.cells !== options.project.cells ||
      this.options?.project.palette !== options.project.palette ||
      this.options?.project.cols !== options.project.cols ||
      this.options?.project.rows !== options.project.rows;
    const previousProgress = this.options?.weaving;
    const previous = this.viewport();
    this.options = options;
    const measurements = gauge(options.profile);
    this.ratio = measurements.rowHeightCm / measurements.stitchWidthCm;
    if (this.width && this.height) {
      if (!this.initialized) {
        this.setView(openingView(this.viewport()));
        this.initialized = true;
      } else if (
        previous.ratio !== this.ratio ||
        previous.cols !== options.project.cols ||
        previous.rows !== options.project.rows
      )
        this.setView(resizedView(this.view(), previous, this.viewport()));
    }
    if (changed) this.rebuildRaster();
    if (
      options.weaving &&
      this.width &&
      this.height &&
      (previousProgress?.row !== options.weaving.row ||
        previousProgress.stitch !== options.weaving.stitch)
    )
      this.focusWeaving(!previousProgress);
    this.schedule();
  }

  private viewport(): Viewport {
    return {
      width: this.width,
      height: this.height,
      cols: this.options?.project.cols ?? 1,
      rows: this.options?.project.rows ?? 1,
      ratio: this.ratio,
    };
  }

  private view(): View {
    return {
      cellWidth: this.cellWidth,
      ...this.origin,
      complete: this.complete,
    };
  }
  private setView(view: View) {
    this.cellWidth = view.cellWidth;
    this.origin = { x: view.x, y: view.y };
    this.complete = view.complete;
  }

  private focusWeaving(initial: boolean) {
    if (!this.options?.weaving) return;
    const { project, weaving } = this.options;
    if (initial) {
      this.cellWidth = Math.max(18, 18 / this.ratio);
      this.complete = false;
    }
    const col = readingColumn(
      project,
      weaving.row,
      Math.min(project.cols, weaving.stitch),
    );
    const x = this.origin.x + (col + 0.5) * this.cellWidth;
    const y =
      this.origin.y +
      (project.rows - weaving.row + 0.5) * this.cellWidth * this.ratio;
    if (
      initial ||
      x < this.ruler + this.cellWidth ||
      x > this.width - this.ruler - this.cellWidth
    )
      this.origin.x += this.width / 2 - x;
    if (
      initial ||
      y < this.ruler + this.cellWidth * this.ratio ||
      y > this.height - this.ruler - this.cellWidth * this.ratio
    )
      this.origin.y += this.height / 2 - y;
  }

  private rebuildRaster() {
    const project = this.options?.project;
    if (!project) return;
    this.raster.width = project.cols;
    this.raster.height = project.rows;
    const context = this.raster.getContext('2d');
    if (!context) return;
    const image = context.createImageData(project.cols, project.rows);
    const colors = project.palette.map((color) => [
      parseInt(color.hex.slice(1, 3), 16),
      parseInt(color.hex.slice(3, 5), 16),
      parseInt(color.hex.slice(5, 7), 16),
    ]);
    project.cells.forEach((colorIndex, index) => {
      const offset =
        ((project.rows - 1 - Math.floor(index / project.cols)) * project.cols +
          (index % project.cols)) *
        4;
      const color = colors[colorIndex]!;
      image.data[offset] = color[0]!;
      image.data[offset + 1] = color[1]!;
      image.data[offset + 2] = color[2]!;
      image.data[offset + 3] = 255;
    });
    context.putImageData(image, 0, 0);
  }

  private schedule() {
    if (!this.frame)
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.draw();
      });
  }

  private draw() {
    const options = this.options;
    if (!options || !this.width) return;
    const { project } = options;
    const ctx = this.context;
    const cw = this.cellWidth;
    const ch = cw * this.ratio;
    const { x, y } = this.origin;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#e8e5dd';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      this.ruler,
      this.ruler,
      this.width - this.ruler * 2,
      this.height - this.ruler * 2,
    );
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.raster, x, y, project.cols * cw, project.rows * ch);
    const firstCol = Math.max(0, Math.floor((this.ruler - x) / cw));
    const lastCol = Math.min(
      project.cols,
      Math.ceil((this.width - this.ruler - x) / cw),
    );
    const firstRow = Math.max(0, Math.floor((this.ruler - y) / ch));
    const lastRow = Math.min(
      project.rows,
      Math.ceil((this.height - this.ruler - y) / ch),
    );
    for (let col = firstCol; col <= lastCol; col += 1) {
      ctx.strokeStyle =
        col % 10 === 0 ? '#53574e' : col % 5 === 0 ? '#83877e' : '#b6bbb1';
      ctx.lineWidth = col % 10 === 0 ? 1.8 : col % 5 === 0 ? 1.1 : 0.4;
      if (cw < 7 && col % 5 !== 0 && col !== project.cols) continue;
      ctx.beginPath();
      ctx.moveTo(x + col * cw, y);
      ctx.lineTo(x + col * cw, y + project.rows * ch);
      ctx.stroke();
    }
    for (let row = firstRow; row <= lastRow; row += 1) {
      const logical = project.rows - row;
      ctx.strokeStyle =
        logical % 10 === 0
          ? '#53574e'
          : logical % 5 === 0
            ? '#83877e'
            : '#b6bbb1';
      ctx.lineWidth = logical % 10 === 0 ? 1.8 : logical % 5 === 0 ? 1.1 : 0.4;
      if (ch < 7 && logical % 5 !== 0 && row !== project.rows) continue;
      ctx.beginPath();
      ctx.moveTo(x, y + row * ch);
      ctx.lineTo(x + project.cols * cw, y + row * ch);
      ctx.stroke();
    }
    if (options.weaving) {
      const progress = options.weaving;
      const rowY = y + (project.rows - progress.row) * ch;
      ctx.fillStyle = '#faf8f2bf';
      ctx.fillRect(x, y, project.cols * cw, rowY - y);
      ctx.fillRect(x, rowY + ch, project.cols * cw, (progress.row - 1) * ch);
      const done = Math.min(project.cols, progress.stitch - 1);
      const rtl = project.construction === 'round' || progress.row % 2 === 1;
      ctx.fillStyle = '#3f573b66';
      ctx.fillRect(
        x + (rtl ? project.cols - done : 0) * cw,
        rowY,
        done * cw,
        ch,
      );
      ctx.strokeStyle = '#ac4b31';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, rowY, project.cols * cw, ch);
      if (progress.stitch <= project.cols) {
        const col = readingColumn(project, progress.row, progress.stitch);
        ctx.strokeStyle = '#30382f';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + col * cw, rowY, cw, ch);
      }
    }
    if (options.centers) {
      ctx.strokeStyle = '#ac4b31';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x + (project.cols * cw) / 2, y);
      ctx.lineTo(x + (project.cols * cw) / 2, y + project.rows * ch);
      ctx.moveTo(x, y + (project.rows * ch) / 2);
      ctx.lineTo(x + project.cols * cw, y + (project.rows * ch) / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const selection = this.previewSelection ?? options.selection;
    if (selection) {
      const dx = this.mode === 'move' ? this.moving.col : 0;
      const dy = this.mode === 'move' ? this.moving.row : 0;
      ctx.fillStyle = '#bd603226';
      ctx.strokeStyle = '#ac4b31';
      ctx.lineWidth = 2;
      const sx = x + (selection.left + dx) * cw;
      const sy =
        y + (project.rows - selection.bottom - dy - selection.height) * ch;
      ctx.fillRect(sx, sy, selection.width * cw, selection.height * ch);
      ctx.strokeRect(sx, sy, selection.width * cw, selection.height * ch);
    }
    ctx.restore();
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, this.width, this.ruler);
    ctx.fillRect(0, this.height - this.ruler, this.width, this.ruler);
    ctx.fillRect(0, 0, this.ruler, this.height);
    ctx.fillRect(this.width - this.ruler, 0, this.ruler, this.height);
    ctx.fillStyle = '#30382f';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const columnLabels: RulerLabel[] = [];
    for (let col = firstCol; col < lastCol; col += 1) {
      const position = x + (col + 0.5) * cw;
      if (
        position < this.ruler ||
        position > this.width - this.ruler ||
        (cw < 24 &&
          col !== 0 &&
          (col + 1) % (cw < 5 ? 10 : 5) !== 0 &&
          col + 1 !== project.cols)
      )
        continue;
      columnLabels.push({
        value: col + 1,
        position,
        size: ctx.measureText(String(col + 1)).width,
        edge: col === 0 || col + 1 === project.cols,
      });
    }
    for (const label of spacedLabels(columnLabels)) {
      ctx.fillText(String(label.value), label.position, 14);
      ctx.fillText(String(label.value), label.position, this.height - 14);
    }
    const rowLabels: RulerLabel[] = [];
    for (let row = firstRow; row < lastRow; row += 1) {
      const position = y + (row + 0.5) * ch;
      const label = project.rows - row;
      if (
        position < this.ruler ||
        position > this.height - this.ruler ||
        (ch < 20 &&
          label !== 1 &&
          label !== options.weaving?.row &&
          label % (ch < 5 ? 10 : 5) !== 0 &&
          label !== project.rows)
      )
        continue;
      rowLabels.push({
        value: label,
        position,
        size: 12,
        edge:
          label === 1 ||
          label === project.rows ||
          label === options.weaving?.row,
      });
    }
    for (const label of spacedLabels(rowLabels)) {
      ctx.fillText(String(label.value), 14, label.position);
      ctx.fillText(String(label.value), this.width - 14, label.position);
    }
  }

  private point(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private cell(point: Point): CellPoint | null {
    const project = this.options?.project;
    if (
      !project ||
      point.x < this.ruler ||
      point.x >= this.width - this.ruler ||
      point.y < this.ruler ||
      point.y >= this.height - this.ruler
    )
      return null;
    const col = Math.floor((point.x - this.origin.x) / this.cellWidth);
    const row =
      project.rows -
      1 -
      Math.floor((point.y - this.origin.y) / (this.cellWidth * this.ratio));
    return col < 0 || col >= project.cols || row < 0 || row >= project.rows
      ? null
      : { col, row };
  }

  private pinchState() {
    const [a, b] = [...this.pointers.values()];
    return a && b
      ? {
          center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        }
      : null;
  }

  private previewStroke(cell: CellPoint) {
    const options = this.options;
    if (!options) return;
    const colorIndex =
      options.tool === 'erase'
        ? options.project.palette.findIndex(
            (color) => color.id === options.project.backgroundColorId,
          )
        : options.colorIndex;
    const ctx = this.raster.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = options.project.palette[colorIndex]!.hex;
    for (const point of linePoints(this.lastCell ?? cell, cell)) {
      const index = point.row * options.project.cols + point.col;
      if (!this.stroke.has(index)) {
        this.stroke.add(index);
        ctx.fillRect(point.col, options.project.rows - 1 - point.row, 1, 1);
      }
    }
    this.lastCell = cell;
    this.schedule();
  }

  private pointerDown = (event: PointerEvent) => {
    if (
      !this.options ||
      (event.pointerType === 'mouse' &&
        event.button !== 0 &&
        event.button !== 1)
    )
      return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(event.pointerId);
    const point = this.point(event);
    this.pointers.set(event.pointerId, point);
    if (this.pointers.size >= 2) {
      this.complete = false;
      this.rebuildRaster();
      this.stroke.clear();
      this.previewSelection = null;
      this.mode = 'gesture';
      this.pinch = this.pinchState();
      this.schedule();
      return;
    }
    this.startCell = this.cell(point);
    this.lastCell = null;
    this.moving = { col: 0, row: 0 };
    if (this.options.weaving) {
      this.complete = false;
      this.mode = 'pan';
      return;
    }
    if (event.button === 1 || this.space) {
      this.complete = false;
      this.mode = 'pan';
      return;
    }
    if (!this.startCell) return;
    if (this.options.tool === 'fill') {
      this.mode = 'fill';
      return;
    }
    if (this.options.tool === 'select') {
      const selection = this.options.selection;
      this.mode =
        selection &&
        this.startCell.col >= selection.left &&
        this.startCell.col < selection.left + selection.width &&
        this.startCell.row >= selection.bottom &&
        this.startCell.row < selection.bottom + selection.height
          ? 'move'
          : 'select';
      if (this.mode === 'select')
        this.previewSelection = selectionBounds(this.startCell, this.startCell);
      this.schedule();
      return;
    }
    this.mode = 'stroke';
    this.stroke.clear();
    this.previewStroke(this.startCell);
  };

  private pointerMove = (event: PointerEvent) => {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    const point = this.point(event);
    this.pointers.set(event.pointerId, point);
    if (this.pointers.size >= 2) {
      const pinch = this.pinchState();
      if (pinch && this.pinch) {
        const nextWidth = Math.min(
          100,
          Math.max(1, (this.cellWidth * pinch.distance) / this.pinch.distance),
        );
        const factor = nextWidth / this.cellWidth;
        this.origin = {
          x: pinch.center.x + (this.origin.x - this.pinch.center.x) * factor,
          y: pinch.center.y + (this.origin.y - this.pinch.center.y) * factor,
        };
        this.cellWidth = nextWidth;
      }
      this.pinch = pinch;
      this.schedule();
      return;
    }
    if (this.mode === 'pan') {
      this.origin.x += point.x - previous.x;
      this.origin.y += point.y - previous.y;
      this.schedule();
      return;
    }
    const cell = this.cell(point);
    if (!cell) {
      this.lastCell = null;
      return;
    }
    if (this.mode === 'stroke') this.previewStroke(cell);
    if (this.mode === 'select' && this.startCell) {
      this.previewSelection = selectionBounds(this.startCell, cell);
      this.schedule();
    }
    if (this.mode === 'move' && this.startCell) {
      this.moving = {
        col: cell.col - this.startCell.col,
        row: cell.row - this.startCell.row,
      };
      this.schedule();
    }
  };

  private pointerUp = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId) || !this.options) return;
    this.pointerMove(event);
    this.pointers.delete(event.pointerId);
    if (this.pointers.size) return;
    if (this.mode === 'stroke' && this.stroke.size) {
      const color =
        this.options.tool === 'erase'
          ? this.options.project.palette.findIndex(
              (entry) => entry.id === this.options?.project.backgroundColorId,
            )
          : this.options.colorIndex;
      this.options.onStroke(new Set(this.stroke), color);
    }
    if (this.mode === 'select' && this.previewSelection)
      this.options.onSelect(this.previewSelection);
    if (this.mode === 'fill' && this.startCell)
      this.options.onFill(this.startCell);
    if (this.mode === 'move' && this.options.selection)
      this.options.onMove(
        this.options.selection,
        this.moving.col,
        this.moving.row,
      );
    this.mode = 'idle';
    this.previewSelection = null;
    this.stroke.clear();
    this.pinch = null;
    this.schedule();
  };

  private pointerCancel = (event: PointerEvent) => {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    this.mode = 'gesture';
    this.stroke.clear();
    this.previewSelection = null;
    this.rebuildRaster();
    this.schedule();
    if (!this.pointers.size) this.mode = 'idle';
  };

  private wheel = (event: WheelEvent) => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    this.zoom(Math.exp(-event.deltaY * 0.002), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };
  private keyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.matches('input,select,textarea,button,summary') ||
        target.isContentEditable)
    )
      return;
    if (event.code === 'Space') {
      event.preventDefault();
      this.space = true;
    }
  };
  private keyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') this.space = false;
  };
  private blur = () => {
    this.space = false;
  };

  zoom(
    factor: number,
    point: Point = { x: this.width / 2, y: this.height / 2 },
  ) {
    this.complete = false;
    const width = Math.min(100, Math.max(1, this.cellWidth * factor));
    const actual = width / this.cellWidth;
    this.origin = {
      x: point.x + (this.origin.x - point.x) * actual,
      y: point.y + (this.origin.y - point.y) * actual,
    };
    this.cellWidth = width;
    this.schedule();
  }

  fit() {
    if (!this.options) return;
    this.setView(completeView(this.viewport()));
    this.schedule();
  }

  destroy() {
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointermove', this.pointerMove);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('pointercancel', this.pointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.pointerCancel);
    this.canvas.removeEventListener('wheel', this.wheel);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.canvas.removeEventListener('blur', this.blur);
  }
}
