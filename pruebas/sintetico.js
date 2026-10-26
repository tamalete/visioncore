// Ayudas para armar libros sintéticos en memoria (con el SheetJS que ya carga el visor) y pasarlos por el visor como lo hace correr.js.
// Todo es inventado: especies reales comunes de Colombia, pero coordenadas, catálogos y personas de ejemplo. Nada sale de datos/.
const vm=require('vm');

// fila válida de base (casi no dispara nada de error); cada caso la cambia en lo que quiere probar
const BASE={
  catalogNumber:'EJEM-001',recordNumber:'EJ-001',scientificName:'Pristimantis bogotensis',genus:'Pristimantis',specificEpithet:'bogotensis',
  class:'Amphibia',order:'Anura',family:'Strabomantidae',country:'Colombia',stateProvince:'Boyacá',county:'Tunja',municipality:'',
  locality:'Vereda El Ejemplo',decimalLatitude:5.54,decimalLongitude:-73.36,verbatimElevation:'2820 msnm',eventDate:'2025-03-14',eventTime:'19:40:00',
  recordedBy:'Equipo de ejemplo',identifiedBy:'Equipo de ejemplo',sex:'Macho',lifeStage:'Adulto',institutionCode:'Universidad de Ejemplo (UEJ)',collectionCode:'EJ-Herp',basisOfRecord:'PreservedSpecimen'
};
// fila i (0, 1, 2…) de un libro: números de catálogo y de campo distintos, un día distinto y un punto apenas distinto (para que no parezca un lote)
function fila(i,over){
  const n=String(i+1).padStart(3,'0');
  const f=Object.assign({},BASE,{catalogNumber:'EJEM-'+n,recordNumber:'EJ-'+n,
    eventDate:'2025-03-'+String(1+(i%28)).padStart(2,'0'),decimalLatitude:Math.round((5.54+0.002*i)*1e6)/1e6,decimalLongitude:Math.round((-73.36-0.002*i)*1e6)/1e6},over||{});
  Object.keys(f).forEach(k=>{if(f[k]===undefined)delete f[k];}); // undefined = quitar la columna en esa fila (queda vacía)
  return f;
}
// hoja «Plantilla»: fila 1 con los términos, fila 2 con la etiqueta, datos desde la fila 3 (como la plantilla del SiB)
function libro(XLSX,filas,etq){
  const cols=[];
  filas.forEach(f=>Object.keys(f).forEach(k=>{if(!cols.includes(k))cols.push(k);}));
  // etq: término -> etiqueta en español (del propio visor, ver etiquetasDe); sin ella la fila 2 se leería como un registro
  const aoa=[cols,cols.map(c=>(etq&&etq[c])||c)].concat(filas.map(f=>cols.map(c=>f[c]===undefined||f[c]===null?null:f[c])));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'Plantilla');
  return wb;
}
// término -> etiqueta en español, invirtiendo la tabla que usa el visor para reconocer la fila 2 de la plantilla del SiB
function etiquetasDe(ctx){
  return vm.runInContext('Object.fromEntries(Object.entries(LBL2TERM).map(([l,t])=>[t,l]))',ctx);
}
// las funciones y variables del visor que hacen falta, tal como las toma correr.js
function enlazar(ctx){
  return vm.runInContext('({parseWorkbook,unirFuentes,QC_TYPES,setSources(v){sources=v},get sources(){return sources},get DATA(){return DATA}})',ctx);
}
// pasa un libro por el visor (parseWorkbook + unirFuentes) y devuelve los registros
function cargarLibro(ctx,X,wb,nombre){
  const r=X.parseWorkbook(wb);
  X.setSources([{name:nombre||'sintetico.xlsx',archivo:nombre||'sintetico.xlsx',recs:r.recs,hoja:r.hoja,terminos:r.terminos,etiquetas:r.etiquetas}]);
  X.unirFuentes();
  return X.DATA;
}
// todos los tipos de hallazgo de un registro: errores/faltas (iss), capa SiB, alertas y, aparte, la lista nacional de amenazadas
const tiposDe=r=>new Set([].concat(r.iss||[],r.sib||[],r.alerta||[]).map(x=>x.t).concat(r.amenCO?['amen_co']:[]));
module.exports={BASE,fila,libro,etiquetasDe,enlazar,cargarLibro,tiposDe};
