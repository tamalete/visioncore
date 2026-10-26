// Prueba de presentación de la pestaña «Para publicar en el SiB» (hechos de columna, desde la 0.37): la lógica, no el HTML.
//   node pruebas/presentacion.js [ruta_al_html]
// Comprueba con el ejemplo y con libros sintéticos que sibColumnas() agrupa lo que debe (un mismo hallazgo en el 90 % o más de la columna, con al menos 5 registros
// y una sola acción), que los conteos por fila (r.sib) no cambian y que lo agrupado más lo que sigue suelto cuadra con el total.
// Todo caso lleva si:'expresión': en una versión sin sibColumnas (la 0.36.0) se omite y se cuenta aparte.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {cargarVisor,RAIZ}=require('./cargar.js');
const S=require('./sintetico.js');
const html=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(RAIZ,'index.html'));
const ctx=cargarVisor(html);
const X=S.enlazar(ctx);
const ETQ=S.etiquetasDe(ctx);
const ev=e=>vm.runInContext(e,ctx,{timeout:5000});
const J=JSON.stringify;
const TIENE='typeof sibColumnas==="function"&&typeof sibResumen==="function"&&typeof enColumnaSib==="function"';

const casos=[];
const caso=(desc,fn,si)=>casos.push({desc,fn,si:si||TIENE});

// resumen de lo que importa de sibColumnas(): [tipo|columna, n, valor] ordenado, y los registros listos
const resumen=()=>ev(`(()=>{const c=sibColumnas();return {lista:c.lista.map(g=>[g.t==='sib_obligatorio'?g.t+':'+g.col:g.t,g.n,g.valor||'']).sort((a,b)=>a[0]<b[0]?-1:1),listos:c.listos,total:c.total}})()`);
// suma de n de sibResumen() con y sin lo agrupado, y número de hallazgos que hay en r.sib de verdad
const sumas=()=>ev(`(()=>{const c=sibColumnas(),sum=l=>l.reduce((s,g)=>s+g.n,0);
  return {todo:sum(sibResumen()),sueltos:sum(sibResumen(c.claves)),agrupados:sum(c.lista),enRegistros:DATA.reduce((s,r)=>s+(r.gbif?0:(r.sib||[]).length),0)}})()`);
const cargar=filas=>S.cargarLibro(ctx,X,S.libro(ctx.XLSX,filas,ETQ),'prueba.xlsx');
const filas=(n,f)=>Array.from({length:n},(_,i)=>S.fila(i,f?f(i):{}));
const igual=(a,b,que)=>J(a)===J(b)?'':`${que}: esperado ${J(b)}, obtenido ${J(a)}`;

// ---- con el ejemplo de ejemplo/ ----
function cargarEjemplo(){
  const dir=path.join(RAIZ,'ejemplo'),srcs=[];
  fs.readdirSync(dir).filter(f=>/\.(xlsx|csv)$/i.test(f)&&!f.startsWith('~$')).sort().forEach(f=>{
    const wb=ctx.XLSX.read(fs.readFileSync(path.join(dir,f)),{type:'buffer'});
    const r=X.parseWorkbook(wb);srcs.push({name:f,recs:r.recs,hoja:r.hoja});
  });
  X.setSources(srcs);X.unirFuentes();
  return srcs;
}
caso('ejemplo: los 8 hechos de columna, cada uno en los 14 registros',()=>{
  cargarEjemplo();
  const esp=[['sib_countrycode',14,'vacío con country = Colombia'],['sib_institutioncode_formato',14,'EJEMPLO']].concat(['collectionID','disposition','institutionID','occurrenceID','taxonRank','type'].map(c=>['sib_obligatorio:'+c,14,'']));
  return igual(resumen().lista,esp.sort((a,b)=>a[0]<b[0]?-1:1),'hechos de columna');
});
caso('ejemplo: quedarían listos 14 de 14 al arreglar esas columnas',()=>{cargarEjemplo();const r=resumen();return igual([r.listos,r.total],[14,14],'listos y total');});
caso('ejemplo: vocabulario_sexo (11 de 14) y vocabulario_etapa (1) no son hechos de columna: siguen sueltos',()=>{
  cargarEjemplo();const t=resumen().lista.map(x=>x[0]);
  return ['vocabulario_sexo','vocabulario_etapa'].filter(k=>t.includes(k)).map(k=>k+' no debía agruparse').join('; ');
});
caso('ejemplo: los conteos por fila (r.sib) siguen siendo los de esperado.json',()=>{
  cargarEjemplo();
  const esp=JSON.parse(fs.readFileSync(path.join(__dirname,'esperado.json'),'utf8'))['ejemplo_visioncore.xlsx'].sib;
  const obt=ev(`(()=>{const o={};DATA.forEach(r=>(r.sib||[]).forEach(x=>{const k=x.t==='sib_obligatorio'?'sib_obligatorio:'+x.col:x.t;o[k]=(o[k]||0)+1;}));return o})()`);
  const orden=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a<b?-1:1));
  return igual(orden(obt),orden(esp),'r.sib');
});
caso('ejemplo: lo agrupado más lo que sigue suelto es el total de hallazgos',()=>{
  cargarEjemplo();const s=sumas();
  return igual([s.agrupados+s.sueltos,s.todo,s.todo],[s.enRegistros,s.enRegistros,s.enRegistros],'agrupados + sueltos = todo = hallazgos en r.sib')||(s.agrupados>0&&s.sueltos>0?'':'debía haber hallazgos agrupados y sueltos');
});

// ---- umbrales, con libros sintéticos ----
caso('10 filas, institutionCode «UEJ» sin nombre en 9: es un hecho de columna (90 %)',()=>{
  cargar(filas(10,i=>({institutionCode:i<9?'UEJ':'Universidad de Ejemplo (UEJ)'})));
  const g=resumen().lista.find(x=>x[0]==='sib_institutioncode_formato');
  return g?igual([g[1],g[2]],[9,'UEJ'],'n y valor'):'no se agrupó con 9 de 10';
});
caso('10 filas, 8 con «UEJ» (80 %): no se agrupa',()=>{
  cargar(filas(10,i=>({institutionCode:i<8?'UEJ':'Universidad de Ejemplo (UEJ)'})));
  return resumen().lista.some(x=>x[0]==='sib_institutioncode_formato')?'se agrupó con 8 de 10':'';
});
caso('4 filas, todas con «UEJ»: menos de 5 registros, no se agrupa',()=>{
  cargar(filas(4,()=>({institutionCode:'UEJ'})));
  return resumen().lista.some(x=>x[0]==='sib_institutioncode_formato')?'se agrupó con 4 registros':'';
});
caso('5 filas, todas con «UEJ»: con 5 registros ya se agrupa',()=>{
  cargar(filas(5,()=>({institutionCode:'UEJ'})));
  return resumen().lista.some(x=>x[0]==='sib_institutioncode_formato')?'':'no se agrupó con 5 de 5';
});
caso('columna vacía en 5 filas (occurrenceID): se agrupa; con 4 no',()=>{
  cargar(filas(5));const a=resumen().lista.some(x=>x[0]==='sib_obligatorio:occurrenceID');
  cargar(filas(4));const b=resumen().lista.some(x=>x[0]==='sib_obligatorio:occurrenceID');
  return a&&!b?'':`con 5: ${a?'agrupa':'no agrupa'}, con 4: ${b?'agrupa':'no agrupa'} (debía ser agrupa / no agrupa)`;
});
caso('mitad «UEJ» y mitad «OTRA» (50 / 50): no hay un valor que arreglar de una vez, no se agrupa',()=>{
  cargar(filas(10,i=>({institutionCode:i%2?'UEJ':'OTRA'})));
  return resumen().lista.some(x=>x[0]==='sib_institutioncode_formato')?'se agrupó con dos valores a partes iguales':'';
});
caso('20 filas, 19 «UEJ» y 1 «OTRA»: se agrupan las 19 y la otra sigue suelta, y todo cuadra',()=>{
  cargar(filas(20,i=>({institutionCode:i<19?'UEJ':'OTRA'})));
  const g=resumen().lista.find(x=>x[0]==='sib_institutioncode_formato');
  if(!g)return 'no se agrupó';
  const m=igual([g[1],g[2]],[19,'UEJ'],'n y valor');if(m)return m;
  const s=sumas();
  const suelto=ev(`sibResumen(sibColumnas().claves).filter(g=>g.t==='sib_institutioncode_formato').reduce((s,g)=>s+g.n,0)`);
  return igual(suelto,1,'sueltos de institutionCode')||igual(s.agrupados+s.sueltos,s.enRegistros,'agrupados + sueltos');
});
caso('listos: un registro con otro bloqueo que no es de columna (basisOfRecord raro) no cuenta como listo',()=>{
  cargar(filas(10,i=>i===0?{basisOfRecord:'Espécimen raro'}:{}));
  const r=resumen();
  return igual([r.listos,r.total],[9,10],'listos y total');
});
caso('los registros de GBIF no cuentan para el 90 % (total solo de archivos propios)',()=>{
  cargar(filas(6));
  return igual(resumen().total,6,'total');
});
caso('los conteos por fila no cambian por agrupar: r.sib tiene lo mismo con y sin sibColumnas()',()=>{
  cargar(filas(10,i=>({institutionCode:i<9?'UEJ':'Universidad de Ejemplo (UEJ)'})));
  const antes=ev('DATA.map(r=>JSON.stringify(r.sib))');
  ev('sibColumnas();sibResumen(sibColumnas().claves);sibResumen()');
  const despues=ev('DATA.map(r=>JSON.stringify(r.sib))');
  return igual(despues,antes,'r.sib');
});

let ok=0,mal=0,omit=0;
casos.forEach(k=>{
  let va=false;try{va=!!ev(k.si);}catch(e){}
  if(!va){omit++;return;}
  let m;try{m=k.fn();}catch(e){m='ERROR '+e.message;}
  if(!m){ok++;return;}
  mal++;console.log('FALLA '+k.desc+'\n      '+m);
});
console.log(`\nVisor: ${path.relative(process.cwd(),html)}\n${ok} bien, ${mal} fallan, ${omit} omitidos por función ausente (de ${casos.length})`);
process.exit(mal?1:0);
