// Ida y vuelta del Excel corregido (desde la 0.37): el visor escribe el libro corregido, quien revisa marca «sí» en «Por decidir», se vuelve a cargar y sale la versión _v2.
//   node pruebas/idavuelta.js [ruta_al_html]
// No hay navegador: XLSX.writeFile se reemplaza por una función que guarda el libro, y el libro pasa por XLSX.write / XLSX.read como si fuera un archivo guardado
// y vuelto a abrir (así los comentarios de celda viajan de verdad). Usa ejemplo/ejemplo_visioncore.xlsx (sintético) y un libro sintético para las columnas verbatim.
// Si el visor no trae leerPorDecidir (la 0.36.0), se omite entero.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {cargarVisor,RAIZ}=require('./cargar.js');
const S=require('./sintetico.js');
const html=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(RAIZ,'index.html'));
const ctx=cargarVisor(html);
const XL=ctx.XLSX;
const ev=e=>vm.runInContext(e,ctx,{timeout:20000});
if(!ev('typeof leerPorDecidir==="function"&&typeof libroDwC==="function"&&typeof exportDwCcorregido==="function"')){
  console.log(`Visor: ${path.relative(process.cwd(),html)}\nOmitida: este visor no tiene la hoja «Por decidir» ni la recarga de decisiones (llegan con la 0.37).`);
  process.exit(0);
}
const X=ev('({parseWorkbook,unirFuentes,setSources(v){sources=v},get sources(){return sources},get DATA(){return DATA}})');
const ETQ=S.etiquetasDe(ctx);

let bien=0,mal=0;const fallos=[];
let seccion='';
const ok=(cond,msg)=>{if(cond)bien++;else{mal++;fallos.push(`  [${seccion}] ${msg}`);}};
const igual=(a,b,msg)=>ok(JSON.stringify(a)===JSON.stringify(b),`${msg}: esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`);

// ---- ayudas ----
const aoa=(wb,n)=>wb.Sheets[n]?XL.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:''}):null;
const celda=(wb,n,r0,c0)=>wb.Sheets[n][XL.utils.encode_cell({r:r0,c:c0})];
const comentario=(wb,n,r0,c0)=>{const c=celda(wb,n,r0,c0);return c&&c.c?c.c.map(x=>x.t).join('\n'):'';};
const txt=v=>String(v==null?'':v).trim();
// descarga simulada: lo que el visor le pasa a XLSX.writeFile; el libro se pasa por un archivo en memoria, como si se guardara y se abriera de nuevo
function descargar(){
  let cap=null;XL.writeFile=(wb,nombre)=>{cap={wb,nombre};};
  ev('exportando=true'); // el envoltorio conCapaExport espera un cuadro de animación que aquí no existe; con esta marca llama directo a la función
  ev('exportDwCcorregido()');
  if(!cap)throw new Error('exportDwCcorregido no llamó a XLSX.writeFile');
  const buf=XL.write(cap.wb,{type:'buffer',bookType:'xlsx',compression:true});
  return {nombre:cap.nombre,wb:XL.read(buf,{type:'buffer',cellDates:true})};
}
// carga un libro como cargarLote: parseWorkbook + leerPorDecidir, y una sola fuente con el nombre del archivo
function cargar(wb,archivo){
  const r=X.parseWorkbook(wb);
  X.setSources([{name:archivo.replace(/\.xlsx$/i,''),archivo,decisiones:ev('leerPorDecidir')(wb),count:r.recs.length,recs:r.recs,terminos:r.terminos,etiquetas:r.etiquetas,hoja:r.hoja}]);
  X.unirFuentes();
  return r;
}
// guarda y vuelve a abrir (para después de editar celdas a mano)
const guardarYAbrir=wb=>XL.read(XL.write(wb,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellDates:true});
// cambia una celda de una hoja del libro leído
function poner(wb,n,r0,c0,v){const a=XL.utils.encode_cell({r:r0,c:c0});wb.Sheets[n][a]={t:typeof v==='number'?'n':'s',v};}
// filas de «Por decidir» como objetos por nombre de columna
function decidir(wb){const a=aoa(wb,'Por decidir'),h=a[0];return a.slice(1).filter(f=>txt(f[h.indexOf('codigo_regla')])).map((f,i)=>{const o={_fila:i+2};h.forEach((k,j)=>{o[k]=f[j];});return o;});}
const COLAPL='¿Aplicar? (sí / no)';
// libro de cambios como objetos
function cambios(wb){const a=aoa(wb,'Cambios');return a.slice(1).map(f=>({fuente:f[0],fila:+f[1],cat:txt(f[2]),columna:txt(f[3]).replace(/ \(columna agregada\)$/,''),agregada:/columna agregada/.test(f[3]),antes:txt(f[4]),despues:txt(f[5]),regla:txt(f[6])}));}
const leame=wb=>aoa(wb,'LÉAME').map(f=>String(f[0]));

// ================= 1. el ejemplo de ejemplo/ =================
seccion='ejemplo, ida';
const dirEj=path.join(RAIZ,'ejemplo');
const archEj='ejemplo_visioncore.xlsx';
const orig=XL.read(fs.readFileSync(path.join(dirEj,archEj)),{type:'buffer',cellDates:true});
const origA=aoa(orig,orig.SheetNames[0]);
cargar(orig,archEj);
const v1=descargar();
ok(/^ejemplo_visioncore_corregido\.xlsx$/.test(v1.nombre),`nombre de la primera descarga: ${v1.nombre}`);
igual(v1.wb.SheetNames,['LÉAME','Plantilla','Por decidir','Cambios','VisionCore'],'hojas y su orden');
const L1=leame(v1.wb);
ok(/Excel corregido \(propuesta\)/.test(L1[0]),'el LÉAME dice que es una propuesta');
ok(L1.some(l=>/Es una propuesta.*puede equivocarse/.test(l)),'el LÉAME avisa que VisionCore puede equivocarse');
ok(L1.some(l=>/No borre nunca el archivo original ni las versiones anteriores/.test(l)),'el LÉAME dice que no se borre el original ni las versiones anteriores');
ok(L1.some(l=>l.indexOf(archEj)>=0),'el LÉAME nombra el archivo de origen');

const P1=aoa(v1.wb,'Plantilla'),enc=P1[0];
// las columnas del original, en el mismo orden y al comienzo; las nuevas (taxonRank) detrás
igual(enc.slice(0,origA[0].length),origA[0],'columnas de Plantilla = columnas del original (mismo orden)');
igual(P1[1].slice(0,origA[1].length),origA[1],'la fila de etiquetas no cambia');
igual(P1.length,origA.length,'filas de Plantilla = filas del original');
const camb1=cambios(v1.wb),pd1=decidir(v1.wb);
ok(camb1.length>0&&pd1.length>0,`hay correcciones (${camb1.length}) y propuestas (${pd1.length})`);
// las celdas de Plantilla que difieren del original son exactamente las de «Cambios»
{
  const dif=new Set(),lis=new Set();
  for(let i=2;i<origA.length;i++)origA[0].forEach((h,j)=>{if(txt(origA[i][j])!==txt(P1[i][j]))dif.add((i+1)+'|'+h);});
  camb1.filter(c=>!c.agregada).forEach(c=>lis.add(c.fila+'|'+c.columna));
  igual([...dif].sort(),[...lis].sort(),'celdas que difieren del original = celdas de «Cambios»');
  camb1.forEach(c=>{
    const j=enc.indexOf(c.columna);
    ok(j>=0,`«Cambios» nombra una columna que no está en Plantilla: ${c.columna}`);
    if(j<0)return;
    ok(txt(P1[c.fila-1][enc.indexOf('catalogNumber')])===c.cat,`«Cambios» fila ${c.fila}: el catálogo ${c.cat} no es el de esa fila de Plantilla`);
    ok(txt(P1[c.fila-1][j])===c.despues,`Plantilla fila ${c.fila}, ${c.columna}: dice «${txt(P1[c.fila-1][j])}» y «Cambios» dice «${c.despues}»`);
    const nota=comentario(v1.wb,'Plantilla',c.fila-1,j);
    ok(/Antes:/.test(nota)&&nota.indexOf(c.antes===''?'(vacía)':c.antes)>=0,`el comentario de ${c.columna} fila ${c.fila} no dice qué había antes («${c.antes}»): «${nota.slice(0,60)}»`);
  });
}
// cada propuesta apunta a su fila de «Por decidir» y a la celda correcta
pd1.forEach(p=>{
  const col0=txt(p.columna).split(' / ')[0],j=enc.indexOf(col0);
  const m=n=>`propuesta de la fila ${p._fila} de «Por decidir» (${p.codigo_regla})`;
  // una propuesta para una columna que el archivo no tiene (occurrenceID, type, countryCode en el ejemplo) no tiene celda donde poner el comentario: la aplicación la agrega
  if(j<0){ok(p.fila_plantilla==='todas'&&origA[0].indexOf(col0)<0,`${m()}: la columna ${col0} no está en Plantilla y no es de toda la columna`);return;}
  if(p.fila_plantilla==='todas'){
    const nota=comentario(v1.wb,'Plantilla',0,j);
    ok(/Por decidir/.test(nota)&&nota.indexOf('fila '+p._fila)>=0,`${m()}: el comentario del encabezado ${col0} debía apuntar a la fila ${p._fila}: «${nota.slice(0,70)}»`);
  }else{
    const r0=+p.fila_plantilla-1;
    ok(txt(P1[r0][enc.indexOf('catalogNumber')])===txt(p.catalogNumber),`${m()}: el catálogo ${p.catalogNumber} no es el de la fila ${p.fila_plantilla} de Plantilla`);
    ok(+p.fila_excel===+p.fila_plantilla,`${m()}: fila_excel y fila_plantilla deberían coincidir en un archivo que viene de una plantilla (${p.fila_excel} / ${p.fila_plantilla})`);
    const nota=comentario(v1.wb,'Plantilla',r0,j);
    ok(/Propuesta sin aplicar/.test(nota)&&nota.indexOf('fila '+p._fila)>=0,`${m()}: el comentario de ${col0} fila ${p.fila_plantilla} debía apuntar a la fila ${p._fila}: «${nota.slice(0,70)}»`);
    // no se aplicó: la celda conserva su valor original
    if(!/Longitude/.test(col0)||true){const oj=origA[0].indexOf(col0);if(oj>=0&&!camb1.some(c=>c.fila===+p.fila_plantilla&&c.columna===col0))ok(txt(P1[r0][j])===txt(origA[r0][oj]),`${m()}: la celda ${col0} fila ${p.fila_plantilla} cambió sin que nadie dijera «sí»`);}
  }
});
// las cifras del LÉAME cuadran con las hojas
{
  const c=L1.find(l=>/^Correcciones seguras aplicadas: /.test(l)),p=L1.find(l=>/^Propuestas por decidir: /.test(l));
  ok(c&&+/: ([\d.]+)/.exec(c)[1].replace(/\./g,'')===camb1.length,`el LÉAME dice «${c}» y «Cambios» tiene ${camb1.length}`);
  ok(p&&+/: ([\d.]+)/.exec(p)[1].replace(/\./g,'')===pd1.length,`el LÉAME dice «${p}» y «Por decidir» tiene ${pd1.length}`);
  const cols=L1.filter(l=>/^· /.test(l));
  ok(cols.length>0&&cols.every(l=>/propuesta en «Por decidir»|corregido en este archivo|sin propuesta: hay que arreglarlo a mano/.test(l)),'cada arreglo de toda la columna del LÉAME dice su estado');
}
// el encabezado de «Por decidir»
igual(aoa(v1.wb,'Por decidir')[0],ev('COLS_DECIDIR'),'encabezado de «Por decidir»');
// verbatim: ninguna corrección lo toca
ok(!camb1.some(c=>/^verbatim/i.test(c.columna)),'ninguna corrección segura escribe en una columna verbatim');
origA[0].forEach((h,j)=>{if(/^verbatim/i.test(h))for(let i=2;i<origA.length;i++)ok(txt(origA[i][j])===txt(P1[i][enc.indexOf(h)]),`la columna ${h} fila ${i+1} cambió`);});

// ================= 2. la vuelta: «sí» en «Por decidir», recarga y _v2 =================
seccion='ejemplo, vuelta';
const w1=guardarYAbrir(v1.wb);                          // el archivo que guarda quien revisa
const hP=aoa(w1,'Por decidir')[0],iA=hP.indexOf(COLAPL);
const pdw=decidir(w1);
// «sí» a todas menos una («no»: la primera propuesta suelta) y una celda cambiada a mano antes de recargar (genus de la propuesta de género)
const deGenero=pdw.find(p=>p.codigo_regla==='genero_no_concuerda');
const primeraSuelta=pdw.find(p=>p.fila_plantilla!=='todas'&&p!==deGenero);
ok(!!primeraSuelta,'el ejemplo trae otra propuesta suelta para marcarla «no»');
pdw.forEach(p=>poner(w1,'Por decidir',p._fila-1,iA,p===primeraSuelta?'no':'sí'));
const jg=aoa(w1,'Plantilla')[0].indexOf('genus');
ok(!!deGenero,'el ejemplo trae una propuesta de género que no concuerda (para el caso de la celda cambiada a mano)');
if(deGenero)poner(w1,'Plantilla',+deGenero.fila_plantilla-1,jg,'Boana');
const w1b=guardarYAbrir(w1);
cargar(w1b,v1.nombre);
const dec=ev('cifrasDecisiones()');
igual([dec.si,dec.no,dec.vacias],[pdw.length-1,1,0],'decisiones leídas (sí / no / sin decidir)');
const v2=descargar();
ok(v2.nombre==='ejemplo_visioncore_corregido_v2.xlsx',`la segunda descarga se llama ${v2.nombre} y debía ser ejemplo_visioncore_corregido_v2.xlsx`);
igual(v2.wb.SheetNames,['LÉAME','Plantilla','Por decidir','Cambios','VisionCore'],'hojas de la v2');
const L2=leame(v2.wb);
ok(L2.some(l=>l.indexOf('Versión anterior: '+v1.nombre)>=0),'el LÉAME de la v2 nombra la versión anterior');
ok(L2.some(l=>new RegExp('^Decisiones «sí» de la versión anterior: '+(pdw.length-1)+'\\.').test(l)),`el LÉAME de la v2 cuenta las ${pdw.length-1} decisiones «sí»: ${L2.find(l=>/Decisiones «sí»/.test(l))}`);
const camb2=cambios(v2.wb),apr=camb2.filter(c=>/^Aprobada en «Por decidir»/.test(c.regla)),P2=aoa(v2.wb,'Plantilla'),enc2=P2[0],pd2=decidir(v2.wb);
ok(apr.length>0,`la v2 aplicó decisiones (celdas escritas: ${apr.length})`);
// la v2 trae todo lo seguro de la v1 y además lo aprobado
ok(camb2.length>=apr.length,'«Cambios» de la v2 no tiene menos que lo aprobado');
// cada «sí» que VisionCore dice que aplica: o se aplicó, o sigue en «Por decidir» con su motivo en «resultado»
pdw.forEach(p=>{
  if(p===primeraSuelta)return;
  const cl=`«sí» de ${p.codigo_regla} (${p.fila_plantilla}, ${p.columna})`;
  const hecha=apr.some(c=>(p.fila_plantilla==='todas'||c.fila===+p.fila_plantilla)&&p.columna.split(' / ').includes(c.columna));
  const resto=pd2.find(q=>q.codigo_regla===p.codigo_regla&&String(q.fila_plantilla)===String(p.fila_plantilla)&&q.columna===p.columna);
  if(p===deGenero){
    ok(!hecha,`${cl}: la celda se cambió a mano y aun así se aplicó`);
    // el «sí» perdido se agrega como fila aparte (con su dice de antes); el hallazgo nuevo, con la celda cambiada, trae su propia fila sin decisión
    const perdida=pd2.find(q=>q.codigo_regla===p.codigo_regla&&String(q.fila_plantilla)===String(p.fila_plantilla)&&q.columna===p.columna&&q.dice===p.dice);
    ok(perdida&&/celda cambió|ya no aparece/.test(perdida.resultado)&&perdida[COLAPL]==='sí',`${cl}: debía quedar en «Por decidir», con su «sí» y el motivo «el hallazgo ya no aparece o la celda cambió», y dice «${perdida&&perdida.resultado}»`);
    const jj=enc2.indexOf('genus');ok(txt(P2[+deGenero.fila_plantilla-1][jj])==='Boana',`${cl}: la celda cambiada a mano no debía tocarse`);
    return;
  }
  if(/^sí/.test(p.visioncore_la_aplica))ok(hecha||(resto&&txt(resto.resultado)!==''),`${cl}: dice «${p.visioncore_la_aplica}» pero ni se aplicó ni quedó con su motivo`);
  else ok(!hecha&&resto&&txt(resto.resultado)!=='',`${cl}: dice «${p.visioncore_la_aplica}»; debía quedar sin aplicar y con motivo en «resultado» (resultado: «${resto&&resto.resultado}»)`);
});
// el «no» se conserva y no se aplica
{
  const resto=pd2.find(q=>q.codigo_regla===primeraSuelta.codigo_regla&&String(q.fila_plantilla)===String(primeraSuelta.fila_plantilla)&&q.columna===primeraSuelta.columna);
  ok(!apr.some(c=>c.fila===+primeraSuelta.fila_plantilla&&primeraSuelta.columna.split(' / ').includes(c.columna)),'la decisión «no» se aplicó');
  ok(resto&&resto[COLAPL]==='no',`la decisión «no» debía conservarse en la v2 (quedó «${resto&&resto[COLAPL]}»)`);
}
// lo aprobado quedó escrito en Plantilla y con su comentario
apr.forEach(c=>{
  const j=enc2.indexOf(c.columna);
  ok(j>=0&&txt(P2[c.fila-1][j])===c.despues,`aprobada ${c.columna} fila ${c.fila}: Plantilla dice «${j>=0?txt(P2[c.fila-1][j]):'(no existe)'}» y «Cambios» dice «${c.despues}»`);
  const nota=j>=0?comentario(v2.wb,'Plantilla',c.fila-1,j):'';
  ok(/Aprobada en «Por decidir»/.test(nota),`aprobada ${c.columna} fila ${c.fila}: el comentario no lo dice («${nota.slice(0,50)}»)`);
});
// el LÉAME cuenta las aplicadas
{
  const l=L2.find(x=>/^Decisiones «sí» de la versión anterior/.test(x))||'';
  const m=/Aplicadas: ([\d.]+) \(([\d.]+) celdas/.exec(l);
  ok(m&&+m[2].replace(/\./g,'')===apr.length,`el LÉAME dice «${l.slice(0,100)}» y «Cambios» tiene ${apr.length} celdas aprobadas`);
}
// verbatim sigue igual en la v2
origA[0].forEach((h,j)=>{if(/^verbatim/i.test(h))for(let i=2;i<origA.length;i++)ok(txt(origA[i][j])===txt(P2[i][enc2.indexOf(h)]),`v2: la columna ${h} fila ${i+1} cambió`);});
// la v1 que se cargó no se tocó (otro libro, otra lectura)
igual(aoa(guardarYAbrir(v1.wb),'Plantilla'),P1,'la versión anterior no cambia al generar la nueva');

// ================= 3. recargar la v2: los hallazgos bajan y la v3 no vuelve a aplicar =================
seccion='ejemplo, v3';
const tipos=recs=>{const o={};recs.forEach(r=>(r.iss||[]).concat(r.sib||[]).forEach(x=>{o[x.t]=(o[x.t]||0)+1;}));return o;};
const antes=tipos(cargar(orig,archEj).recs);
cargar(guardarYAbrir(v2.wb),v2.nombre);
const despues=tipos(X.DATA);
const sum=o=>Object.values(o).reduce((s,n)=>s+n,0);
ok(sum(despues)<sum(antes),`al recargar la v2 hay menos hallazgos que en el original (${sum(despues)} contra ${sum(antes)})`);
ok((despues.genero_no_concuerda||0)>=1,'el género cambiado a mano en la v2 sigue señalado como hallazgo');
const v3=descargar();
ok(v3.nombre==='ejemplo_visioncore_corregido_v3.xlsx',`la tercera descarga se llama ${v3.nombre} y debía ser ejemplo_visioncore_corregido_v3.xlsx`);
const apr3=cambios(v3.wb).filter(c=>/^Aprobada en/.test(c.regla));
// lo ya aplicado no se vuelve a aplicar: en este caso lo único pendiente es el «sí» de la celda cambiada a mano, que no se puede aplicar
igual(apr3.length,0,'celdas «Aprobada en Por decidir» en la v3');
ok(!apr3.some(c=>apr.some(a=>a.fila===c.fila&&a.columna===c.columna&&a.despues===c.despues&&a.antes===c.antes)),'la v3 volvió a aplicar una celda que la v2 ya había aplicado');
ok(cambios(v3.wb).filter(c=>!/^Aprobada/.test(c.regla)).length<=camb1.length,'la v3 tiene más correcciones seguras que la v1');

// ================= 4. columnas verbatim con un libro sintético =================
seccion='verbatim';
const filasV=Array.from({length:6},(_,i)=>S.fila(i,i===0?{verbatimLatitude:'5540000',verbatimLongitude:'-73360000'}:i===1?{decimalLongitude:73.36,verbatimLongitude:'73.36',verbatimLatitude:'5.54'}:i===2?{verbatimLatitude:'5°32\'24" N',verbatimLongitude:'73°21\'36" W'}:{}));
const wbV=S.libro(XL,filasV,ETQ),archV='sintetico_verbatim.xlsx';
const origV=aoa(wbV,'Plantilla');
cargar(wbV,archV);
const a1=descargar();
const PV1=aoa(a1.wb,'Plantilla');
const verb=h=>/^verbatim/i.test(h);
origV[0].forEach((h,j)=>{if(verb(h))for(let i=2;i<origV.length;i++)ok(txt(origV[i][j])===txt(PV1[i][PV1[0].indexOf(h)]),`v1 sintético: ${h} fila ${i+1} cambió (${txt(origV[i][j])} -> ${txt(PV1[i][PV1[0].indexOf(h)])})`);});
ok(!cambios(a1.wb).some(c=>verb(c.columna)),'v1 sintético: «Cambios» escribió en una columna verbatim');
const pdV=decidir(a1.wb);
ok(pdV.some(p=>p.codigo_regla==='coord_sin_punto'),'el libro sintético debía traer una propuesta coord_sin_punto en verbatim');
ok(pdV.some(p=>p.codigo_regla==='lon_sin_hemisferio'),'el libro sintético debía traer una propuesta lon_sin_hemisferio');
const wV=guardarYAbrir(a1.wb),iAV=aoa(wV,'Por decidir')[0].indexOf(COLAPL);
decidir(wV).forEach(p=>poner(wV,'Por decidir',p._fila-1,iAV,'sí'));
cargar(guardarYAbrir(wV),a1.nombre);
const a2=descargar();
ok(a2.nombre==='sintetico_verbatim_corregido_v2.xlsx',`nombre de la v2 sintética: ${a2.nombre}`);
const PV2=aoa(a2.wb,'Plantilla');
origV[0].forEach((h,j)=>{if(verb(h))for(let i=2;i<origV.length;i++)ok(txt(origV[i][j])===txt(PV2[i][PV2[0].indexOf(h)]),`v2 sintético: ${h} fila ${i+1} cambió (${txt(origV[i][j])} -> ${txt(PV2[i][PV2[0].indexOf(h)])})`);});
const cV2=cambios(a2.wb);
ok(!cV2.some(c=>verb(c.columna)),'v2 sintético: una decisión escribió en una columna verbatim');
// la longitud sin W de la fila 2 se corrige en decimalLongitude (un número)
{const j=PV2[0].indexOf('decimalLongitude');ok(+PV2[3][j]===-73.36,`v2 sintético: decimalLongitude del segundo registro (fila 4) debía quedar en -73.36 y dice ${PV2[3][j]}`);}
const rv=decidir(a2.wb).find(p=>p.codigo_regla==='coord_sin_punto');
ok(!rv||/verbatim/.test(rv.resultado),`v2 sintético: coord_sin_punto en verbatim debía quedar con el motivo «verbatim» y dice «${rv&&rv.resultado}»`);

// ================= 5. longitud sin W con las decimales vacías o en grados: la propuesta las llena; la decimal ya negativa no se marca =================
seccion='decimales llenas';
{
  const filasD=[
    S.fila(0,{decimalLatitude:undefined,decimalLongitude:undefined,verbatimLatitude:'5.54',verbatimLongitude:'73.36'}),     // vacías, verbatim decimal
    S.fila(1,{decimalLatitude:'5°32\'24" N',decimalLongitude:'73°21\'36"'}),                                              // grados y minutos en las decimales
    S.fila(2,{decimalLatitude:undefined,decimalLongitude:undefined,verbatimCoordinates:'5.54, 73.36'}),                    // vacías, verbatimCoordinates
    S.fila(3,{decimalLatitude:5.54,decimalLongitude:-73.36,verbatimCoordinates:'5.54, 73.36'}),                            // decimal negativa y verbatim positivo: no se marca
    S.fila(4,{decimalLatitude:5.54,decimalLongitude:73.36,verbatimCoordinates:'5.54, 73.36'})                              // decimal positiva: la propuesta de siempre
  ];
  const wbD=S.libro(XL,filasD,ETQ),archD='sintetico_decimales.xlsx';
  const recD=cargar(wbD,archD).recs;
  const lonD=recD.map(r=>(r.iss||[]).some(x=>x.t==='lon_sin_hemisferio'));
  igual(lonD,[true,true,true,false,true],'filas con lon_sin_hemisferio en el libro de decimales');
  const posD=recD.map(r=>[r.lat,r.lon]);
  const d1=descargar(),pd1=decidir(d1.wb).filter(p=>p.codigo_regla==='lon_sin_hemisferio');
  igual(pd1.length,4,'propuestas lon_sin_hemisferio en «Por decidir»');
  ok(pd1.some(p=>/convertida de grados a decimales y con W/.test(p.propuesta)),'una propuesta debía decir «convertida de grados a decimales y con W»');
  ok(pd1.filter(p=>/tomada de verbatim/.test(p.propuesta)&&/ y con W\)$/.test(p.propuesta)).length===2,'dos propuestas debían decir «tomada de verbatim… y con W»');
  ok(pd1.every(p=>p.visioncore_la_aplica==='sí, al volver a cargar'),'todas las propuestas de longitud se aplican al volver a cargar');
  const wD=guardarYAbrir(d1.wb),iAD=aoa(wD,'Por decidir')[0].indexOf(COLAPL);
  decidir(wD).forEach(p=>{if(p.codigo_regla==='lon_sin_hemisferio')poner(wD,'Por decidir',p._fila-1,iAD,'sí');});
  cargar(guardarYAbrir(wD),d1.nombre);
  const d2=descargar(),PD2=aoa(d2.wb,'Plantilla'),h2=PD2[0],iLa=h2.indexOf('decimalLatitude'),iLo=h2.indexOf('decimalLongitude');
  const num=v=>typeof v==='number'?v:+String(v).replace(',','.');
  igual([0,1,2].map(i=>[num(PD2[2+i][iLa]),num(PD2[2+i][iLo])]),[[5.54,-73.36],[5.54,-73.36],[5.54,-73.36]],'decimales escritas en las tres filas que estaban vacías o en grados');
  igual(num(PD2[6][iLo]),-73.36,'la decimal positiva (fila 7) pasa a negativa con la propuesta de siempre');
  igual(num(PD2[6][iLa]),5.54,'la latitud numérica de la fila 7 no se toca');
  igual(num(PD2[5][iLo]),-73.36,'la decimal que ya era negativa (fila 6) sigue igual');
  const cD2=cambios(d2.wb);
  ok(!cD2.some(c=>verb(c.columna)),'las decisiones de longitud escribieron en una columna verbatim');
  ok(cD2.filter(c=>/^Aprobada/.test(c.regla)&&/convertida de grados|tomada de verbatim/.test(c.regla)).length===6,'«Cambios» debía decir de dónde sale cada decimal escrita (6 celdas)');
  const wbD0=aoa(wbD,'Plantilla');
  wbD0[0].forEach((h,j)=>{if(verb(h))for(let i=2;i<wbD0.length;i++)ok(txt(wbD0[i][j])===txt(PD2[i][h2.indexOf(h)]),`decimales llenas: ${h} fila ${i+1} cambió`);});
  // al recargar la v2 ya no queda ningún lon_sin_hemisferio, y los puntos no se movieron
  const rec2=cargar(guardarYAbrir(d2.wb),d2.nombre).recs;
  igual(rec2.map(r=>(r.iss||[]).some(x=>x.t==='lon_sin_hemisferio')),[false,false,false,false,false],'filas con lon_sin_hemisferio al recargar la v2');
  igual(rec2.map(r=>[r.lat,r.lon]),posD,'posiciones de los registros antes y después de aplicar');
}

console.log(`\nVisor: ${path.relative(process.cwd(),html)}`);
if(mal)console.log('FALLAS:\n'+fallos.join('\n'));
console.log(`${bien} comprobaciones bien, ${mal} fallan`);
process.exit(mal?1:0);
