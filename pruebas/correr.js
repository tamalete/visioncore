// Prueba de cifras: lee el ejemplo sintético con el visor y compara con esperado.json.
//   node pruebas/correr.js [ruta_al_html] [--actualizar]
const fs=require('fs'),path=require('path');
const {cargarVisor,ev,RAIZ}=require('./cargar.js');
const args=process.argv.slice(2);
const actualizar=args.includes('--actualizar');
const html=path.resolve(args.find(a=>!a.startsWith('--'))||path.join(RAIZ,'index.html'));
const ESPERADO=path.join(__dirname,'esperado.json');

const ctx=cargarVisor(html);
const X=ev(ctx,'({parseWorkbook,QC_TYPES,unirFuentes,setSources(v){sources=v},get DATA(){return DATA}})');
const dir=path.join(RAIZ,'ejemplo');
const archivos=fs.readdirSync(dir).filter(f=>/\.(xlsx|csv)$/i.test(f)&&!f.startsWith('~$')).sort();
if(!archivos.length){console.error('No hay archivos en '+dir);process.exit(1);}

const srcs=[];
for(const f of archivos){
  const wb=ctx.XLSX.read(fs.readFileSync(path.join(dir,f)),{type:'buffer',cellDates:false});
  const r=X.parseWorkbook(wb);
  srcs.push({name:f,recs:r.recs,hoja:r.hoja});
}
X.setSources(srcs);
try{X.unirFuentes();}catch(e){console.error('FALLA: unirFuentes falló:',e.message);process.exit(1);}

const sumar=(o,k)=>{o[k]=(o[k]||0)+1;};
const obtenido={};
for(const s of srcs){
  const c={iss:{},sib:{},alertas:{}};let conErr=0,coord=0;
  s.recs.forEach(r=>{
    if(r.lat!=null&&!r.dudosa)coord++;
    let e=false;
    (r.iss||[]).forEach(x=>{
      const t=X.QC_TYPES[x.t]||{s:'?'};
      sumar(t.s==='err'||t.s==='?'?c.iss:c.alertas,x.t);
      if(t.s==='err')e=true;
    });
    (r.sib||[]).forEach(x=>sumar(c.sib,x.t==='sib_obligatorio'?'sib_obligatorio:'+x.col:x.t));
    if(e)conErr++;
  });
  const ord=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a<b?-1:a>b?1:0));
  obtenido[s.name]={registros:s.recs.length,con_error:conErr,coord_confiable:coord,iss:ord(c.iss),sib:ord(c.sib),alertas:ord(c.alertas)};
}

if(actualizar){
  fs.writeFileSync(ESPERADO,JSON.stringify(obtenido,null,2)+'\n');
  console.log('esperado.json actualizado con '+path.relative(process.cwd(),html));
  console.log(JSON.stringify(obtenido,null,2));
  process.exit(0);
}
if(!fs.existsSync(ESPERADO)){console.error('Falta esperado.json: corre con --actualizar');process.exit(1);}
const esperado=JSON.parse(fs.readFileSync(ESPERADO,'utf8'));
const dif=[];
const comparar=(ruta,a,b)=>{
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
    new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>comparar(ruta+'.'+k,a[k],b[k]));
  }else if(a!==b)dif.push(`  ${ruta}: esperado ${a===undefined?'(no existía)':a}, obtenido ${b===undefined?'(ya no aparece)':b}`);
};
comparar('',esperado,obtenido);
console.log('Visor: '+path.relative(process.cwd(),html));
if(!dif.length){
  Object.entries(obtenido).forEach(([n,o])=>console.log(`OK ${n}: ${o.registros} registros, ${o.con_error} con error, ${o.coord_confiable} con coordenada confiable`));
  process.exit(0);
}
console.log('LAS CIFRAS CAMBIARON ('+dif.length+'):');
console.log(dif.map(d=>d.replace(/^  \./,'  ')).join('\n'));
console.log('\nSi el cambio es intencional, explícalo en CHANGELOG.md o en la nota de la versión y luego corre con --actualizar.');
process.exit(1);
