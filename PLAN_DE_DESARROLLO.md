# Plan de desarrollo: Identificador de especies de cangrejos (clave dicotómica interactiva)

Fuente de datos: *Guía FAO para la identificación de especies, Pacífico centro-oriental, Vol. I*, capítulo "Cangrejos" (`docs/38961.pdf`, desde la p. 566).

## 1. Visión

Página web que convierte las claves dicotómicas de la guía en un árbol de decisión interactivo. El usuario tiene un cangrejo (o su descripción), elige en cada paso la opción que corresponde a sus características, y el sistema lo lleva por el árbol hasta la familia, el género o la especie, mostrando la ficha del documento.

**No es un juego de adivinanza.** No hay puntajes ni motor probabilístico: el árbol se recorre nodo por nodo, igual que las claves impresas.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Recorrido | Clave paso a paso: una pareja de opciones por pantalla (1a/1b, 2a/2b…), con retroceso |
| Profundidad | Familia, género y especie donde el documento tenga clave. Donde no la haya, el resultado es la familia o el género con su lista de especies |
| Resultado | Ficha completa con el texto original del documento (nombre, nombres vernáculos, caracteres distintivos, talla, hábitat, pesca). Especies sin ficha: nombre, autor y código FAO |
| Historial | Panel lateral en escritorio con las opciones elegidas; permite volver a cualquier paso y corregir |
| Idioma y texto | El del documento, sin reescribir |
| Imágenes | Ninguna en v1. El usuario añadirá las suyas después (`imageUrl` opcional, espacio reservado en la UI) |
| Plataforma | Web, enfocada en escritorio, con layout responsivo fluido |
| Uso | Local; no se requiere permiso de la FAO |
| Stack | Vite + React + TypeScript + Motion. Datos en JSON estático, sin backend |
| Nombre | Provisional: "Identificador de Especies" |

## 3. Datos: lo que tiene el documento

- **Clave de familias** de Brachyura (1a/1b … hasta la familia).
- **Claves por familia**, solo en algunas: géneros, subfamilias y/o especies (Calappidae, Cancridae, Dorippidae, Gecarcinidae, Grapsidae, Majidae, Ocypodidae, Portunidae, Xanthidae…). Hay que inventariar cuáles existen exactamente.
- **Listas de especies** por familia (nombre, autor, a veces código FAO).
- **26 fichas completas** de especies (ya parseadas en `data/raw/fichas.json`).
- Las claves se apoyan en figuras (Fig. 1, 2…). En v1 no hay imágenes, así que el texto de la opción debe bastar. Hay que revisar los pasos que dependan solo de la figura.

### Modelo de datos

```ts
type KeyNode = {
  id: string;                 // "fam-1", "calappidae-gen-3"
  keyId: string;              // "familias", "calappidae-generos"...
  options: KeyOption[];       // normalmente 2 (a/b); puede haber más
};

type KeyOption = {
  label: string;              // "1a"
  text: string;               // texto original de la clave
  figureRef?: string;         // "Figs 2b, 4b"; sin imagen en v1
  next:
    | { type: "node"; nodeId: string }
    | { type: "taxon"; taxonId: string }; // familia, género o especie
};

type Taxon = {
  id: string;
  rank: "family" | "genus" | "species";
  scientificName: string;
  author?: string;
  faoCode?: string;
  parentId?: string;
  keyIdForChildren?: string;  // clave que sigue dentro de este taxón
  sheet?: {                   // ficha, si existe
    synonyms?: string;
    vernacular?: string;
    distinctive?: string;
    size?: string;
    habitat?: string;
    fisheries?: string;
  };
  childSpecies?: string[];    // lista para familias/géneros sin clave
  imageUrl?: string;
};
```

## 4. Fases

Cada fase es una sesión independiente con un entregable verificable.

### Fase 0: Preparación — HECHA
Proyecto Vite + React + TS, `motion` instalado, git inicializado, PDF en `docs/`.

### Fase 1: Extracción del texto — HECHA
Texto UTF-8 en `data/raw/`, y `fichas.json` con 26 fichas parseadas por `scripts/parse_fichas.py`. Quedan correcciones menores de OCR (por ejemplo "Sraith" por "Smith") para la Fase 2.

### Fase 2: Datos del árbol (la fase más pesada: una o dos sesiones) — HECHA
- Inventariar todas las claves del capítulo (familias, subfamilias, géneros, especies) y su página. Estimación: decenas de pasos en unas 8 claves.
- Transcribir cada clave a nodos y opciones (`KeyNode`), con el texto original y las referencias a figuras.
- Construir los taxones y enlazar fichas y listas de especies.
- Corregir el OCR de las fichas.
- Script de validación: todo `next` apunta a un nodo o taxón existente, no hay nodos huérfanos ni ciclos, cada clave llega a un resultado. También marca texto sospechoso: caracteres `�`, palabras partidas por guion de fin de línea y letras espaciadas.
- **Entregable:** `keys.json`, `taxa.json` y un reporte de validación.
- **Estado 2a (hecha):** las 8 claves del capítulo están transcritas en `data/src/claves.txt` (45 pasos, 90 opciones). `scripts/build_data.py` genera `data/keys.json`, `data/taxa.json` y `data/reporte.txt`, y `scripts/check_paths.py` recorre 8 rutas de prueba. Taxones: 20 familias, 26 géneros, 30 especies, 26 con ficha. La validación no tiene errores.
- **Estado 2b (casi hecha):** los 4 enlaces inferidos fueron confirmados por el usuario. Las listas de especies por familia se extraen con `scripts/parse_listas.py` y se integran con `scripts/merge_listas.py` (orden: `build_data.py`, luego `merge_listas.py`). Total: 336 taxones. La lista de Xanthidae de las pp. 633-634 se transcribió a mano desde la imagen de la página (`data/src/xanthidae_pp633-634.txt`) porque el OCR omitía especies.
- **Revisión de listas contra las imágenes (hecha):** Ocypodidae (p. 615): se añadieron *Uca festae*, *Uca musica musica* y *Uca musica terpsichores*, que el OCR omitía; total 37 especies. Portunidae (p. 621): las 16 especies coinciden con la lista impresa; el documento declara 18 pero solo imprime 16. Códigos FAO de *Callinectes* corregidos ("Call", no "Cali"). Grapsidae (p. 603): corregidos *Euchirograpsus americanus* y *Goetice americanus*.
- **Limpieza de fichas (hecha):** `scripts/parse_fichas.py` ahora corta cada ficha donde empieza el texto de la familia siguiente (encabezados, claves, listas), reconoce rótulos con letras espaciadas, une las letras espaciadas, quita los rótulos de figuras de los nombres vernáculos, normaliza la salinidad a ‰ y quita símbolos de figuras. *Menippe frontalis* se transcribió a mano desde la imagen (`data/src/fichas_manuales.json`), así que hay 27 fichas. Lo que el script deja sospechoso queda en `data/raw/fichas_revision.txt` (2 avisos, ambos legítimos: fichas largas). El texto "Otras especies presentes en el área" de *Euphylax robustus* (especies de interés marginal de Portunidae) se guardó aparte en `data/raw/otras_especies.json` para usarlo más adelante.
- **Nota:** las familias sin clave de especies (Majidae, Xanthidae y otras) terminan en la lista de especies, no en una especie única.

### Fase 3: Motor del árbol — HECHA
- Lógica de navegación: nodo actual, historial de elecciones, retroceso, salto a un paso anterior, reinicio y entrada a la clave de un taxón.
- Tests unitarios que recorran rutas completas (por ejemplo, familia → género → especie).
- **Entregable:** módulo `engine/` probado, sin UI.
- **Estado:** `src/engine/` (`types.ts`, `engine.ts`, `engine.test.ts`) con 13 tests que pasan (`npm test`). El motor lee `data/keys.json` y `data/taxa.json` directamente. La sesión es inmutable: `start`, `choose`, `enterKey`, `back`, `goTo`, `reset`, `result`, `path`. La clave de familias llega a las 20 familias del documento.

### Fase 4: UI base — HECHA
- Pantallas: inicio, paso de la clave (opciones a/b), resultado (ficha), lista de especies cuando no hay clave.
- Panel lateral con el camino recorrido; clic en un paso para volver.
- **Entregable:** flujo completo funcional de punta a punta.
- **Estado:** `src/App.tsx` y `src/components/` (`StepView`, `ResultView`, `TaxonSheet`, `HistoryPanel`). Pantalla de inicio, pasos con opciones, resultado con ficha y clasificación, botón para continuar a la clave de la familia o género, lista de especies cuando no hay clave (con ficha al hacer clic), panel lateral con el camino y salto a cualquier paso, retroceso y reinicio. Estilos funcionales y neutros; el diseño real es de la Fase 5. 4 tests de interfaz (`src/App.test.tsx`) cubren el flujo; 17 tests en total. Para verla: `npm run dev`.

### Fase 5: Diseño y animación — EN CURSO: el usuario descartó el primer diseño y pidió 4 alternativas para elegir
- Dirección visual propia (temática marina), tipografía, paleta, componentes.
- Opciones grandes y legibles, ficha del resultado bien jerarquizada, espacio reservado para imágenes.
- Transiciones entre pasos, aparición de opciones, entrada del panel de historial y animación del resultado, respetando `prefers-reduced-motion`.
- Layout fluido por CSS, enfocado en escritorio.
- **Entregable:** interfaz pulida y fluida en escritorio.
- **Estado:** paleta tomada de los cangrejos de la guía (niebla de playa `#e6ecea`, tinta verde-azulada, agua `#2b6e6b`, caparazón rojo-púrpura `#8c2f4b`, mancha amarilla `#d8a31e`). Tipografía: Literata (texto y nombres científicos en cursiva) y Archivo con eje de anchura (títulos y etiquetas), instaladas localmente con `@fontsource-variable`. El camino recorrido es un riel vertical a la izquierda; al elegir una opción, su etiqueta (1b, 2a…) viaja desde la tarjeta hasta el riel (animación de layout compartido de Motion). En el resultado, la clasificación aparece en secuencia y el nombre científico se revela de izquierda a derecha. Se respeta `prefers-reduced-motion`. Revisado con capturas en Chrome a 1440 px y 820 px. También se corrigieron ~20 errores de OCR que quedaban en las fichas (`data/src/ocr_correcciones.json`).

### Fase 6: Verificación y cierre — HECHA
- Teclado, foco visible y contraste básico.
- Verificación manual de rutas contra el PDF.
- **Criterio de aceptación:** una persona identifica correctamente, usando solo la app, 5 especies conocidas con ficha.
- README con instrucciones para correrlo en local y créditos a la FAO y a los autores.
- **Entregable:** proyecto listo para usar en local.
- **Estado:** `src/engine/reachability.test.ts` recorre todas las rutas de todas las claves (20 familias alcanzables; todos los taxones se alcanzan por la clave o por la lista de un resultado; 5 rutas conocidas coinciden con el PDF). `src/ui/contrast.test.ts` comprueba el contraste WCAG AA en claro y oscuro (el acento claro se oscureció a `#cc4310` para llegar a 4.8:1). `src/App.test.tsx` identifica 5 especies conocidas solo con clics. Teclado verificado en Chrome (el foco pasa a la nueva pregunta tras cada elección y al nombre en el resultado). README con instrucciones, estructura, imágenes y créditos. 39 tests, lint y build sin errores.
- **Comparación ampliada con el PDF:** `scripts/verify_pdf.py` (texto de opciones 88/90, fichas 139/139, especies 223/229; los avisos restantes son maquetación u OCR) y revisión visual de las 8 claves contra imágenes de las páginas (todas las flechas coinciden). Se añadieron subfamilias de Grapsidae con sus géneros y nota, y tests de cifras del documento (`src/engine/pdf-data.test.ts`). 52 tests en total.
- **Fichas comparadas en imagen:** las 27 fichas se leyeron contra la imagen de su página (`data/verificacion_visual.txt`); se corrigieron unas 40 diferencias de OCR y de texto ajeno, y el género pasó a escribirse `Cancer` como en el documento. 56 tests (los cambios quedan fijados en `src/engine/pdf-data.test.ts`).

### Después de v1
- Añadir las imágenes propias del usuario (figuras de las claves y fotos de especies).
- Modo de filtro libre por características.
- Más capítulos del volumen.
- Elegir nombre definitivo.

## 5. Dependencias

`2 → 3 → 4 → 5 → 6`. La Fase 4 puede avanzar con una clave de ejemplo mientras termina la 2, pero no conviene pulir el diseño antes de conocer la forma real de las claves.

## 6. Riesgos

- Claves que dependen de figuras (unas 116 referencias en el capítulo): sin imágenes, algunas opciones pueden ser difíciles de decidir. Es el mayor riesgo de usabilidad. Se muestra siempre la referencia a la figura y el texto del documento, y añadir imágenes es la primera prioridad tras v1.
- Calidad del OCR en claves largas y con columnas: la transcripción requiere revisión manual.
- Familias sin clave de especies: el resultado será la lista de especies, no una especie única.


## 7. Fase 5: diseño elegido, "Foco y mapa", con tema claro y oscuro

El usuario eligió la variante **Foco y mapa**: la decisión actual se ve grande a la izquierda y el árbol completo queda como mapa a la derecha. Las otras tres variantes y la barra de comparación se eliminaron.

- **Conexiones que encajan:** `src/ui/treeLinks.ts` mide la posición real de cada tarjeta y traza cada curva de borde a borde, con un punto en cada extremo.
- **Espacio para imágenes:** cada tarjeta y la ficha reservan su recuadro (`OptionMedia`, `TaxonMedia` en `src/ui/tree.tsx`). Se registran en `src/data/images.ts` (instrucciones dentro del archivo) con los archivos en `public/img/`.
- **Árbol real:** en cada paso recorrido se ven las dos ramas; la elegida marcada y la otra atenuada. Un clic en la descartada vuelve a ese paso y toma esa rama.
- **Tema claro y oscuro:** botón en la cabecera; arranca según el sistema (`prefers-color-scheme`) y recuerda la elección. Los colores son variables CSS en `src/ui/ui.css`.
- **Paleta elegida: Grafito** (grises y naranja). Claro: fondo `#f1f2f5`, acento `#e8501a`, camino `#ffb020`. Oscuro: fondo `#0f1115`, acento `#ff7a45`. Las otras tres paletas y la barra de selección se eliminaron.
- **Regla de color del texto:** todo el texto es negro (modo claro) o blanco (modo oscuro). El color se reserva para encabezados, etiquetas y acentos. No hay texto gris ni ramas atenuadas con opacidad; lo descartado se distingue por el borde punteado.

Estado: 20 tests pasan; se revisaron capturas en claro y oscuro en Chrome sin errores de consola.
