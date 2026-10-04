# Registro de cambios

El proyecto se desarrolló como versiones numeradas de un archivo HTML antes de existir como repositorio; esta es la historia resumida. El repositorio arrancó en 0.23.0 porque la versión interna vigente era la v23; la numeración sigue la interna (v30 = 0.30.0). Las versiones intermedias no se publicaron una por una.

## 0.30.0 — 4 de octubre de 2026

- Revisión sobre una descarga real de GBIF (Darwin Core Archive, 3.647 registros de *Dendropsophus*): de 592 registros con error en la v29 se pasó a 9, y los que quedan son reales. Se quitaron falsos positivos:
  - **Género**: si GBIF marca el nombre como sinónimo, el género se compara con el nombre aceptado, que es el que GBIF usa para llenar `genus` y `family`. La ficha muestra el nombre aceptado.
  - **Duplicados**: solo cuenta el mismo número de catálogo dentro de la misma institución, colección y conjunto de datos; si no hay catálogo, se compara `occurrenceID`. Ya no se comparan números de campo ni catálogos de museos distintos.
  - **Fechas**: "-- --- ----", "0 0 0" y "[no verbatim date data]" cuentan como campo vacío; se leen "2-Mar-71" y "June 1943 - July 1944".
  - **Altitud**: "10000 ft" se convierte a metros y se conserva el valor original.
- En una descarga de GBIF, la pestaña "Para publicar en el SiB" explica que esos valores ya fueron reescritos por GBIF en vez de contar requisitos que no aplican.
- Con los Excel de la UPTC las cifras no cambian (4.315 registros, 3.941 con coordenada confiable, 1.010 con al menos un error, 8.515 hallazgos).

## 0.29.0 — 3 de octubre de 2026

- **Importación de GBIF y de archivos de texto**: acepta `.txt`, `.csv` y `.tsv` (UTF-8, Windows-1252 y UTF-16; separador tabulador, coma o punto y coma) y el `.zip` de una descarga de GBIF (Darwin Core Archive: lee `occurrence.txt`; o descarga simple), descomprimido en el navegador sin librerías nuevas. Si no hay número de catálogo, el registro se identifica por su `gbifID`.
- **Verificación de nombres** contra el Catalogue of Life a través de GBIF, solo si la persona pulsa el botón. Envía únicamente los nombres científicos distintos (sin autoría): ningún registro, localidad, coordenada ni persona. Marca nombres mal escritos, sinónimos, nombres no reconocidos, familias distintas a la del catálogo, nombres de otro grupo y especies en categoría VU, EN o CR de la UICN. Es la única función que usa internet con los datos.
- Vuelve la interfaz oscura de la v26, con todo lo de las versiones 27 y 28.
- Teselas del mapa: Esri y OpenTopoMap; OpenStreetMap ya no se usa como proveedor de teselas.

## 0.28.0 — sin versión publicada por separado

La v28 interna no se conserva como archivo. Sus cambios llegaron en 0.29.0: verificación de nombres, cuatro exportaciones completas (Darwin Core .xlsx y .csv con todas las columnas originales, GeoJSON y correcciones) y el ajuste de la regla de los *Anolis* (familia Anolidae).

## 0.27.0 — 25 de septiembre de 2026

- **Capa "Para publicar en el SiB"**, tercera pestaña de la revisión, según el manual de la plantilla del SiB v4.0: elementos obligatorios según el origen de los datos, vocabularios controlados, coherencia entre `basisOfRecord` y `type`, formato de `institutionCode`, `occurrenceID` y fechas, nombres con cf., aff., sp. o autoría, y listas de personas mal separadas. Propone el valor donde el manual da la receta.
- Nueva regla: `eventDate` no coincide con `year`/`month`/`day`.
- Vocabularios corregidos según el manual (sexo: Hembra, Macho, Hermafrodita, Desconocido; etapa: Huevo, Larva); los años solos dejan de marcarse como error; "sp2 Nov." ya no cuenta como epíteto distinto; los `catalogNumber` repetidos se tratan como posible lote.
- **Seguridad**: una celda de altitud sin números se insertaba sin escapar; ahora todo lo que viene del archivo se muestra como texto.
- La exportación Darwin Core (.xlsx y .csv) conserva todas las columnas y valores originales; lo que calcula el visor va en una hoja aparte.
- Se arreglan las horas leídas como "1899-12-30", las fechas inventadas ("-01-01" a años solos), los ejemplares sin nombre científico que se descartaban, el corrimiento de fechas por huso horario y la lectura de más formatos de fecha.
- Arrastrar y soltar el archivo, manejo con teclado y números con punto de miles.
- Interfaz rediseñada ("colección de museo"); esa apariencia se sustituyó en 0.29.0.

## 0.26.0 — septiembre de 2026

- Paneles del mapa que se pueden mover y ocultar en escritorio; botón de capas.
- La ficha agrupa los campos secundarios en un bloque desplegable.
- La búsqueda encuentra códigos escritos de varias formas (`ABC-Re-0012`, `ABC Re 0012`).

## 0.25.0 — 21 de septiembre de 2026

- La capa de calles pasa de OpenStreetMap a Esri World Street Map, porque los servidores de OpenStreetMap bloquean las páginas abiertas con doble clic.
- El mapa tiene límites de zoom y un botón para volver a los datos.

## 0.24.0 — 21 de septiembre de 2026

- Pensada para abrirse desde el celular: el panel pasa a ser una hoja inferior, el panel de capas arranca cerrado, el mapa ocupa la pantalla completa y se respetan las zonas seguras de las pantallas.
- CSV, GeoJSON e informe quedan deshabilitados cuando no hay registros.
- El lector y las reglas no cambiaron.

## 0.23.0 — 20 de septiembre de 2026

- Librerías empaquetadas en `vendor/`: el visor ya no depende de ningún CDN y funciona sin conexión.
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
