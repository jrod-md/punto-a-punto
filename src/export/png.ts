import { gauge } from '../core/gauge';
import type { GaugeProfile, Project } from '../core/types';
import { patternHeading } from '../core/patternDocument';
import { spacedLabels } from '../editor/view';

export async function createGridPng(project: Project, profile: GaugeProfile): Promise<Blob> {
  const measures = gauge(profile);
  const ratio = measures.rowHeightCm / measures.stitchWidthCm;
  const cw = Math.min(24, 4000 / project.cols, 3000 / (project.rows * ratio), Math.sqrt(10000000 / (project.cols * project.rows * ratio)));
  const ch = cw * ratio;
  if (Math.min(cw, ch) < 2) throw new Error('La proporción de esta muestra genera una imagen demasiado grande. Descarga la cuadrícula dividida en PDF.');
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil(Math.max(640, project.cols * cw + 96));
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Este navegador no permite crear la imagen.');
  ctx.font = '18px system-ui';
  const wrap = (text: string): string[] => {
    const lines: string[] = []; let line = '';
    for (const character of text) { if (ctx.measureText(line + character).width > canvas.width - 96) { lines.push(line); line = ''; } line += character; }
    if (line) lines.push(line); return lines;
  };
  const heading = patternHeading(project, profile).flatMap(wrap);
  const legend = project.palette.map((color, index) => ({ color, lines: wrap(`${String.fromCharCode(65 + index)} · ${color.name}`) }));
  const top = heading.length * 26 + 56;
  const legendHeight = legend.reduce((sum, item) => sum + Math.max(32, item.lines.length * 24 + 8), 0);
  const height = Math.ceil(top + project.rows * ch + legendHeight + 120);
  if (height > 4096) throw new Error('Los nombres y la leyenda superan el tamaño de imagen disponible. Descarga el PDF o acorta los nombres.');
  canvas.height = height;
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#30382f'; ctx.font = '18px system-ui';
  heading.forEach((line,index)=>ctx.fillText(line,48,32+index*26));
  const left = (canvas.width - project.cols * cw) / 2;
  for(let row=0;row<project.rows;row++) for(let col=0;col<project.cols;col++) { ctx.fillStyle=project.palette[project.cells[row*project.cols+col]!]!.hex; ctx.fillRect(left+col*cw,top+(project.rows-1-row)*ch,cw,ch); }
  for(let col=0;col<=project.cols;col++) { ctx.strokeStyle=col%10===0?'#30382f':col%5===0?'#707968':'#b1b6ab';ctx.lineWidth=col%10===0?2:col%5===0?1.3:0.6;ctx.beginPath();ctx.moveTo(left+col*cw,top);ctx.lineTo(left+col*cw,top+project.rows*ch);ctx.stroke(); }
  for(let row=0;row<=project.rows;row++) { ctx.strokeStyle=row%10===0?'#30382f':row%5===0?'#707968':'#b1b6ab';ctx.lineWidth=row%10===0?2:row%5===0?1.3:0.6;ctx.beginPath();ctx.moveTo(left,top+(project.rows-row)*ch);ctx.lineTo(left+project.cols*cw,top+(project.rows-row)*ch);ctx.stroke(); }
  ctx.font='12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#30382f';
  const columns = spacedLabels(Array.from({length:project.cols},(_,col)=>({value:col+1,position:left+(col+.5)*cw,size:ctx.measureText(String(col+1)).width,edge:col===0||col+1===project.cols})).filter(item=>cw>=24||item.edge||item.value%5===0));
  const rows = spacedLabels(Array.from({length:project.rows},(_,row)=>({value:row+1,position:top+(project.rows-row-.5)*ch,size:14,edge:row===0||row+1===project.rows})).filter(item=>ch>=20||item.edge||item.value%5===0));
  for(const item of columns) {ctx.fillText(String(item.value),item.position,top-20);ctx.fillText(String(item.value),item.position,top+project.rows*ch+20);}
  for(const item of rows) {ctx.fillText(String(item.value),left-24,item.position);ctx.fillText(String(item.value),left+project.cols*cw+24,item.position);}
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='18px system-ui';
  let y = top + project.rows * ch + 64;
  for(const item of legend) { ctx.fillStyle=item.color.hex;ctx.fillRect(48,y-18,22,22);ctx.strokeStyle='#707968';ctx.lineWidth=1;ctx.strokeRect(48,y-18,22,22);ctx.fillStyle='#30382f';for(const line of item.lines) {ctx.fillText(line,82,y);y+=24;}y+=8; }
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No se pudo crear la imagen.')), 'image/png'));
}
