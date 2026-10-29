// Importación de una descarga de GBIF: occurrence.txt (TSV, la «descarga simple») y un .zip DwC-A armado en memoria.
//   node pruebas/gbif.js [ruta_al_html]
// Lee ejemplo/gbif_occurrence_ejemplo.txt (8 registros inventados, con las columnas de una descarga de GBIF) por el mismo
// camino que el botón de abrir archivo (abrirLibro -> parseWorkbook -> unirFuentes) y comprueba: cuántos registros entran, que
// los campos de GBIF se mapean, que el visor reconoce la descarga y qué errores detecta en cada fila.
// El .zip se arma aquí, sin compresión (método 0), con occurrence.txt, meta.xml y el EML de un conjunto de datos: no hace falta
// DecompressionStream. Se omite sola contra un visor que no tiene abrirLibro.
// No cubre la verificación de nombres contra GBIF (red) ni los zip comprimidos con deflate (los abre el navegador).
const fs=require('fs'),path=require('path');
const {cargarVisor,ev,RAIZ}=require('./cargar.js');
const html=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(RAIZ,'index.html'));
const ctx=cargarVisor(html);
if(ev(ctx,'typeof abrirLibro')!=='function'||ev(ctx,'typeof zipEntradas')!=='function'){
  console.log('Omitida: este visor no tiene abrirLibro (importación de GBIF).');process.exit(0);
}
const X=ev(ctx,'({abrirLibro,parseWorkbook,unirFuentes,setSources(v){sources=v},get DATA(){return DATA}})');
const TSV=fs.readFileSync(path.join(RAIZ,'ejemplo','gbif_occurrence_ejemplo.txt'));
const DK='00000000-0000-4000-8000-0000000000e1';

// ---- un .zip mínimo sin compresión ----
const T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T[n]=c>>>0;}
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=T[(c^x)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
function zip(arch){ // [[nombre, Buffer]]
  const loc=[],cen=[];let pos=0;
  for(const [nom,dat] of arch){
    const n=Buffer.from(nom),h=Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt32LE(crc(dat),14);h.writeUInt32LE(dat.length,18);h.writeUInt32LE(dat.length,22);h.writeUInt16LE(n.length,26);
    const c=Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc(dat),16);c.writeUInt32LE(dat.length,20);c.writeUInt32LE(dat.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(pos,42);
    loc.push(h,n,dat);cen.push(c,n);pos+=30+n.length+dat.length;
  }
  const cd=Buffer.concat(cen),e=Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(arch.length,8);e.writeUInt16LE(arch.length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(pos,16);
  return Buffer.concat([...loc,cd,e]);
}
const META='<?xml version="1.0"?><archive xmlns="http://rs.tdwg.org/dwc/text/"><core rowType="http://rs.tdwg.org/dwc/terms/Occurrence"><files><location>occurrence.txt</location></files></core></archive>';
const EML='<?xml version="1.0"?><eml:eml><dataset><title>Conjunto de ejemplo de VisionCore</title></dataset></eml:eml>';
const ZIP=zip([['meta.xml',Buffer.from(META)],['dataset/'+DK+'.xml',Buffer.from(EML)],['occurrence.txt',TSV],['verbatim.txt',Buffer.from('gbifID\n5000000001\n')]]);

let ok=0,mal=0;
const prueba=(txt,cond,det)=>{if(cond)ok++;else{mal++;console.error('FALLA: '+txt+(det?' ('+det+')':''));}};
const tipos=r=>[].concat(r.iss||[],r.alerta||[]).map(x=>x.t);

async function cargar(bytes,nombre){
  const a=await X.abrirLibro(new ctx.Uint8Array(bytes),nombre);
  const r=X.parseWorkbook(a.wb);
  X.setSources([{name:nombre,archivo:nombre,recs:r.recs,hoja:r.hoja,terminos:r.terminos,etiquetas:r.etiquetas}]);
  X.unirFuentes();
  return {a,r,recs:X.DATA};
}

(async()=>{
  // 1. descarga simple: occurrence.txt
  const t=await cargar(TSV,'occurrence.txt');
  prueba('occurrence.txt: se reconoce como descarga de GBIF',t.a.tipo==='gbif',t.a.tipo);
  prueba('occurrence.txt: parseWorkbook marca esGbif',t.r.esGbif===true);
  prueba('occurrence.txt: entran los 8 registros',t.recs.length===8,String(t.recs.length));
  const R=t.recs;
  prueba('campos: scientificName y gbifID',R[0].sci.startsWith('Dendropsophus molitor')&&R[0].gbifId==='5000000001',R[0].sci+' / '+R[0].gbifId);
  prueba('campos: decimalLatitude y decimalLongitude',R[0].lat===5.4012&&R[0].lon===-73.3521,R[0].lat+', '+R[0].lon);
  prueba('campos: catalogNumber y occurrenceID',R[0].cat==='EJEM-0001'&&R[0].occ==='EJEM:HERP:0001',R[0].cat+' / '+R[0].occ);
  prueba('campos: family y clase',R[0].fam==='Hylidae'&&R[2].fam==='Bufonidae');
  prueba('campos: fecha de colecta',R[0].date==='2019-05-02'&&R[2].date==='2020-02-11',R[0].date+' / '+R[2].date);
  prueba('registros marcados como de GBIF',R.every(r=>r.gbif===true));
  prueba('fila sin coordenadas queda sin lat/lon',R[7].lat==null&&R[7].lon==null);
  // errores: filas desde 0
  prueba('fila 6 (Rhinella marina con class=Reptilia): clase_incongruente',tipos(R[5]).includes('clase_incongruente'),tipos(R[5]).join(','));
  prueba('fila 7 (latitud 95,5): coord_fuera_rango',tipos(R[6]).includes('coord_fuera_rango'),tipos(R[6]).join(','));
  prueba('fila 8 (sin coordenadas): sin_coordenadas',tipos(R[7]).includes('sin_coordenadas'),tipos(R[7]).join(','));
  prueba('fila 1 (sana): ningún hallazgo',tipos(R[0]).length===0,tipos(R[0]).join(','));
  prueba('fila 4 (sana): ningún hallazgo',tipos(R[3]).length===0,tipos(R[3]).join(','));
  prueba('fila 6: el error es solo la clase',tipos(R[5]).join()==='clase_incongruente',tipos(R[5]).join(','));
  prueba('bandera de GBIF de la fila 3 (issue) sale como alerta propia',(R[2].alerta||[]).some(x=>/^ag_/.test(x.t)),tipos(R[2]).join(','));

  // 2. DwC-A: .zip con occurrence.txt, meta.xml y EML
  const z=await cargar(ZIP,'0000000-ejemplo.zip');
  prueba('zip: se reconoce como descarga de GBIF',z.a.tipo==='gbif',z.a.tipo);
  prueba('zip: lee occurrence.txt y no verbatim.txt',z.a.dentro==='occurrence.txt',z.a.dentro);
  prueba('zip: 8 registros, los mismos que en el TSV',z.recs.length===8&&z.recs.every((r,i)=>r.gbifId===R[i].gbifId),String(z.recs.length));
  prueba('zip: el título del conjunto sale del EML',z.a.nTitulos===1&&z.recs[0].dsTit==='Conjunto de ejemplo de VisionCore',z.a.nTitulos+' / '+z.recs[0].dsTit);
  prueba('zip: mismos hallazgos que el TSV',z.recs.every((r,i)=>tipos(r).join()===tipos(R[i]).join()));

  // 3. un .zip sin ningún texto de ocurrencias se rechaza con mensaje
  let msg='';try{await X.abrirLibro(new ctx.Uint8Array(zip([['meta.xml',Buffer.from(META)]])),'vacio.zip');}catch(e){msg=e.message;}
  prueba('zip sin occurrence.txt: error claro',/occurrence\.txt/.test(msg),msg);

  console.log(`\nVisor: ${path.relative(process.cwd(),html)}\n${ok} bien, ${mal} fallan`);
  process.exit(mal?1:0);
})().catch(e=>{console.error('FALLA: '+e.stack);process.exit(1);});
