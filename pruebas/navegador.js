// Prueba en un navegador real (Chrome, Chromium o Edge), sin instalar nada: lo maneja por el protocolo de DevTools
// con el WebSocket que trae Node 22 o superior.
//   node pruebas/navegador.js [visor.html]       abre el visor SIN RED, carga el ejemplo y recorre la página
//                                                (temas, revisión, ficha, celular, informe): ningún error de JS
//   node pruebas/navegador.js A.html B.html      además compara el estilo calculado de cada elemento entre A y B,
//                                                estado por estado (sirve para reordenar el CSS sin cambiar nada)
// Si no encuentra el navegador, se omite y sale con 0. Para elegir otro: CHROME=/ruta/al/navegador.
// Las librerías salen siempre de vendor/ (si el HTML apunta a un CDN, se cambia en una copia temporal).
const fs=require('fs'),path=require('path'),os=require('os'),{spawn,spawnSync}=require('child_process'),{pathToFileURL}=require('url');
const RAIZ=path.resolve(__dirname,'..');
const htmls=process.argv.slice(2).filter(a=>!a.startsWith('--')).map(a=>path.resolve(a));
if(!htmls.length)htmls.push(path.join(RAIZ,'index.html'));
const comparar=htmls.length===2;
const TAMANOS=[{nombre:'escritorio',ancho:1400,alto:900},{nombre:'celular',ancho:390,alto:844}];

function buscarNavegador(){
  if(process.env.CHROME)return process.env.CHROME;
  const c=process.platform==='win32'?[
    process.env.PROGRAMFILES+'/Google/Chrome/Application/chrome.exe',
    process.env['PROGRAMFILES(X86)']+'/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe',
    process.env['PROGRAMFILES(X86)']+'/Microsoft/Edge/Application/msedge.exe',
    process.env.PROGRAMFILES+'/Microsoft/Edge/Application/msedge.exe']
   :process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium']:[];
  for(const p of c)if(p&&fs.existsSync(p))return p;
  for(const n of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  return null;
}

// copia temporal: <base> para que las rutas relativas sigan funcionando y CDN -> vendor/ de este repositorio
function prepararCopia(html,tmp,k){
  const vendor=pathToFileURL(path.join(RAIZ,'vendor')).href+'/';
  let s=fs.readFileSync(html,'utf8');
  s=s.replace(/<head>/,'<head>\n<base href="'+pathToFileURL(path.dirname(html)).href+'/">')
     .replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n/,'')
     .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">/,'<link rel="stylesheet" href="'+vendor+'fonts/fonts.css">')
     .replace(/https:\/\/unpkg\.com\/leaflet@[^/]+\/dist\//g,vendor+'leaflet/')
     .replace(/https:\/\/unpkg\.com\/leaflet\.markercluster@[^/]+\/dist\//g,vendor+'leaflet.markercluster/')
     .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/[^/]+\//g,vendor+'sheetjs/')
     .replace(/((?:src|href)=")vendor\//g,'$1'+vendor); // también si el HTML es una copia fuera del repositorio (el hook prueba una copia temporal)
  const f=path.join(tmp,'visor'+k+'.html');fs.writeFileSync(f,s);return pathToFileURL(f).href;
}

// cliente mínimo del protocolo de DevTools
function conectar(url){
  return new Promise((res,rej)=>{
    const ws=new WebSocket(url);let id=0;const pend=new Map(),oyentes=[];
    ws.onmessage=ev=>{const m=JSON.parse(ev.data);
      if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(m.error.message)):p.res(m.result);}
      else if(m.method)oyentes.forEach(f=>f(m));};
    ws.onerror=()=>rej(new Error('no se pudo conectar con el navegador'));
    ws.onopen=()=>res({
      enviar:(method,params)=>new Promise((r,j)=>{const i=++id;pend.set(i,{res:r,rej:j});ws.send(JSON.stringify({id:i,method,params:params||{}}));}),
      oir:f=>oyentes.push(f),cerrar:()=>ws.close()});
  });
}

// lo que corre dentro de la página
const EN_PAGINA=`window.__vc={
  esperar:ms=>new Promise(r=>setTimeout(r,ms)),
  cuadros:()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),
  ruta(e){const p=[];for(;e&&e.nodeType===1;e=e.parentElement){let s=e.tagName.toLowerCase();
    if(e.id){p.unshift(s+'#'+e.id);break;}
    s+=':'+(e.parentElement?[...e.parentElement.children].indexOf(e):0);p.unshift(s);}return p.join('>');},
  hash(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);},
  // estilo calculado de cada elemento (y de ::before/::after si existen); guarda el texto completo y devuelve hashes
  estilos(){const out={};this.texto={};
    for(const e of document.querySelectorAll('*')){
      if(e.closest('.leaflet-tile-pane'))continue;const k=this.ruta(e);
      // dentro del mapa, transform es dónde quedó el mapa al centrarse (puede variar un píxel), no CSS
      const enMapa=!!e.closest('.leaflet-map-pane');
      for(const ps of [null,'::before','::after']){const cs=getComputedStyle(e,ps);if(ps&&(cs.content==='none'||cs.content==='normal'))continue;
        // ordenadas: Chrome lista las variables (--algo) en un orden que cambia de una pestaña a otra
        const l=[];for(let i=0;i<cs.length;i++){const n=cs[i];if(enMapa&&(n==='transform'||n==='translate'))continue;l.push(n+':'+cs.getPropertyValue(n));}
        const t=l.sort().join('\\n');
        this.texto[k+(ps||'')]=t;out[k+(ps||'')]=this.hash(t);}}
    return out;}
};`;
// sin animaciones ni transiciones a medias: el estilo no depende del instante en que se mire
const QUIETO='*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}';

async function abrirPagina(puerto,url,tam){
  const t=await (await fetch('http://127.0.0.1:'+puerto+'/json/new?about:blank',{method:'PUT'})).json();
  const c=await conectar(t.webSocketDebuggerUrl);
  c.errores=[];
  c.oir(m=>{
    if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;c.errores.push((d.exception&&d.exception.description||d.text).split('\n')[0]+' (línea '+(d.lineNumber+1)+')');}
    else if(m.method==='Runtime.consoleAPICalled'&&(m.params.type==='error'||m.params.type==='assert'))c.errores.push('console.'+m.params.type+': '+m.params.args.map(a=>a.value!==undefined?a.value:a.description).join(' '));
    else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'&&m.params.entry.source!=='network')c.errores.push(m.params.entry.text);
  });
  await c.enviar('Runtime.enable');await c.enviar('Log.enable');await c.enviar('Page.enable');await c.enviar('Network.enable');
  await c.enviar('Network.setBlockedURLs',{urls:['http://*','https://*']}); // sin red: el visor tiene que funcionar sin conexión
  await c.enviar('Emulation.setDeviceMetricsOverride',{width:tam.ancho,height:tam.alto,deviceScaleFactor:1,mobile:tam.ancho<700});
  await c.enviar('Emulation.setTimezoneOverride',{timezoneId:'America/Bogota'});
  const cargada=new Promise(r=>c.oir(m=>{if(m.method==='Page.loadEventFired')r();}));
  await c.enviar('Page.navigate',{url});
  await Promise.race([cargada,new Promise((_,j)=>setTimeout(()=>j(new Error('la página no terminó de cargar en 30 s')),30000))]);
  c.eval=async expr=>{
    // al frente: en una pestaña de atrás Chrome no da requestAnimationFrame y el visor (y la prueba) se quedarían esperando
    await c.enviar('Page.bringToFront');
    const r=await Promise.race([c.enviar('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}),
      new Promise((_,j)=>setTimeout(()=>j(new Error('un paso tardó más de 30 s (¿se quedó esperando?)')),30000))]);
    if(r.exceptionDetails)throw new Error((r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text).split('\n')[0]);
    return r.result.value;
  };
  await c.eval(EN_PAGINA+`;(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(QUIETO)};document.head.appendChild(s);})()`);
  await c.eval('__vc.cuadros()');
  return c;
}

// el recorrido: cada paso deja la página en un estado; si compara, se miran los estilos en cada tema de cada estado
const TEMAS=['oscuro','claro','alto-contraste','daltonismo'];
const PASOS=[
  {nombre:'arranca',hacer:`(()=>{if(typeof L==='undefined')throw new Error('no cargó Leaflet');if(typeof XLSX==='undefined')throw new Error('no cargó SheetJS');
     if(typeof parseWorkbook!=='function')throw new Error('no está parseWorkbook');})()`},
  {nombre:'vacío',estilos:true},
  {nombre:'ejemplo',hacer:`(async()=>{cargarEjemplo();await __vc.esperar(300);await __vc.cuadros();
     if(!DATA.length)throw new Error('el ejemplo no cargó registros');
     if(!document.getElementById('revision').classList.contains('show'))throw new Error('no se abrió la revisión');})()`,estilos:true},
  {nombre:'revisión',hacer:`(async()=>{for(const t of ['falta','sib','err']){abrirRevision(t);await __vc.cuadros();
     if(document.getElementById('revision').textContent.trim().length<50)throw new Error('pestaña '+t+' vacía');}})()`,estilos:true},
  {nombre:'ficha',hacer:`(async()=>{cerrarRevision();await __vc.cuadros();openV(0,false);await __vc.cuadros();})()`,estilos:true},
  {nombre:'panel del celular',hacer:`(async()=>{closeV();toggleHoja();await __vc.cuadros();toggleHoja();await __vc.cuadros();})()`},
  {nombre:'informe',hacer:`(async()=>{window.print=()=>{};imprimirInforme();await __vc.esperar(150);
     if(document.getElementById('informeImp').textContent.trim().length<50)throw new Error('el informe salió vacío');})()`,estilos:true,impresion:true},
];

async function principal(){
  const nav=buscarNavegador();
  if(!nav){console.log('Omitida: no encontré Chrome, Chromium ni Edge (CHROME=/ruta para indicarlo).');return 0;}
  for(const h of htmls)if(!fs.existsSync(h)){console.error('No existe '+h);return 1;}
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vc-navegador-'));
  const urls=htmls.map((h,k)=>prepararCopia(h,tmp,k));
  const argsNav=['--headless=new','--remote-debugging-port=0','--user-data-dir='+path.join(tmp,'perfil'),'--no-first-run',
    '--no-default-browser-check','--disable-extensions','--disable-gpu','--hide-scrollbars','--mute-audio','about:blank'];
  if(process.platform==='linux'&&process.env.CI)argsNav.unshift('--no-sandbox');
  const proc=spawn(nav,argsNav,{stdio:['ignore','ignore','pipe']});
  process.on('exit',()=>{try{proc.kill();}catch(e){}}); // pase lo que pase, el navegador de la prueba no queda abierto
  let fallas=0;
  try{
    const puerto=await new Promise((res,rej)=>{let buf='';const to=setTimeout(()=>rej(new Error('el navegador no abrió el puerto de DevTools en 20 s')),20000);
      proc.stderr.on('data',d=>{buf+=d;const m=/DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(buf);if(m){clearTimeout(to);res(m[1]);}});
      proc.on('exit',c=>rej(new Error('el navegador se cerró (código '+c+')')));});
    console.log('Navegador: '+path.basename(nav)+(comparar?'  ·  comparando estilos de '+path.basename(htmls[0])+' y '+path.basename(htmls[1]):'  ·  '+path.basename(htmls[0])));
    for(const tam of TAMANOS){
      const pags=[];for(const u of urls)pags.push(await abrirPagina(puerto,u,tam));
      let difs=0,miradas=0;
      for(const paso of PASOS){
        let error=null;
        for(const p of pags){try{if(paso.hacer)await p.eval(paso.hacer);}catch(e){error=e.message;}}
        if(paso.impresion)for(const p of pags)await p.enviar('Emulation.setEmulatedMedia',{media:'print'});
        if(comparar&&paso.estilos&&!error){
          for(const tema of TEMAS){ // en cada tema se espera un poco: el mapa pinta los marcadores después
            const h=[];for(const p of pags){await p.eval(`(async()=>{aplicarTema(${JSON.stringify(tema)},false);await __vc.esperar(250);await __vc.cuadros();})()`);h.push(await p.eval('__vc.estilos()'));}
            const claves=new Set([...Object.keys(h[0]),...Object.keys(h[1])]);
            for(const k of claves){
              // el mapa dibuja sus marcadores a su ritmo: dentro de él solo se comparan los que existen en las dos páginas
              if(k.startsWith('div#map>')&&(!(k in h[0])||!(k in h[1])))continue;
              miradas++;
              if(h[0][k]===h[1][k])continue;
              difs++;
              if(difs>12)continue;
              if(!(k in h[0])||!(k in h[1])){console.log('    ≠ '+tam.nombre+' · '+paso.nombre+' · '+tema+': '+k+' solo está en '+(k in h[0]?'A':'B'));continue;}
              const t=[];for(const p of pags)t.push(await p.eval('__vc.texto['+JSON.stringify(k)+']'));
              const a=new Map(t[0].split('\n').map(l=>[l.slice(0,l.indexOf(':')),l])),b=t[1].split('\n');
              const props=b.filter(l=>l&&a.get(l.slice(0,l.indexOf(':')))!==l).slice(0,4)
                .map(l=>{const n=l.slice(0,l.indexOf(':'));return n+': '+((a.get(n)||'').slice(n.length+1)||'(nada)')+' → '+l.slice(n.length+1);});
              console.log('    ≠ '+tam.nombre+' · '+paso.nombre+' · '+tema+': '+k+'\n        '+props.join('\n        '));
            }
          }
          for(const p of pags)await p.eval(`aplicarTema('oscuro',false)`);
        }
        if(paso.impresion)for(const p of pags)await p.enviar('Emulation.setEmulatedMedia',{media:''});
        const errs=pags.flatMap((p,k)=>p.errores.splice(0).map(e=>(comparar?'['+'AB'[k]+'] ':'')+e));
        if(error||errs.length){fallas++;console.log('✗ '+tam.nombre+' · '+paso.nombre+(error?': '+error:'')+errs.map(e=>'\n    '+e).join(''));}
      }
      if(comparar){console.log((difs?'✗ ':'✓ ')+tam.nombre+': '+(difs?difs+' estilos distintos de '+miradas:'los '+miradas+' estilos calculados son iguales'));if(difs)fallas++;}
      else console.log((fallas?'· ':'✓ ')+tam.nombre+': '+PASOS.length+' pasos');
      for(const p of pags)p.cerrar();
    }
  }catch(e){console.error('FALLA: '+e.message);fallas++;}
  finally{proc.kill();setTimeout(()=>{try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}},500);}
  console.log(fallas?'\n'+fallas+' falla(s) en el navegador':'\nTodo bien en el navegador');
  return fallas?1:0;
}
principal().then(c=>setTimeout(()=>process.exit(c),700));
