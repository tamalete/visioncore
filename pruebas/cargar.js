// Carga el script principal del visor en un vm de Node con un DOM falso. Sin navegador, sin dependencias.
const fs=require('fs'),vm=require('vm'),path=require('path');
const RAIZ=path.resolve(__dirname,'..');

function cargarVisor(rutaHtml){
  const html=fs.readFileSync(rutaHtml,'utf8');
  // el script principal es el primer <script> sin src que viene después de SheetJS (o de todos los de src)
  let ini=html.indexOf('xlsx.full.min.js');
  if(ini<0)ini=0;
  const i0=html.indexOf('<script>',ini)+8, i1=html.lastIndexOf('</script>');
  if(i0<8||i1<i0)throw new Error('No se encontró el <script> principal en '+rutaHtml);
  let code=html.slice(i0,i1);
  const P=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='then'?undefined:P,apply:()=>P,construct:()=>P,set:()=>true});
  const ctx={console,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,Map,Set,URL,structuredClone};
  ctx.window=ctx;ctx.document=P;ctx.L=P;ctx.navigator={userAgent:''};
  ctx.matchMedia=()=>({matches:false,addEventListener(){}});ctx.addEventListener=()=>{};
  ctx.requestAnimationFrame=()=>0;ctx.localStorage=undefined;ctx.location={search:'',hash:''};
  ctx.history=P;ctx.fetch=()=>Promise.reject(new Error('sin red en las pruebas'));
  ctx.performance={now:()=>Date.now()};ctx.getComputedStyle=()=>P;
  vm.createContext(ctx);
  // siempre el SheetJS local, aunque el HTML apunte a un CDN
  vm.runInContext(fs.readFileSync(path.join(RAIZ,'vendor/sheetjs/xlsx.full.min.js'),'utf8'),ctx);
  code=code.replace(/\blet (DATA|sources)\b/g,'var $1');
  // si el script revienta al arrancar, el visor no sirve en el navegador: la prueba falla aquí, no sigue a medias
  // (lineOffset: los números de línea del error son los del HTML)
  try{vm.runInContext(code,ctx,{filename:rutaHtml,lineOffset:html.slice(0,i0).split('\n').length-1});}
  catch(e){console.error('FALLA: el script del visor no arranca: '+e.name+': '+e.message+' ('+String(e.stack||'').split('\n')[0]+')');process.exit(1);}
  return ctx;
}
// evalúa una expresión dentro del contexto del visor
const ev=(ctx,expr)=>vm.runInContext(expr,ctx);
module.exports={cargarVisor,ev,RAIZ};
