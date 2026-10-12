import { useMemo, useState } from 'react';
import { patternDocument } from '../core/patternDocument';
import type { GaugeProfile, Project } from '../core/types';
import { copyText, downloadBlob } from '../export/download';
import { createGridPng } from '../export/png';

export default function Pattern({ project, profile, onBack }: { project: Project; profile: GaugeProfile; onBack(): void }) {
  const document = useMemo(()=>patternDocument(project,profile),[project,profile]);
  const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [error,setError]=useState('');
  const meters=new Intl.NumberFormat('es',{minimumFractionDigits:1,maximumFractionDigits:1});
  async function action(operation:()=>Promise<void>, message:string) {setBusy(true);setError('');setNotice('');try{await operation();setNotice(message);}catch(reason){setError(reason instanceof Error?reason.message:'No se pudo exportar el patrón.');}finally{setBusy(false);}}
  return <main className="page pattern-page"><button onClick={onBack}>← Editor</button><header><p className="eyebrow">TU DISEÑO, FILA POR FILA</p><h1>Patrón · {project.name}</h1>{document.heading.slice(1).map(line=><p key={line}>{line}</p>)}</header>
    <div className="pattern-actions"><button disabled={busy} onClick={()=>{void action(()=>copyText(document.text),'Patrón copiado.');}}>Copiar patrón</button><button disabled={busy} onClick={()=>{void action(async()=>downloadBlob(await createGridPng(project,profile),`${project.name}.png`),'Imagen descargada.');}}>Descargar PNG</button><button disabled={busy} onClick={()=>{void action(async()=>{const {createPatternPdf}=await import('../export/pdf');downloadBlob((await createPatternPdf(project,profile)).blob,`${project.name}.pdf`);},'PDF descargado.');}}>Descargar PDF</button></div>
    {busy&&<p role="status">Preparando el archivo…</p>}{notice&&<p role="status" className="notice">{notice}</p>}{error&&<p role="alert" className="error">{error} Puedes seleccionar el texto de abajo para copiarlo.</p>}
    <section><h2>Leyenda</h2><ul className="pattern-legend">{document.written.legend.map(entry=><li key={entry.colorId}><strong>{entry.letter}</strong><span className="color-dot" style={{backgroundColor:project.palette.find(color=>color.id===entry.colorId)!.hex}}/>{entry.name}</li>)}</ul></section>
    <section><h2>Hilo estimado</h2><ul className="yarn-list">{document.estimates.map(entry=><li key={entry.colorId}><span className="color-dot" style={{backgroundColor:entry.color.hex}}/><span>{entry.color.name}</span><strong>{meters.format(entry.meters)} m</strong>{entry.balls!==undefined&&<span>{entry.balls} {entry.balls===1?'ovillo':'ovillos'}</span>}</li>)}</ul><p>Total estimado: <strong>{meters.format(document.totalMeters)} m</strong></p>{document.warnings.map(line=><p key={line} className="subtle">{line}</p>)}</section>
    <section><h2>{project.construction==='round'?'Vuelta por vuelta':'Fila por fila'}</h2><ol className="pattern-rows">{document.written.rows.map(row=><li key={row.row}>{row.text}</li>)}</ol></section>
  </main>;
}
