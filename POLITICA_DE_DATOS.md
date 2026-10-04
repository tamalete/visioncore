# Política de datos

VisionCore trabaja con datos de colecciones biológicas. Esos datos tienen dueño y algunos tienen riesgo. Estas son las reglas de este repositorio.

## 1. Aquí no entran datos reales

Este repositorio contiene **código y un archivo de ejemplo inventado**. Nunca debe entrar:

- Archivos Darwin Core de la colección de la UPTC ni de ninguna otra colección.
- Archivos de colectores particulares (los de Güepsa, Garagoa y Susacón usados en las pruebas piloto).
- Informes de calidad, CSV de correcciones o exportaciones que contengan números de catálogo, coordenadas o nombres de personas reales.
- Capturas de pantalla donde se alcancen a leer registros reales.

`.gitignore` bloquea las extensiones y nombres más obvios, pero **no reemplaza la revisión antes de cada commit**: `git status` antes de `git add`, siempre.

Si algo así llega a entrar por error, borrarlo en un commit posterior **no lo saca del historial**: queda accesible para siempre. Habría que reescribir el historial (`git filter-repo`) y forzar el push, y aun así podrían quedar copias en los forks. Por eso la revisión es antes, no después.

## 2. Los datos de las pruebas no son míos

Las bases con las que se probó el visor pertenecen a sus colectores y a la colección de la UPTC. Usarlas para probar no da derecho a publicarlas, ni a mostrarlas fuera del contexto para el que se prestaron. El crédito en una diapositiva no reemplaza una autorización.

**Pendiente:** permiso escrito del responsable de la colección de la UPTC, y de cada colector por su base, indicando para qué se pueden usar y cómo quieren ser citados.

## 3. Localidades sensibles

Hay especies amenazadas cuya ubicación exacta no debe publicarse: la coordenada precisa de una población de una especie traficada es información útil para quien la trafica. VisionCore **todavía no** generaliza ni oculta esas coordenadas: hoy muestra lo que traiga el archivo.

Mientras esa función no exista, antes de publicar un conjunto de datos hay que revisar a mano qué especies del archivo están en alguna categoría de amenaza y generalizar sus coordenadas, dejando constancia en los campos `informationWithheld` y `dataGeneralizations` de Darwin Core, que existen justo para eso.

*(Por verificar antes de citarla en cualquier documento: la resolución colombiana vigente que lista las especies silvestres amenazadas y su categoría.)*

## 4. Lo que el programa hace con los datos de quien lo use

Los registros que se cargan se procesan en el navegador de esa persona: no se envían a ningún servidor, no se guardan (el visor no usa `localStorage`, `sessionStorage` ni IndexedDB) y no hay analítica. Al cerrar la pestaña no queda rastro.

Hay exactamente dos salidas a internet:

- **Teselas del mapa** (Esri y OpenTopoMap): esos servidores reciben el área que se está mirando, no los registros.
- **Verificación de nombres con el Catalogue of Life, a través de la API de GBIF** (`api.gbif.org`): ocurre **solo si la persona pulsa el botón**. Se envían únicamente los nombres científicos distintos del archivo (sin autoría), uno por consulta. No se envían registros, localidades, coordenadas, fechas ni nombres de personas, números de catálogo ni identificadores. GBIF, como cualquier servidor web, puede registrar la dirección IP y la hora de la consulta bajo sus propias condiciones. Un nombre científico es dato público, pero una lista de nombres puede revelar qué especies hay en una colección o proyecto; si eso es sensible, no se debe pulsar el botón.

Si esto cambiara alguna vez (por ejemplo, para enviar algo más), tendría que decirse aquí y en el README antes de publicar la versión que lo cambie.
