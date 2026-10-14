// Pruebas de funciones puras del visor, evaluadas en el mismo contexto que correr.js.
//   node pruebas/unidad.js [ruta_al_html]
// Cada caso: [descripción, expresión JS evaluada dentro del visor, valor esperado].
// pendiente:true = el resultado de hoy parece un fallo; se reporta pero no hace fallar la corrida.
// si:'expresión' = el caso solo corre si esa expresión, evaluada en el visor, da verdadero (funciones que solo existen desde cierta versión; se cuentan aparte como omitidos).
const path=require('path'),vm=require('vm');
const {cargarVisor,RAIZ}=require('./cargar.js');
const html=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(RAIZ,'index.html'));
const ctx=cargarVisor(html);

const fecha=v=>`(()=>{const r=parseFecha(${v});return {d:r.d,iss:r.iss.map(x=>x.t),sib:r.sib.map(x=>x.t)}})()`;
const coord=(v,eje)=>`(()=>{const r=leerCoord(${v},${JSON.stringify(eje||'lat')},false);return {v:r.v==null?null:Math.round(r.v*1e6)/1e6,iss:r.iss.map(x=>x.t)}})()`;
const J=JSON.stringify;

const casos=[
 // --- fechas ---
 ['fecha "2-Mar-71"',fecha(J('2-Mar-71')),{d:'1971-03-02',iss:[],sib:['fecha_no_iso']}],
 ['fecha "1899-12-31" (ISO válido, año >=1800)',fecha(J('1899-12-31')),{d:'1899-12-31',iss:[],sib:[]}],
 ['fecha "2024-03-15"',fecha(J('2024-03-15')),{d:'2024-03-15',iss:[],sib:[]}],
 ['fecha "15/03/2024"',fecha(J('15/03/2024')),{d:'2024-03-15',iss:[],sib:['fecha_no_iso']}],
 ['fecha "03/15/2024" (mes/día, solo un orden posible)',fecha(J('03/15/2024')),{d:'2024-03-15',iss:[],sib:['fecha_no_iso']}],
 ['fecha serie de Excel 44270',fecha('44270'),{d:'2021-03-15',iss:[],sib:['fecha_no_iso']}],
 ['fecha entero 2011 es un año, no una serie',fecha('2011'),{d:'2011',iss:[],sib:[]}],
 ['fecha "2024-3-5"',fecha(J('2024-3-5')),{d:'2024-03-05',iss:[],sib:['fecha_no_iso']}],
 ['fecha "31/02/2024" imposible',fecha(J('31/02/2024')),{d:'31/02/2024',iss:['fecha_improbable'],sib:[]}],
 ['fecha vacía',fecha(J('')),{d:'',iss:['sin_fecha'],sib:[]}],
 // --- coordenadas ---
 ['coord 5°26\'32.7"N',coord(J('5°26\'32.7"N')),{v:5.442417,iss:[]}],
 ['coord "72 42 41.3 W" (espacios, hemisferio W)',coord(J('72 42 41.3 W')),{v:-72.711472,iss:[]}],
 ['coord "72°42\'41.3\\"W"',coord(J('72°42\'41.3"W')),{v:-72.711472,iss:[]}],
 ['coord segundos >= 60',coord(J('5°30\'75"N')),{v:null,iss:['segundos_invalidos']}],
 ['coord minutos >= 60',coord(J('5°65\'10"N')),{v:null,iss:['minutos_invalidos']}],
 ['coord latitud sin signo "4,6097" (coma decimal)',coord(J('4,6097')),{v:4.6097,iss:[]}],
 ['coord negativa "-72.5"',coord(J('-72.5')),{v:-72.5,iss:[]}],
 ['coord sin punto decimal 5123456 (número)',coord('5123456'),{v:5.123456,iss:['coord_reconstruida']}],
 ['coord sin punto decimal "5123456" (texto)',coord(J('5123456')),{v:5.123456,iss:['coord_reconstruida']}],
 ['coord pegada DDMMSS.s "060445.4"',coord(J('060445.4')),{v:6.079278,iss:['coord_reconstruida']}],
 ['coord sin el número de grados "°31\'48.77\\" N"',coord(J('°31\'48.77" N')),{v:null,iss:['coord_grados_faltantes']}],
 ['coord texto "abc"',coord(J('abc')),{v:null,iss:['coord_ilegible']}],
 ['coord 200 fuera de rango',coord('200'),{v:null,iss:['coord_ilegible']}],
 // --- horas ---
 ['hora "21:30"',`leerHora("21:30")`,{hm:'21:30',iso:true}],
 ['hora "9.30"',`leerHora("9.30")`,{hm:'09:30',iso:false}],
 ['hora "9:30 pm"',`leerHora("9:30 pm")`,{hm:'21:30',iso:false}],
 ['hora "21h30"',`leerHora("21h30")`,{hm:'21:30',iso:false}],
 ['hora "12:00:00"',`leerHora("12:00:00")`,{hm:'12:00',iso:true}],
 ['hora "25:00" inválida',`leerHora("25:00")`,null],
 ['hora "noche" no es hora',`leerHora("noche")`,null],
 ['hora "1899-12-31" (la fecha cero de Excel la atiende parseWorkbook como hora_perdida)',`leerHora("1899-12-31")`,null],
 ['hora fracción de día 0.5 -> 12:00 (Excel guarda la hora como fracción de día)',`leerHora(0.5)`,{hm:'12:00',iso:true},{si:'typeof puntoEnPoligono==="function"'}],
 // --- catClave ---
 ['catClave ignora ceros de relleno',`catClave("EJEM-Am-0042")===catClave("EJEM-Am-42")`,true],
 ['catClave "EJEM-Am-0042"',`catClave("EJEM-Am-0042")`,'ejemam42'],
 ['catClave "MUS-AM 7"',`catClave("MUS-AM 7")`,'musam7'],
 ['catClave sin número "abc"',`catClave("abc")`,'abc'],
 ['catClave vacío',`catClave("")`,''],
 // --- amenazadas (la generalización en sí depende del DOM y de tablaDwC; aquí solo la marca) ---
 ['amenazadaDe devuelve la categoría UICN',`amenazadaDe({nom:[{t:'nom_amenazada',v:'EN'}]})`,'EN'],
 ['amenazadaDe sin marca',`amenazadaDe({nom:[]})`,''],
 // --- v33: municipio contra coordenada (DANE MGN 2025), lista nacional de amenazadas (Res. 0126 de 2024), contorno de Colombia, plantilla SiB 4.1 ---
 ...(()=>{
  const SI=f=>({si:'typeof '+f+'==="function"'});
  const S41={si:'typeof revisarSiB==="function"&&!!SIB_VOCAB.vitality'};
  const T41={si:'typeof TERMINOS==="object"&&TERMINOS.includes("vitality")'};
  const muni=(d,m)=>`(x=>x&&x.n)(municipioDe(${J(d)},${J(m)}))`;
  const avi=r=>`(()=>{const est={evaluados:0,emparejados:0,sinEmparejar:0,avisos:0};const a=avisoMunicipio(${J(r)},est);return {t:a?a.t:null,evaluados:est.evaluados,emparejados:est.emparejados}})()`;
  const amen=n=>`(a=>a?{cat:a.cat,lista:a.lista,via:a.via}:null)(amenazadaNacional(${J(n)},""))`;
  const vit=v=>`revisarSiB({},t=>({vitality:${J(v)}}[t]||''),'otros').filter(x=>x.t==='sib_vocabulario').map(x=>[x.col,x.sug])`;
  const tunja={lat:5.535,lon:-73.367,cok:true,mun:'Tunja',dept:'Boyacá',pais:'Colombia'};
  return [
   ['municipio "Villa de Leyva" en Boyacá',muni('Boyacá','Villa de Leyva'),'VILLA DE LEYVA',SI('municipioDe')],
   ['municipio "Villa de Leiva" (alias)',muni('Boyacá','Villa de Leiva'),'VILLA DE LEYVA',SI('municipioDe')],
   ['municipio "VILLA  DE LEYVA" (mayúsculas y espacios), departamento sin tilde',muni('boyaca','VILLA  DE LEYVA'),'VILLA DE LEYVA',SI('municipioDe')],
   ['municipio "Cúcuta" -> San José de Cúcuta (alias)',muni('Norte de Santander','Cúcuta'),'SAN JOSÉ DE CÚCUTA',SI('municipioDe')],
   ['municipio "Bogotá" en Cundinamarca -> Bogotá D.C.',muni('Cundinamarca','Bogotá'),'BOGOTÁ D.C.',SI('municipioDe')],
   ['municipio "Municipio de Tunja"',muni('Boyacá','Municipio de Tunja'),'TUNJA',SI('municipioDe')],
   ['municipio "Tunja (Boyacá)"',muni('Boyacá','Tunja (Boyacá)'),'TUNJA',SI('municipioDe')],
   ['municipio de otro departamento no empareja',muni('Antioquia','Tunja'),null,SI('municipioDe')],
   ['municipio con departamento sin reconocer no empareja',muni('Narnia','Tunja'),null,SI('municipioDe')],
   ['municipio vacío no empareja',muni('Boyacá',''),null,SI('municipioDe')],
   ['aviso: punto en el centro de Tunja, nada',avi(tunja),{t:null,evaluados:1,emparejados:1},SI('avisoMunicipio')],
   ['aviso: punto a ~270 km de Tunja',avi(Object.assign({},tunja,{lat:7.5,lon:-72})),{t:'al_fuera_municipio',evaluados:1,emparejados:1},SI('avisoMunicipio')],
   // v34: contorno de cada municipio en lugar de la distancia al centro
   ['aviso: a ~4 km del límite de Tunja son los alrededores (informativo)',avi(Object.assign({},tunja,{lon:-73.27})),{t:'al_municipio_vecino',evaluados:1,emparejados:1},SI('municipioEnPunto')],
   ['aviso: a ~44 km del límite de Barrancabermeja, y dice dónde cae',`(a=>a&&[a.t,a.sug])(avisoMunicipio(${J({lat:7.06,lon:-73.15,cok:true,mun:'Barrancabermeja',dept:'Santander',pais:'Colombia'})},{evaluados:0,emparejados:0,sinEmparejar:0,avisos:0}))`,['al_fuera_municipio','county: GIRÓN'],SI('municipioEnPunto')],
   ['aviso: un punto fuera de Colombia (ya es error) no se juzga',avi(Object.assign({},tunja,{lat:7.5,lon:-72,iss:[{t:'coord_fuera_colombia'}]})),{t:null,evaluados:0,emparejados:0},SI('municipioEnPunto')],
   ['municipioEnPunto: el centro de Tunja cae en Tunja',`(e=>e&&e.m.n)(municipioEnPunto(5.535,-73.367))`,'TUNJA',SI('municipioEnPunto')],
   ['municipioEnPunto: San Andrés (isla, fuera del contorno continental)',`(e=>e&&e.m.n)(municipioEnPunto(12.55,-81.72))`,'SAN ANDRÉS',SI('municipioEnPunto')],
   ['municipioEnPunto: en el mar, ninguno',`municipioEnPunto(12.5,-79)`,null,SI('municipioEnPunto')],
   ['aviso: sin municipio no se juzga ni se cuenta',avi(Object.assign({},tunja,{mun:''})),{t:null,evaluados:0,emparejados:0},SI('avisoMunicipio')],
   ['aviso: municipio que no aparece se cuenta pero no avisa',avi(Object.assign({},tunja,{mun:'Vereda Inventada'})),{t:null,evaluados:1,emparejados:0},SI('avisoMunicipio')],
   ['aviso: registro de otro país no se juzga',avi(Object.assign({},tunja,{pais:'Perú'})),{t:null,evaluados:0,emparejados:0},SI('avisoMunicipio')],
   ['aviso: coordenada dudosa (cok=false) no se juzga',avi(Object.assign({},tunja,{cok:false})),{t:null,evaluados:0,emparejados:0},SI('avisoMunicipio')],
   ['Res. 0126: Atelopus ebenoides es CR',amen('Atelopus ebenoides'),{cat:'CR',lista:'Atelopus ebenoides',via:'nombre'},SI('amenazadaNacional')],
   ['Res. 0126: con autoría y minúscula inicial, igual',amen('atelopus ebenoides Rivero, 1963'),{cat:'CR',lista:'Atelopus ebenoides',via:'nombre'},SI('amenazadaNacional')],
   ['Res. 0126: Crocodylus acutus es EN',amen('Crocodylus acutus'),{cat:'EN',lista:'Crocodylus acutus',via:'nombre'},SI('amenazadaNacional')],
   ['Res. 0126: subespecie que está en la lista',amen('Trachemys venusta callirostris'),{cat:'VU',lista:'Trachemys venusta callirostris',via:'nombre'},SI('amenazadaNacional')],
   ['Res. 0126: subespecie que no está cuenta por su especie',amen('Kinosternon dunni inventada'),{cat:'VU',lista:'Kinosternon dunni',via:'especie'},SI('amenazadaNacional')],
   ['Res. 0126: la especie no cuenta por una subespecie suya',amen('Kinosternon scorpioides'),null,SI('amenazadaNacional')],
   ['Res. 0126: una especie que no está',amen('Boa constrictor'),null,SI('amenazadaNacional')],
   ['Res. 0126: solo género no se juzga',amen('Atelopus'),null,SI('amenazadaNacional')],
   ['amenazadaDe: la lista nacional gana a la UICN',`amenazadaDe({amenCO:{cat:'EN'},nom:[{t:'nom_amenazada',v:'VU'}]})`,'EN',SI('amenazadaTexto')],
   ['amenazadaTexto: las dos listas',`amenazadaTexto({amenCO:{cat:'EN'},nom:[{t:'nom_amenazada',v:'VU'}]})`,'Res. 0126 de 2024 (MADS): EN; UICN: VU',SI('amenazadaTexto')],
   ['amenazadaTexto: solo UICN',`amenazadaTexto({nom:[{t:'nom_amenazada',v:'VU'}]})`,'UICN: VU',SI('amenazadaTexto')],
   ['amenazadaTexto: solo la lista nacional',`amenazadaTexto({amenCO:{cat:'CR'},nom:[]})`,'Res. 0126 de 2024 (MADS): CR',SI('amenazadaTexto')],
   ['punto en polígono: dentro de un cuadrado','puntoEnPoligono(0.5,0.5,[[0,0],[0,1],[1,1],[1,0]])',true,SI('puntoEnPoligono')],
   ['punto en polígono: fuera de un cuadrado','puntoEnPoligono(2,2,[[0,0],[0,1],[1,1],[1,0]])',false,SI('puntoEnPoligono')],
   ['distancia al borde: 0,045° al este de un cuadrado = 5 km','Math.round(distBordeKm(0.5,1.045,[[0,0],[0,1],[1,1],[1,0]]))',5,SI('distBordeKm')],
   ['enColombia: Bogotá dentro','enColombia(4.65,-74.08)',true,SI('contornoColombia')],
   ['enColombia: Leticia dentro','enColombia(-4.21,-69.94)',true,SI('contornoColombia')],
   ['enColombia: mar Caribe al norte de La Guajira, fuera','enColombia(13.0,-72.0)',false,SI('contornoColombia')],
   ['enColombia: Quito (dentro de la caja, fuera del país)','enColombia(-0.18,-78.47)',false,SI('contornoColombia')],
   ['enColombia: Iquitos (dentro de la caja, fuera del país)','enColombia(-3.75,-73.25)',false,SI('contornoColombia')],
   ['enColombia: San Andrés (isla, por su caja)','enColombia(12.55,-81.72)',true,SI('contornoColombia')],
   ['enColombia: isla Gorgona','enColombia(2.97,-78.18)',true,SI('contornoColombia')],
   ['enColombia: Pacífico lejos de la costa (79.57 W)','enColombia(5.9,-79.57)',false,SI('contornoColombia')],
   ['SiB 4.1: vitality "Vivo" -> alive',vit('Vivo'),[['vitality','alive']],S41],
   ['SiB 4.1: vitality "mixedlot" -> mixedLot',vit('mixedlot'),[['vitality','mixedLot']],S41],
   ['SiB 4.1: vitality "alive" es válido',vit('alive'),[],S41],
   ['SiB 4.1: vitality "medio vivo" no está en el vocabulario',vit('medio vivo'),[['vitality','']],S41],
   ['SiB 4.1: marinos exige locality y coordenadas',`['locality','decimalLatitude','decimalLongitude'].every(t=>SIB_OBLIGATORIOS.marinos.includes(t))`,true,S41],
   ['SiB 4.1: los obligatorios de colección no cambian','SIB_OBLIGATORIOS.coleccion.join()','occurrenceID,basisOfRecord,institutionCode,collectionCode,type,catalogNumber,institutionID,collectionID,disposition,country,scientificName,taxonRank',S41],
   ['SiB 4.1: encabezado "vitalty" mal escrito se lee como vitality','terminoParecido("vitalty")','vitality',T41],
   ['SiB 4.1: etiqueta "Superfamilia" -> superfamily','LBL2TERM[norm("Superfamilia")]','superfamily',T41],
   ['SiB 4.1: etiqueta corregida "ID del registrador" -> recordedByID','LBL2TERM[norm("ID del registrador")]','recordedByID',T41],
  ];
 })(),
];

let ok=0,mal=0,pend=0,omit=0;
for(const [desc,expr,esp,opt] of casos){
  if(opt&&opt.si){let va=false;try{va=!!vm.runInContext(opt.si,ctx,{timeout:2000});}catch(e){}if(!va){omit++;continue;}}
  let got,err=null;
  try{got=vm.runInContext(expr,ctx,{timeout:2000});}catch(e){err=e.message;}
  const igual=!err&&J(got)===J(esp);
  if(igual){ok++;continue;}
  const linea=`  ${desc}\n      esperado: ${J(esp)}\n      obtenido: ${err?'ERROR '+err:J(got)}`;
  if(opt&&opt.pendiente){pend++;console.log('PENDIENTE (posible fallo conocido)\n'+linea+'\n      nota: '+opt.pendiente);}
  else{mal++;console.log('FALLA\n'+linea);}
}
console.log(`\nVisor: ${path.relative(process.cwd(),html)}\n${ok} bien, ${mal} fallan, ${pend} pendientes, ${omit} omitidos por función ausente (de ${casos.length})`);
process.exit(mal?1:0);
