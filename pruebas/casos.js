// Una fila (o un pequeño libro) por regla: cada caso declara qué hallazgo DEBE salir y cuáles NO (falsos positivos).
//   node pruebas/casos.js [ruta_al_html]
// Arma en memoria, con el SheetJS del visor, un libro sintético (ver sintetico.js), lo pasa por parseWorkbook y unirFuentes igual que correr.js
// y mira los tipos de hallazgo de cada fila (r.iss, r.sib, r.alerta y r.amenCO). Termina con código 1 si algún caso falla.
// Caso: {id, tipo, filas|n+f, no, en, si}
//   tipo   un tipo (o varios) que debe salir; null si el caso solo vigila falsos positivos
//   no     tipos que NO deben salir en ninguna fila
//   en     {tipo:[índices de fila]}: filas (desde 0) en las que debe salir ese tipo, y solo en ellas
//   filas  lista de cambios sobre la fila de base (sintetico.js); n+f(i) genera n filas
//   si     expresión evaluada en el visor: el caso solo corre si da verdadero (por omisión, que el tipo exista en QC_TYPES)
//   ver    función(recs) -> mensaje de error o '' para comprobaciones que no son de tipo (por ejemplo, la sugerencia)
const path=require('path'),vm=require('vm');
const {cargarVisor,RAIZ}=require('./cargar.js');
const S=require('./sintetico.js');
const html=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(RAIZ,'index.html'));
const ctx=cargarVisor(html);
const X=S.enlazar(ctx);
const ETQ=S.etiquetasDe(ctx);
const Q=Object.keys(X.QC_TYPES);

// ---- tipos que esta prueba no puede ejercitar y por qué ----
// ag_*: banderas que pone GBIF en la columna issue; no son reglas del visor (se leen de una descarga de GBIF).
// nom_*: salen de la verificación de nombres contra GBIF / Catalogue of Life (red).
const RED=['nom_mal_escrito','nom_sinonimo','nom_no_encontrado','nom_solo_genero','nom_familia_distinta','nom_otro_grupo','nom_amenazada'];
const propios=Q.filter(t=>!/^ag_/.test(t));

const casos=[];
// ver: la sugerencia (sug) del hallazgo de ese tipo en la primera fila que lo tenga debe ser la esperada
const sugDe=(t,esp)=>rs=>{const x=rs.flatMap(r=>[].concat(r.iss||[],r.sib||[],r.alerta||[])).find(h=>h.t===t);return x&&String(x.sug)===esp?'':`la sugerencia de ${t} era «${x&&x.sug}» y debía ser «${esp}»`;};
const c=(id,tipo,filas,o)=>casos.push(Object.assign({id,tipo,filas},o||{}));
const lote=(id,tipo,n,f,o)=>casos.push(Object.assign({id,tipo,n,f},o||{}));
const AMF={class:'Amphibia',order:'Anura'};
const REP={class:'Reptilia',order:'Squamata'};
const SINCOORD={decimalLatitude:undefined,decimalLongitude:undefined};

// ---- fila de control: sin errores ----
c('control: la fila de base no dispara ningún error ni alerta',null,[{}],{no:Q.filter(t=>X.QC_TYPES[t].s==='err'||X.QC_TYPES[t].s==='alerta'||X.QC_TYPES[t].s==='falta')});

// ---- taxonomía ----
c('clase_incongruente: Rhinella marina (Bufonidae) con class = Reptilia','clase_incongruente',[{scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'Bufonidae',class:'Reptilia'}],{no:['clase_es_orden','clase_indeterminada','familia_desconocida']});
c('clase_es_orden: class trae «Anura»','clase_es_orden',[{scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'Bufonidae',class:'Anura'}],{no:['clase_incongruente']});
c('clase_indeterminada: nombre sin familia, orden ni clase','clase_indeterminada',[{scientificName:'Inventus fantasticus',genus:'Inventus',specificEpithet:'fantasticus',family:'',order:'',class:''}],{no:['clase_incongruente']});
c('clase_indeterminada: no sale si el orden dice el grupo (falso positivo)',null,[{family:'',class:''}],{no:['clase_indeterminada','clase_incongruente']});
c('familia_mal_escrita: «bufonidae» en minúscula','familia_mal_escrita',[{scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'bufonidae'}],{no:['familia_desconocida','clase_incongruente']});
c('familia_no_vigente: Anolis auratus en Polychrotidae (sug Anolidae)','familia_no_vigente',[{scientificName:'Anolis auratus',genus:'Anolis',specificEpithet:'auratus',family:'Polychrotidae',class:'Reptilia',order:'Squamata'}],{no:['familia_desconocida','familia_mal_escrita'],ver:sugDe('familia_no_vigente','Anolidae')});
c('familia_no_vigente: Dactyloidae con un género que no es Anolis (Hemidactylus frenatus)','familia_no_vigente',[{scientificName:'Hemidactylus frenatus',genus:'Hemidactylus',specificEpithet:'frenatus',family:'Dactyloidae',class:'Reptilia',order:'Squamata'}],{no:['familia_desconocida']});
c('familia_no_vigente: Anolidae (la familia vigente) no se marca',null,[{scientificName:'Anolis auratus',genus:'Anolis',specificEpithet:'auratus',family:'Anolidae',class:'Reptilia',order:'Squamata'}],{no:['familia_no_vigente','familia_desconocida','familia_mal_escrita']});
c('familia_desconocida: «Fantasmidae» en un anuro','familia_desconocida',[{family:'Fantasmidae'}],{no:['familia_mal_escrita','familia_no_vigente']});
c('familia_desconocida: no se inventa para un grupo sin tabla (un ave)',null,[{scientificName:'Turdus fuscater',genus:'Turdus',specificEpithet:'fuscater',family:'Turdidae',class:'Aves',order:'Passeriformes'}],{no:['familia_desconocida']});
c('genero_no_concuerda: genus = Boana con nombre de Pristimantis','genero_no_concuerda',[{genus:'Boana'}],{no:['epiteto_no_concuerda']});
c('genero_no_concuerda: un subgénero entre paréntesis no cuenta (falso positivo)',null,[{scientificName:'Poecilia (Allopoecilia) caucana',genus:'Poecilia',specificEpithet:'caucana',family:'Poeciliidae',class:'Actinopterygii',order:'Cyprinodontiformes'}],{no:['genero_no_concuerda','epiteto_no_concuerda']});
c('epiteto_no_concuerda: epíteto «achatinus» con nombre bogotensis','epiteto_no_concuerda',[{specificEpithet:'achatinus'}],{no:['genero_no_concuerda','epiteto_vacio']});
c('epiteto_no_concuerda: un morfotipo («sp1») no se compara (falso positivo)',null,[{scientificName:'Pristimantis sp1',specificEpithet:'sp1'},{scientificName:'Pristimantis sp.',specificEpithet:'sp.'}],{no:['epiteto_no_concuerda','epiteto_vacio']});
c('epiteto_vacio: la columna del epíteto está vacía y el nombre sí lo trae','epiteto_vacio',[{specificEpithet:''}],{no:['epiteto_no_concuerda']});
c('epiteto_vacio: un morfotipo sin epíteto no es epíteto vacío (falso positivo)',null,[{scientificName:'Pristimantis sp.',specificEpithet:''}],{no:['epiteto_vacio']});
c('familia_no_concuerda_genero: Pristimantis en Bufonidae','familia_no_concuerda_genero',[{family:'Bufonidae'}],{no:['familia_desconocida','clase_incongruente'],ver:sugDe('familia_no_concuerda_genero','Strabomantidae')});
c('familia_no_concuerda_genero: Pristimantis en Craugastoridae sí es válido (falso positivo)',null,[{family:'Craugastoridae'}],{no:['familia_no_concuerda_genero']});
c('familia_no_concuerda_genero: Rhinella en Bufonidae y Hyla en Hylidae están bien',null,[{scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'Bufonidae'},{scientificName:'Hyla labialis',genus:'Hyla',specificEpithet:'labialis',family:'Hylidae'}],{no:['familia_no_concuerda_genero']});
c('familia_no_concuerda_genero: un género que la tabla no conoce no se juzga (falso positivo)',null,[{scientificName:'Inventus fantasticus',genus:'Inventus',specificEpithet:'fantasticus',family:'Bufonidae'}],{no:['familia_no_concuerda_genero']});
c('sin_familia: familia vacía','sin_familia',[{family:''}]);
c('sin_nombre_cientifico: ejemplar catalogado sin nombre','sin_nombre_cientifico',[{scientificName:'',genus:'',specificEpithet:''}]);

// ---- identificadores ----
c('id_duplicado: el mismo catálogo en la misma institución dos veces','id_duplicado',[{},{catalogNumber:'EJEM-001'}],{en:{id_duplicado:[1]}});
c('id_duplicado: EJEM-0042 y EJEM-42 son el mismo catálogo','id_duplicado',[{catalogNumber:'EJEM-0042'},{catalogNumber:'EJEM-42'}],{en:{id_duplicado:[1]}});
c('id_duplicado: el mismo número en dos instituciones distintas no es duplicado (falso positivo)',null,[{},{catalogNumber:'EJEM-001',institutionCode:'Otra Universidad (OTRA)'}],{no:['id_duplicado']});
c('sin_identificador: sin catálogo ni número de campo','sin_identificador',[{catalogNumber:'',recordNumber:''}]);
c('catalogo_formato: una serie escrita con y sin ceros de relleno','catalogo_formato',[{catalogNumber:'EJEM-0001'},{catalogNumber:'EJEM-0002'},{catalogNumber:'EJEM-0003'},{catalogNumber:'EJEM-4'}],{en:{catalogo_formato:[3]}});
c('catalogo_formato: una serie escrita igual en todas las filas no se marca (falso positivo)',null,[{catalogNumber:'EJEM-0001'},{catalogNumber:'EJEM-0002'},{catalogNumber:'EJEM-0003'}],{no:['catalogo_formato']});

// ---- coordenadas ----
c('coord_intercambiadas: latitud -73,36 y longitud 5,54','coord_intercambiadas',[{decimalLatitude:-73.36,decimalLongitude:5.54}],{no:['coord_fuera_rango','coord_fuera_colombia']});
c('coord_intercambiadas: Leticia (latitud sur) bien escrita no se marca (falso positivo)',null,[{stateProvince:'Amazonas',county:'Leticia',decimalLatitude:-4.21,decimalLongitude:-69.94}],{no:['coord_intercambiadas','coord_fuera_colombia','coord_no_cae_en_departamento']});
c('coord_grados_faltantes: «°31\'48.77" N» sin los grados','coord_grados_faltantes',[Object.assign({verbatimLatitude:'°31\'48.77" N',verbatimLongitude:'73°21\'36" W'},SINCOORD)],{no:['sin_coordenadas']});
c('coord_dms_dudosa: «7°41”» (¿minutos o segundos?)','coord_dms_dudosa',[Object.assign({verbatimLatitude:'7°41”',verbatimLongitude:'73°21\'36" W'},SINCOORD)],{no:['sin_coordenadas']});
c('coord_dms_dudosa: grados, minutos y segundos completos no se marcan (falso positivo)',null,[Object.assign({verbatimLatitude:'5°32\'24" N',verbatimLongitude:'73°21\'36" W'},SINCOORD)],{no:['coord_dms_dudosa','sin_coordenadas','coord_fuera_colombia']});
c('coord_reconstruida: 5123456 y 73654321 sin punto decimal','coord_reconstruida',[{decimalLatitude:5123456,decimalLongitude:-73654321}],{no:['coord_ilegible','sin_coordenadas']});
c('coord_sin_punto: decimales bien y las columnas verbatim sin punto','coord_sin_punto',[{verbatimLatitude:'5540000',verbatimLongitude:'-73360000'}],{no:['coord_reconstruida']});
c('coord_sin_punto: verbatim con punto decimal no se marca (falso positivo)',null,[{verbatimLatitude:'5.54',verbatimLongitude:'-73.36'}],{no:['coord_sin_punto','coord_reconstruida']});
c('coord_ilegible: latitud y longitud con texto','coord_ilegible',[{decimalLatitude:'abc',decimalLongitude:'xyz'}],{no:['sin_coordenadas']});
c('coord_fuera_rango: latitud 95,5','coord_fuera_rango',[{decimalLatitude:95.5,decimalLongitude:-73.36}]);
c('coord_fuera_colombia: un punto en España con country = Colombia','coord_fuera_colombia',[{decimalLatitude:40.4,decimalLongitude:-3.7}],{no:['coord_no_cae_en_pais']});
c('coord_fuera_colombia: latitud sur y longitud sin W: se propone cambiar el signo de la latitud (sug)','coord_fuera_colombia',[{decimalLatitude:-5.54,decimalLongitude:73.36,stateProvince:'Boyacá'}],{no:['coord_no_cae_en_pais'],ver:sugDe('coord_fuera_colombia','lat 5.54000, lon -73.36000 (signo de la latitud)')});
c('coord_no_cae_en_pais: country = Ecuador con un punto de Boyacá','coord_no_cae_en_pais',[{country:'Ecuador',stateProvince:'Pichincha',county:'Quito'}],{no:['coord_fuera_colombia']});
c('coord_no_cae_en_pais: Quito con country = Ecuador está bien (falso positivo)',null,[{country:'Ecuador',stateProvince:'Pichincha',county:'Quito',decimalLatitude:-0.18,decimalLongitude:-78.47}],{no:['coord_no_cae_en_pais','coord_fuera_colombia','coord_no_cae_en_departamento']});
c('coord_no_cae_en_departamento: stateProvince = Nariño con un punto de Boyacá','coord_no_cae_en_departamento',[{stateProvince:'Nariño',county:''}],{no:['coord_fuera_colombia']});
c('coord_no_cae_en_departamento: el alias «Valle» con un punto de Cali está bien (falso positivo)',null,[{stateProvince:'Valle',county:'Cali',decimalLatitude:3.4516,decimalLongitude:-76.532}],{no:['coord_no_cae_en_departamento','coord_fuera_colombia']});
c('coord_discrepante: coordenadas originales distintas de las columnas','coord_discrepante',[{verbatimCoordinates:'5°32\'24" N 73°21\'36" W',verbatimLatitude:'6°10\'00" N',verbatimLongitude:'72°50\'00" W'}]);
c('coord_discrepante: las dos formas dicen lo mismo (falso positivo)',null,[{verbatimCoordinates:'5°32\'24" N 73°21\'36" W',verbatimLatitude:'5°32\'24" N',verbatimLongitude:'73°21\'36" W'}],{no:['coord_discrepante']});
c('segundos_invalidos: 75 segundos','segundos_invalidos',[Object.assign({verbatimLatitude:'5°30\'75" N',verbatimLongitude:'73°21\'36" W'},SINCOORD)],{no:['coord_dms_dudosa']});
c('minutos_invalidos: 65 minutos','minutos_invalidos',[Object.assign({verbatimLatitude:'5°65\'10" N',verbatimLongitude:'73°21\'36" W'},SINCOORD)],{no:['coord_dms_dudosa']});
c('lon_sin_hemisferio: longitud 73,36 sin signo menos (sug -73.36)','lon_sin_hemisferio',[{decimalLongitude:73.36}],{no:['coord_fuera_colombia'],ver:sugDe('lon_sin_hemisferio','-73.36')});
c('lon_sin_hemisferio: longitud con el signo menos no se marca (falso positivo)',null,[{decimalLongitude:-73.36}],{no:['lon_sin_hemisferio']});
c('sin_coordenadas: latitud y longitud vacías','sin_coordenadas',[SINCOORD],{no:['coord_ilegible']});

// ---- fechas, horas, altitud ----
c('fecha_ilegible: «ayer por la tarde»','fecha_ilegible',[{eventDate:'ayer por la tarde'}],{no:['sin_fecha']});
c('fecha_improbable: 31/02/2024','fecha_improbable',[{eventDate:'31/02/2024'}],{no:['fecha_ilegible']});
c('fecha_no_iso: 15/03/2024 es válida pero no ISO','fecha_no_iso',[{eventDate:'15/03/2024'}],{no:['fecha_improbable','fecha_ilegible']});
c('fecha_no_iso: una fecha ISO no se marca (falso positivo)',null,[{eventDate:'2024-03-15'}],{no:['fecha_no_iso','fecha_improbable']});
c('fecha_no_concuerda_ymd: eventDate 2025-03-14 con year/month/day de 2024','fecha_no_concuerda_ymd',[{eventDate:'2025-03-14',year:2024,month:3,day:14}]);
c('fecha_no_concuerda_ymd: year/month/day iguales a eventDate están bien (falso positivo)',null,[{eventDate:'2025-03-14',year:2025,month:3,day:14}],{no:['fecha_no_concuerda_ymd']});
c('sin_fecha: fecha vacía','sin_fecha',[{eventDate:''}]);
c('hora_perdida: eventTime trae 1899-12-31','hora_perdida',[{eventTime:'1899-12-31'}],{no:['hora_no_iso']});
c('hora_no_iso: «9:30 pm»','hora_no_iso',[{eventTime:'9:30 pm'}],{no:['hora_perdida']});
c('hora_no_iso: «19:40:00» es ISO (falso positivo)',null,[{eventTime:'19:40:00'}],{no:['hora_no_iso','hora_perdida']});
c('altitud_fuera_de_campo: la altitud escrita en el centro poblado','altitud_fuera_de_campo',[{verbatimElevation:undefined,locality:'',municipality:'Vereda El Alto, 2820 msnm'}],{no:['sin_altitud']});
c('altitud_improbable: 8900 msnm','altitud_improbable',[{verbatimElevation:'8900 msnm'}],{no:['sin_altitud']});
c('altitud_improbable: 10000 ft son 3048 m, no es improbable (falso positivo)',null,[{verbatimElevation:'10000 ft'}],{no:['altitud_improbable']});
c('sin_altitud: sin elevación','sin_altitud',[{verbatimElevation:undefined}]);
c('sin_localidad: sin localidad, centro poblado ni municipio','sin_localidad',[{locality:'',county:''}]);
c('sin_colector: sin recolector','sin_colector',[{recordedBy:''}]);
c('sin_determinador: sin quien identificó','sin_determinador',[{identifiedBy:''}]);

// ---- vocabularios ----
c('vocabulario_sexo: «Sexo raro» no es del vocabulario del SiB','vocabulario_sexo',[{sex:'Sexo raro'}]);
c('vocabulario_sexo: «male» se propone como «Macho» (sug)','vocabulario_sexo',[{sex:'male'}],{ver:sugDe('vocabulario_sexo','Macho')});
c('vocabulario_sexo: «Macho», «Hembra» y vacío están bien (falso positivo)',null,[{sex:'Macho'},{sex:'Hembra'},{sex:''}],{no:['vocabulario_sexo']});
c('vocabulario_etapa: «Medio crecido» no es del vocabulario','vocabulario_etapa',[{lifeStage:'Medio crecido'}]);
c('vocabulario_etapa: «Adulto» está bien (falso positivo)',null,[{lifeStage:'Adulto'}],{no:['vocabulario_etapa']});

// ---- capa SiB ----
c('sib_obligatorio: falta occurrenceID (y otros) en una colección biológica','sib_obligatorio',[{}],{ver:rs=>rs[0].sib.some(x=>x.t==='sib_obligatorio'&&x.col==='occurrenceID')?'':'no salió sib_obligatorio para occurrenceID'});
c('sib_obligatorio: con los doce obligatorios de colección completos no sale (falso positivo)',null,[{occurrenceID:'UEJ:EJ-Herp:EJEM-001',type:'PhysicalObject',institutionID:'900000000',collectionID:'EJ-Herp-1',disposition:'En colección',countryCode:'CO',taxonRank:'Especie'}],{no:['sib_obligatorio']});
c('sib_vocabulario: basisOfRecord «Espécimen» fuera del vocabulario','sib_vocabulario',[{basisOfRecord:'Espécimen raro'}]);
c('sib_vocabulario_taxonrank: taxonRank «especie» en minúscula','sib_vocabulario_taxonrank',[{taxonRank:'especie'}],{no:['sib_vocabulario']});
c('sib_countrycode: «COL» en vez de CO','sib_countrycode',[{countryCode:'COL'}]);
c('sib_countrycode: «CO» está bien (falso positivo)',null,[{countryCode:'CO'}],{no:['sib_countrycode']});
c('sib_language: «español» en vez de es','sib_language',[{language:'español'}]);
c('sib_language: «es» está bien (falso positivo)',null,[{language:'es'}],{no:['sib_language']});
c('sib_basis_type: PreservedSpecimen con type = Event','sib_basis_type',[{type:'Event'}]);
c('sib_basis_type: PreservedSpecimen con PhysicalObject está bien (falso positivo)',null,[{type:'PhysicalObject'}],{no:['sib_basis_type']});
c('sib_institucion_invertida: institutionCode trae un NIT','sib_institucion_invertida',[{institutionCode:'900.123.456-7',institutionID:'UEJ'}],{no:['sib_institutioncode_formato']});
c('sib_institutioncode_formato: «UEJ» sin el nombre completo','sib_institutioncode_formato',[{institutionCode:'UEJ'}],{no:['sib_institucion_invertida']});
c('sib_institutioncode_formato: «Universidad de Ejemplo (UEJ)» está bien (falso positivo)',null,[{}],{no:['sib_institutioncode_formato','sib_institucion_invertida']});
c('sib_occurrenceid_espacios: occurrenceID con espacios','sib_occurrenceid_espacios',[{occurrenceID:'UEJ: EJ-Herp: EJEM-001'}]);
c('sib_occurrenceid_repetido: el mismo occurrenceID en dos filas','sib_occurrenceid_repetido',[{occurrenceID:'UEJ:EJ-Herp:1'},{occurrenceID:'UEJ:EJ-Herp:1'}],{en:{sib_occurrenceid_repetido:[0,1]}});
c('sib_occurrenceid_repetido: occurrenceID distintos están bien (falso positivo)',null,[{occurrenceID:'UEJ:EJ-Herp:1'},{occurrenceID:'UEJ:EJ-Herp:2'}],{no:['sib_occurrenceid_repetido']});
c('sib_nombre_con_calificador: «Pristimantis cf. bogotensis»','sib_nombre_con_calificador',[{scientificName:'Pristimantis cf. bogotensis'}],{no:['sib_nombre_con_morfotipo']});
c('sib_nombre_con_morfotipo: «Pristimantis sp. 2»','sib_nombre_con_morfotipo',[{scientificName:'Pristimantis sp. 2',specificEpithet:''}],{no:['sib_nombre_con_calificador']});
c('sib_nombre_con_autoria: «Pristimantis bogotensis (Lynch, 1980)»','sib_nombre_con_autoria',[{scientificName:'Pristimantis bogotensis (Lynch, 1980)'}]);
c('sib_nombre_mayusculas: «pristimantis bogotensis» en minúscula','sib_nombre_mayusculas',[{scientificName:'pristimantis bogotensis'}]);
c('sib_nombre_*: un nombre limpio no dispara ninguno (falso positivo)',null,[{}],{no:['sib_nombre_con_calificador','sib_nombre_con_morfotipo','sib_nombre_con_autoria','sib_nombre_mayusculas']});
c('sib_elevacion_con_unidad: minimumElevationInMeters «2820 m»','sib_elevacion_con_unidad',[{minimumElevationInMeters:'2820 m'}]);
c('sib_elevacion_con_unidad: un número solo está bien (falso positivo)',null,[{minimumElevationInMeters:'2820'},{minimumElevationInMeters:2820}],{no:['sib_elevacion_con_unidad']});
c('sib_separador_lista: dos personas separadas con «;»','sib_separador_lista',[{recordedBy:'Equipo A; Equipo B'}]);
c('sib_separador_lista: «|» está bien (falso positivo)',null,[{recordedBy:'Equipo A | Equipo B'}],{no:['sib_separador_lista']});
c('sib_scientificnameid: un nombre en vez de un identificador','sib_scientificnameid',[{scientificNameID:'Pristimantis bogotensis'}]);
c('sib_scientificnameid: un identificador con número está bien (falso positivo)',null,[{scientificNameID:'urn:lsid:example.org:taxname:123456'}],{no:['sib_scientificnameid']});

// ---- alertas (miran varias filas a la vez) ----
c('al_repetido: dos filas de la misma especie, día y punto, con el mismo número de campo','al_repetido',[{eventDate:'2025-03-14',recordNumber:'EJ-001',catalogNumber:'EJEM-001'},{eventDate:'2025-03-14',recordNumber:'EJ-001',catalogNumber:'EJEM-002'}].map(o=>Object.assign(o,{decimalLatitude:5.54,decimalLongitude:-73.36})),{en:{al_repetido:[0,1]},no:['al_lote']});
c('al_lote: misma especie, día y punto en un mismo archivo, con números distintos','al_lote',[{eventDate:'2025-03-14',decimalLatitude:5.54,decimalLongitude:-73.36},{eventDate:'2025-03-14',decimalLatitude:5.54,decimalLongitude:-73.36}],{en:{al_lote:[0,1]},no:['al_repetido']});
c('al_repetido / al_lote: días distintos en el mismo punto no son lote (falso positivo)',null,[{eventDate:'2025-03-14',decimalLatitude:5.54,decimalLongitude:-73.36},{eventDate:'2025-03-15',decimalLatitude:5.54,decimalLongitude:-73.36}],{no:['al_repetido','al_lote']});
c('al_obs_colectado: HumanObservation con preparations «en alcohol»','al_obs_colectado',[{basisOfRecord:'HumanObservation',preparations:'Ejemplar en alcohol 70%'}]);
c('al_obs_colectado: una observación que dice «no se colectó» está bien (falso positivo)',null,[{basisOfRecord:'HumanObservation',preparations:'No se colectó'}],{no:['al_obs_colectado']});
c('al_fuera_municipio: county = Tunja con un punto en Medellín','al_fuera_municipio',[{decimalLatitude:6.244,decimalLongitude:-75.581}],{no:['al_municipio_vecino','coord_fuera_colombia']});
c('al_municipio_vecino: un punto a ~4 km del límite de Tunja','al_municipio_vecino',[{decimalLatitude:5.535,decimalLongitude:-73.27}],{no:['al_fuera_municipio']});
c('al_fuera_municipio / vecino: un punto dentro de Tunja no avisa (falso positivo)',null,[{decimalLatitude:5.535,decimalLongitude:-73.367}],{no:['al_fuera_municipio','al_municipio_vecino','al_municipio_desconocido']});
c('al_municipio_desconocido: «Guanentá» (una provincia) como county de Boyacá','al_municipio_desconocido',[{county:'Guanentá'}],{no:['al_fuera_municipio']});
c('al_municipio_desconocido: «Villa de Leiva» (alias) está bien (falso positivo)',null,[{county:'Villa de Leiva',decimalLatitude:5.633,decimalLongitude:-73.527}],{no:['al_municipio_desconocido','al_fuera_municipio']});
// el número de campo se compara solo si no más del 10 % de los números del archivo se repiten (si no, son estaciones o eventos, no ejemplares)
const OTRA={scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'Bufonidae'};
lote('al_campo_repetido: el mismo número de campo en dos especies distintas, en un archivo de 25 filas','al_campo_repetido',25,i=>i===3?{recordNumber:'ABC-156'}:i===9?Object.assign({recordNumber:'ABC-156'},OTRA):{},{en:{al_campo_repetido:[3,9]}});
lote('al_campo_repetido: con más del 10 % de números repetidos el archivo numera estaciones y no se compara (falso positivo)',null,25,i=>i<6?Object.assign({recordNumber:'ABC-'+(100+(i>>1))},i%2?OTRA:{}):{},{no:['al_campo_repetido']});
lote('al_campo_repetido: el mismo número de campo en la misma especie, día y municipio no avisa (falso positivo)',null,25,i=>i===3||i===9?{recordNumber:'ABC-156',eventDate:'2025-03-14',decimalLatitude:5.54,decimalLongitude:-73.36}:{},{no:['al_campo_repetido']});
lote('al_campo_repetido: «Sin etiqueta» repetido no es un número de campo (falso positivo)',null,25,i=>i===3?{recordNumber:'Sin etiqueta'}:i===9?Object.assign({recordNumber:'Sin etiqueta'},OTRA):{},{no:['al_campo_repetido']});
c('al_punto_compartido: el mismo punto en Tunja y en Villa de Leyva','al_punto_compartido',[{county:'Tunja',decimalLatitude:5.5400,decimalLongitude:-73.3600},{county:'Villa de Leyva',decimalLatitude:5.5400,decimalLongitude:-73.3600,eventDate:'2025-04-02',scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'Bufonidae'}],{en:{al_punto_compartido:[0,1]}});
c('al_punto_compartido: el mismo punto en un mismo municipio no avisa (falso positivo)',null,[{county:'Tunja',decimalLatitude:5.54,decimalLongitude:-73.36},{county:'Tunja',decimalLatitude:5.54,decimalLongitude:-73.36,eventDate:'2025-04-02'}],{no:['al_punto_compartido']});
c('al_punto_compartido: «Paz del Río» y «Paz de Río» son el mismo municipio escrito distinto (falso positivo)',null,[{county:'Paz del Río',decimalLatitude:5.9,decimalLongitude:-72.75},{county:'Paz de Río',decimalLatitude:5.9,decimalLongitude:-72.75,eventDate:'2025-04-02'}],{no:['al_punto_compartido']});
lote('al_valor_suelto: una fila con otro institutionCode entre 30','al_valor_suelto',30,i=>i===12?{institutionCode:'Otra Universidad (OTRA)'}:{},{en:{al_valor_suelto:[12]}});
lote('al_valor_suelto: un archivo de 30 filas iguales no avisa (falso positivo)',null,30,()=>({}),{no:['al_valor_suelto']});
lote('al_valor_suelto: la mitad y la mitad no es «el resto del archivo» (falso positivo)',null,30,i=>i%2?{institutionCode:'Otra Universidad (OTRA)'}:{},{no:['al_valor_suelto']});
lote('al_valor_suelto: un archivo de menos de 20 filas no se juzga (falso positivo)',null,10,i=>i===3?{institutionCode:'Otra Universidad (OTRA)'}:{},{no:['al_valor_suelto']});

// ---- lista nacional de amenazadas (Res. 0126 de 2024), sin internet ----
c('amen_co: Atelopus ebenoides está en la lista nacional','amen_co',[{scientificName:'Atelopus ebenoides',genus:'Atelopus',specificEpithet:'ebenoides',family:'Bufonidae'}]);
c('amen_co: Rhinella marina no está (falso positivo)',null,[{scientificName:'Rhinella marina',genus:'Rhinella',specificEpithet:'marina',family:'Bufonidae'}],{no:['amen_co']});

// ======== correr ========
let ok=0,mal=0,omit=0;const cubiertos=new Set(),vistosTipo=new Set();
const J=JSON.stringify;
casos.forEach((k,idx)=>{
  const debe=k.tipo==null?[]:[].concat(k.tipo);
  const no=k.no||[];
  // por omisión, el caso corre si todos los tipos que nombra existen en este visor
  const nombrados=debe.concat(no,Object.keys(k.en||{}));
  let corre=nombrados.every(t=>X.QC_TYPES[t]);
  if(k.si){try{corre=corre&&!!vm.runInContext(k.si,ctx,{timeout:2000});}catch(e){corre=false;}}
  if(!corre){omit++;return;}
  const filas=k.filas?k.filas.map((o,i)=>S.fila(i,o)):Array.from({length:k.n},(_,i)=>S.fila(i,k.f(i)));
  let recs,err='';
  try{recs=S.cargarLibro(ctx,X,S.libro(ctx.XLSX,filas,ETQ),'caso'+idx+'.xlsx');}catch(e){err='ERROR '+e.message;}
  if(!err&&recs.length!==filas.length)err=`el visor leyó ${recs.length} filas de ${filas.length}`;
  const fallos=[];
  if(err)fallos.push(err);
  else{
    const T=recs.map(S.tiposDe);
    debe.forEach(t=>{
      const donde=T.map((s,i)=>s.has(t)?i:-1).filter(i=>i>=0);
      if(!donde.length)fallos.push(`debía salir ${t} y no salió (salieron: ${[...new Set(T.flatMap(s=>[...s]))].join(', ')||'nada'})`);
    });
    Object.entries(k.en||{}).forEach(([t,esp])=>{
      const donde=T.map((s,i)=>s.has(t)?i:-1).filter(i=>i>=0);
      if(J(donde)!==J(esp))fallos.push(`${t} debía salir en las filas ${J(esp)} y salió en ${J(donde)}`);
    });
    no.forEach(t=>{const donde=T.map((s,i)=>s.has(t)?i:-1).filter(i=>i>=0);if(donde.length)fallos.push(`NO debía salir ${t} y salió en las filas ${J(donde)} (falso positivo)`);});
    if(k.ver){const m=k.ver(recs);if(m)fallos.push(m);}
  }
  if(!fallos.length){ok++;debe.forEach(t=>cubiertos.add(t));}
  else{
    mal++;
    console.log('FALLA '+k.id+'\n'+fallos.map(f=>'      '+f).join('\n'));
  }
  nombrados.forEach(t=>vistosTipo.add(t));
});

const total=propios.filter(t=>!RED.includes(t));
const sinCubrir=total.filter(t=>!cubiertos.has(t));
console.log(`\nVisor: ${path.relative(process.cwd(),html)}`);
console.log(`${ok} casos bien, ${mal} fallan, ${omit} omitidos por tipo o función ausente (de ${casos.length})`);
console.log(`Tipos propios cubiertos con un caso que pasa: ${total.length-sinCubrir.length} de ${total.length} (sin contar ${RED.length} que dependen de la red y ${Q.length-propios.length} banderas ag_* de GBIF)`);
if(sinCubrir.length)console.log('No cubiertos: '+sinCubrir.join(', '));
console.log('Fuera de esta prueba por depender de la red: '+RED.join(', '));
process.exit(mal?1:0);
