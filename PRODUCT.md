# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React + TypeScript + Vite + Motion, datos en JSON estático, sin backend. Decidido por el usuario.

## Users
Personas que tienen un cangrejo del Pacífico centro-oriental (o su descripción) y quieren saber qué es. Público general sin definir: puede incluir estudiantes, pescadores o biólogos. Uso en escritorio, en local.

## Product Purpose
Convertir las claves dicotómicas de la Guía FAO para la identificación de especies (Pacífico centro-oriental, vol. I, capítulo Cangrejos) en un árbol de decisión interactivo. El usuario elige en cada paso la opción que describe a su cangrejo y llega a la familia, el género o la especie, con su ficha. No es un juego de adivinanza.

## Positioning
Es la clave oficial de la guía FAO, con su texto original, navegable paso a paso y con retroceso.

## Capabilities and Constraints
- Solo cangrejos (Brachyura) del documento; 8 claves, 20 familias, 339 taxones, 27 fichas completas.
- El texto es el del documento, sin reescribir.
- Sin imágenes en v1 (el usuario añadirá las suyas después); las claves citan figuras que no se muestran.
- Familias sin clave de especies terminan en una lista de especies.
- Uso local; no se publica.
- Nombre provisional: "Identificador de Especies".

## Brand Commitments
Sin marca definida. El usuario descartó un primer diseño (niebla, tinta verde-azulada, serif, rojo-púrpura) y pidió cuatro direcciones nuevas, creativas, modernas y fáciles de entender, para elegir.

## Evidence on Hand
Texto completo del capítulo en `docs/38961.pdf` y datos en `data/`. No hay fotos ni ilustraciones propias todavía.

## Product Principles
- El texto de la guía manda: el diseño lo hace legible, no lo reescribe.
- Una decisión por pantalla, con retroceso siempre disponible.
- El camino recorrido siempre visible y corregible.
- Que se vea bien sin imágenes, y deje espacio para añadirlas.

## Accessibility & Inclusion
Navegación por teclado, foco visible, contraste suficiente y `prefers-reduced-motion` respetado.
