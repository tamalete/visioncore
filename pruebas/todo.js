// Todas las pruebas de una vez: sintaxis de cada <script> del HTML, las cinco pruebas sin navegador y la de navegador.
//   node pruebas/todo.js [ruta_al_html]
// Sale con 1 si algo falla. Es lo que corren el hook pre-commit (.githooks/) y la acción de GitHub.
const fs=require('fs'),path=require('path'),vm=require('vm'),{spawnSync}=require('child_process');
const RAIZ=path.resolve(__dirname,'..');
const html=path.resolve(process.argv[2]||path.join(RAIZ,'index.html'));
if(!fs.existsSync(html)){console.error('No existe '+html);process.exit(1);}
const PRUEBAS=['correr','unidad','casos','presentacion','idavuelta','gbif','navegador']; // navegador: se omite sola si no hay Chrome, Chromium ni Edge
let fallas=0;

// 1. sintaxis: cada <script> sin src se compila sin correrlo; el error dice la línea del HTML
const texto=fs.readFileSync(html,'utf8');
const re=/<script>([\s\S]*?)<\/script>/g;let m,n=0;
while((m=re.exec(texto))){
  n++;
  const linea=texto.slice(0,m.index+8).split('\n').length-1;
  try{new vm.Script(m[1],{filename:html,lineOffset:linea});}
  catch(e){fallas++;console.error('FALLA sintaxis en el <script> '+n+': '+e.message+' ('+String(e.stack).split('\n')[0]+')');}
}
if(!n){fallas++;console.error('FALLA: el HTML no tiene ningún <script> propio');}
console.log((fallas?'✗':'✓')+' sintaxis ('+n+' bloques <script>)');
if(fallas){console.error('\nNo se corren las pruebas: el visor ni siquiera compila.');process.exit(1);}

// 2. las pruebas, cada una en su propio proceso (así un estado global no se cuela de una a otra)
for(const p of PRUEBAS){
  const r=spawnSync(process.execPath,[path.join(__dirname,p+'.js'),html],{encoding:'utf8'});
  const salida=(r.stdout||'')+(r.stderr||'');
  const ok=r.status===0;
  if(!ok)fallas++;
  const lineas=salida.trim().split('\n').filter(l=>l.trim());
  const resumen=lineas.filter(l=>/bien|^OK |Omitida/.test(l)).pop()||lineas.pop()||'';
  console.log((ok?'✓ ':'✗ ')+p.padEnd(13)+resumen);
  if(!ok){const det=lineas.filter(l=>l!==resumen&&/FALLA|falla|Error|ERROR|✗/.test(l)).slice(0,15);if(det.length)console.log(det.map(l=>'    '+l).join('\n'));}
}
console.log(fallas?'\n'+fallas+' prueba(s) fallan en '+path.basename(html):'\nTodo bien en '+path.basename(html));
process.exit(fallas?1:0);
