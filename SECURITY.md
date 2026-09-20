# Seguridad

## Cómo está construido

- **Sin servidor y sin red.** El visor no hace ninguna petición con los datos que se cargan: no hay `fetch`, `XMLHttpRequest`, `sendBeacon`, WebSocket ni analítica. Los archivos se leen con `FileReader` y se procesan en memoria.
- **Sin almacenamiento.** No usa `localStorage`, `sessionStorage` ni IndexedDB. Al cerrar la pestaña no queda nada.
- **Sin dependencias remotas.** Leaflet, Leaflet.markercluster, SheetJS y las dos tipografías están empaquetados en `vendor/`. No se carga código desde ningún CDN, así que un CDN comprometido no puede inyectar nada en el visor.
- **Sin `eval` ni `new Function`.**
- **Escape de HTML.** Todo dato del archivo del usuario pasa por `esc()` antes de insertarse en el DOM, porque una celda de un Excel puede contener HTML o `<script>`.
- **CSV.** Los valores que empiezan en `=`, `+`, `@` o `-` se escriben con una comilla simple delante para que Excel no los interprete como fórmula al abrir las exportaciones. Los números negativos (las longitudes) no se tocan.

## Lo único que sale a internet

Las teselas de los mapas base (Esri, OpenTopoMap, OpenStreetMap). Esos servidores ven el área que se está mirando, no los registros. Sin conexión, el mapa queda gris y el resto del visor funciona igual.

## Reportar un problema

Si encuentra una vulnerabilidad, escriba a itzuthi.es@gmail.com en vez de abrir un issue público, y dé un plazo razonable antes de divulgarla.
