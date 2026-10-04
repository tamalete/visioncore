# Seguridad

## Cómo está construido

- **Sin servidor.** Los archivos se leen con `FileReader` y se procesan en memoria. Los registros cargados nunca se envían a ningún servidor.
- **Una sola función hace peticiones con datos, y solo a petición.** La verificación de nombres usa `fetch` contra la API de GBIF (`api.gbif.org/v2/species/match`) únicamente cuando la persona pulsa el botón, y envía solo los nombres científicos distintos del archivo (sin autoría). No envía registros, localidades, coordenadas ni personas. No hay otro `fetch`, ni `XMLHttpRequest`, `sendBeacon`, WebSocket ni analítica.
- **Sin almacenamiento.** No usa `localStorage`, `sessionStorage` ni IndexedDB. Al cerrar la pestaña no queda nada.
- **Sin dependencias remotas.** Leaflet, Leaflet.markercluster, SheetJS y las dos tipografías están empaquetados en `vendor/`. No se carga código desde ningún CDN, así que un CDN comprometido no puede inyectar nada en el visor.
- **Sin `eval` ni `new Function`.**
- **Escape de HTML.** Todo dato del archivo del usuario pasa por `esc()` antes de insertarse en el DOM, porque una celda de un Excel puede contener HTML o `<script>`. La respuesta de GBIF se trata igual: se muestra como texto.
- **Archivos comprimidos.** Los `.zip` (descargas de GBIF) se descomprimen en el navegador con `DecompressionStream`, sin librerías de terceros.
- **CSV.** Los valores que empiezan en `=`, `+`, `@` o `-` se escriben con una comilla simple delante para que Excel no los interprete como fórmula al abrir las exportaciones. Los números negativos (las longitudes) no se tocan.

## Lo que sale a internet

- **Teselas de los mapas base** (Esri y OpenTopoMap). Esos servidores ven el área que se está mirando, no los registros. Sin conexión, el mapa queda vacío y el resto del visor funciona igual.
- **Verificación de nombres con GBIF**, solo si la persona pulsa el botón, con los nombres científicos distintos y nada más. GBIF, como cualquier servidor, puede ver la dirección IP de quien consulta.
- Los enlaces a gbif.org de los resultados solo se abren si se les hace clic.

## Reportar un problema

Si encuentra una vulnerabilidad, escriba a itzuthi.es@gmail.com en vez de abrir un issue público, y dé un plazo razonable antes de divulgarla.
