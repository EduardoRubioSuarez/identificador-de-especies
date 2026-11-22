# Identificador de Especies

Clave de identificación interactiva de **cangrejos del Pacífico centro-oriental**. Convierte las claves dicotómicas de la *Guía FAO para la identificación de especies para los fines de la pesca. Pacífico centro-oriental, Volumen I* (capítulo "Cangrejos") en un árbol de decisión: en cada paso eliges, entre dos descripciones, la que corresponde a tu cangrejo, hasta llegar a la familia, el género o la especie, con su ficha.

Uso local. El texto de las claves y las fichas es el del documento, sin reescribir.

## Cómo usarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev       # abre la aplicación en el navegador (http://localhost:5173)
npm test          # pruebas
npm run build     # versión para publicar, en dist/
```

- **Recorrido:** elige una de las dos tarjetas de cada paso. El mapa de la derecha ("Tu árbol") muestra las dos ramas de cada decisión; la elegida va en amarillo y la descartada con borde punteado. Un clic en una rama del mapa vuelve a ese paso; en una rama descartada, cambia de camino.
- **Teclado:** todo se puede usar con Tab, Enter y Mayús+Tab. Tras cada elección, el foco pasa a la nueva pregunta.
- **Pantalla principal:** título y el botón "Identificar cangrejos", que lleva al sistema. Dentro del sistema, el título "Identificador de Especies" es un botón que vuelve a ella.
- **Tema claro y oscuro:** interruptor "Tema oscuro" (arriba a la derecha, también en la pantalla principal). Empieza según el modo de tu sistema y recuerda tu elección.

## Qué contiene

- 8 claves (familias, y géneros o especies de Calappidae, Cancridae, Dorippidae, Gecarcinidae, Grapsidae, Ocypodidae y Portunidae), con 45 pasos.
- 20 familias, 339 taxones y 27 fichas completas. Las familias sin clave de especies (por ejemplo Majidae y Xanthidae) terminan en la lista de especies del documento.
- Las claves citan figuras (Fig. 1, 2…) que aún no se muestran. Las imágenes son propias y se añaden después (ver abajo).

## Añadir imágenes

Cada tarjeta, medallón del mapa y ficha ya reserva su espacio. Para mostrar una imagen:

1. Copia el archivo a `public/img/`, por ejemplo `public/img/familias-1a.jpg`.
2. Regístralo en `src/data/images.ts`:
   - opciones de la clave: `'familias:1a': '/img/familias-1a.jpg'` (formato `idClave:etiqueta`);
   - especies y demás taxones: `'Hepatus lineatus': '/img/hepatus-lineatus.jpg'` (nombre científico).

## Estructura

```
docs/38961.pdf          documento original de la FAO (no se sube al repositorio; colócalo aquí para regenerar los datos)
data/src/               transcripción de las claves y correcciones hechas a mano
data/*.json             datos que usa la aplicación (keys.json, taxa.json)
scripts/                extracción y generación de los datos (Python)
src/engine/             motor de navegación del árbol (sin interfaz) y sus pruebas
src/ui/                 interfaz: vista, mapa del árbol, ficha, estilos y colores
src/data/images.ts      imágenes propias
PLAN_DE_DESARROLLO.md   plan y decisiones del proyecto
```

### Regenerar los datos

Solo hace falta si se corrige la transcripción (`data/src/claves.txt`) o las fichas. Requiere Python 3 y `pdftotext` (poppler).

```bash
pdftotext -enc UTF-8 -layout docs/38961.pdf data/raw/cangrejos_layout.txt
python -I scripts/parse_fichas.py     # fichas de especies
python -I scripts/parse_listas.py     # listas de especies por familia
python -I scripts/build_data.py       # claves y taxones; valida el árbol y escribe data/reporte.txt
python -I scripts/merge_listas.py     # integra las listas en taxa.json
```

## Comparación con el PDF

`python scripts/verify_pdf.py` (requiere `pip install rapidfuzz`) compara el texto de cada opción, cada destino, cada sección de ficha y cada especie con el texto del PDF y escribe `data/verificacion.txt`. La revisión hecha a mano contra las imágenes de las páginas está en `data/verificacion_visual.txt`.

## Pruebas

`npm test` comprueba, entre otras cosas, que:

- todas las opciones de todas las claves llevan a un paso o taxón que existe y no hay ciclos;
- las 20 familias y todos los taxones se alcanzan desde la raíz;
- cinco rutas de especies conocidas coinciden con la clave impresa;
- la interfaz recorre la clave completa, cambia de rama y de tema;
- los colores cumplen el contraste WCAG AA en claro y oscuro.

## Créditos

Texto, claves y fichas: Fischer, W.; Krupp, F.; Schneider, W.; Sommer, C.; Carpenter, K.E.; Niem, V.H. (eds.). *Guía FAO para la identificación de especies para los fines de la pesca. Pacífico centro-oriental. Volumen I. Plantas e invertebrados.* Roma, FAO, 1995. Capítulo "Cangrejos", por M.E. Hendrickx. © FAO 1995.

El documento original no puede reproducirse sin autorización de la FAO; este proyecto es de uso local.
