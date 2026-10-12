import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { createPatternPdf } from './pdf';
import { TEST_PROFILE, TEST_PROJECT } from '../core/testFixtures';
it('exports the real 64 by 72 PDF in one grid tile and 200 by 200 in several grid tiles', async()=>{
  const font=Uint8Array.from(readFileSync('src/assets/fonts/NotoSans-Regular.ttf')).buffer;
  const symbols=Uint8Array.from(readFileSync('src/assets/fonts/NotoSansSymbols-Regular.ttf')).buffer;
  mkdirSync('.qa',{recursive:true});
  for(const [cols,rows] of [[64,72],[200,200]] as const){
    const project={...TEST_PROJECT,name:`Patrón de prueba ${cols} × ${rows}`,cols,rows,cells:Array.from({length:cols*rows},(_,index)=>Math.abs(index%cols-(cols-1)/2)+Math.abs(Math.floor(index/cols)-(rows-1)/2)<Math.min(cols,rows)/3?1:0)};
    const result=await createPatternPdf(project,TEST_PROFILE,font,symbols);
    if(cols===64)expect(result.gridPages).toBe(1);else expect(result.gridPages).toBeGreaterThan(1);
    expect(result.blob.type).toBe('application/pdf');expect(result.blob.size).toBeGreaterThan(10000);
    const data=Buffer.from(await result.blob.arrayBuffer());
    const decoded=[...data.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map(match=>{try{return inflateSync(Buffer.from(match[1]!,'latin1')).toString('latin1');}catch{return match[1]!;}}).join('\n');
    expect(decoded).toMatch(/<[0-9a-f]+>\s*<2190>/i);expect(decoded).toMatch(/<[0-9a-f]+>\s*<2192>/i);
    writeFileSync(`.qa/pattern-${cols}x${rows}.pdf`,data);
  }
},30000);
