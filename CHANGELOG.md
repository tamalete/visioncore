# Registro de cambios

El proyecto se desarrolló como versiones numeradas de un archivo HTML antes de existir como repositorio; esta es la historia resumida. El repositorio arranca en 0.23.0 porque la versión interna vigente era la v23.

## 0.25.0 — 21 de septiembre de 2026

- El mapa ya no se puede alejar hasta perder los datos de vista: al cargar un archivo se acota el desplazamiento al área de los registros y se fija un tope de alejamiento.
- Botón nuevo con una mira, debajo del zoom, que devuelve la vista a los datos.
- Teselas con `noWrap`: se acabó el mundo repetido en horizontal.
- El botón para esconder el panel lateral ya no queda encima del control de zoom.
- La capa de calles pasó de OpenStreetMap a Esri World Street Map. Los servidores de OSM son de voluntarios y bloquean con 403 a las páginas abiertas con doble clic, así que la capa solo servía en la versión publicada; ahora funciona en ambas.
- Si un servidor de teselas falla, el cuadro queda vacío en lugar de gris con un letrero.

## 0.24.0 — 21 de septiembre de 2026

- Diseño para celular: el panel de capas arranca cerrado como un botón en el mapa, la lista de ejemplares se vuelve una hoja que sube desde abajo y el mapa ocupa toda la pantalla.
- `viewport-fit=cover` y márgenes seguros para que nada quede bajo las barras del sistema.
- El modo celular también se activa con el teléfono girado y en tabletas verticales.
- CSV, GeoJSON e Informe quedan deshabilitados mientras no haya datos cargados.

## 0.23.0 — 20 de septiembre de 2026

- Librerías empaquetadas dentro del repositorio: el visor ya no depende de ningún CDN y funciona sin conexión.
- La hoja del libro de Excel se escoge por contenido y no por nombre; avisa si el archivo trae otra hoja con datos.
- La detección de archivos repetidos usa un hash del contenido, no el nombre del archivo.
- Las exportaciones CSV neutralizan valores que Excel podría ejecutar como fórmula.
- Vocabularios de sexo y etapa de vida reconocen sinónimos en inglés.
- Arreglada la fila del archivo de ejemplo que corría columnas y producía hallazgos falsos.

## 0.22.0 — 20 de septiembre de 2026

- **Pantalla de revisión**: al cargar un archivo se explica cada problema encontrado con qué pasó, por qué importa, cómo se arregla y ejemplos "dice / debería decir", con descarga de un CSV de correcciones sugeridas.
- Se retiraron los registros reales que venían incrustados en el archivo; ahora arranca vacío y trae 14 registros de ejemplo inventados.
- Mensajes claros cuando un archivo no deja ningún registro, en vez de un "listo" falso.
- El GeoJSON exportado marca las coordenadas no confiables.

## 0.21.0 — 15 de septiembre de 2026

- Capa base oscura sin llave de API (Esri Dark Gray).
- Coordenadas: se marcan como dudosas las imposibles y no se dibujan por defecto; lectura de más formatos y detección de latitud/longitud intercambiadas.
- Lectura de columnas que antes se ignoraban (coordenadas originales, municipio, identificador, hábitat, método) y recuperación de encabezados pisados por las etiquetas en español.
- Panel de síntesis y salto al ejemplar desde la lista.

## Antes de 0.21.0

Versiones 1 a 20: mapa con fichas tipo voucher, carga de varios archivos, conversión de coordenadas en grados-minutos-segundos, validación de clase contra familia, modos de color por grupo, altitud y hora, exportación a CSV y GeoJSON.
