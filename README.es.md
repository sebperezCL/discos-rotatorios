# Generador de discos rotatorios

[English](README.md) · **Español**

App web estática (sin servidor) que convierte una ilustración de línea en un disco plantilla giratorio ("doodle disc") listo para imprimir en 3D, con los números en otro color.

## Uso

Abre `index.html` en Chrome, Edge o Firefox (doble clic basta, no necesita servidor). Elige una imagen de línea negra sobre fondo blanco, ajusta los parámetros y descarga:

- **3MF multicolor (AMS)**: un objeto con dos piezas, `Disco` (filamento 1) y `Numeros` (filamento 2).
- **3MF con cambio por capa**: una sola pieza con un cambio de filamento en la primera capa de sólo números, igual que los Doodle Disc de MakerWorld. Para impresoras sin AMS.

  Usa Bambu Studio 02.08.03 o posterior. La versión 02.08.02 tiene un bug: cualquier 3MF sin perfil de impresión propio muestra "The 3mf file has invalid config, load geometry data only" y descarta el cambio de filamento por capa.

- **STL** del disco y de los números por separado, y **SVG** de la vista superior.

La interfaz está en inglés y español. Sigue el idioma del navegador y se puede cambiar con el selector de la esquina superior derecha (la elección se recuerda). Los nombres de piezas y archivos descargados siguen el idioma elegido.

## Cómo funciona

1. `js/vectorize.js`: umbral → limpieza → (rellenos a contorno) → esqueleto Zhang-Suen → grafo → polilíneas suavizadas.
2. `js/layout.js`: coloca el dibujo en el disco (por defecto prueba arriba, abajo y a los lados del centro, con el mayor tamaño que deja libre el centro, y lo achica un poco si algo no cabe), une cadenas en los cruces, corta en trozos de largo máximo y busca para cada trozo un giro del disco en el que su ranura no toque ninguna otra (respetando el puente mínimo) y donde quepa su número. «Máx. ranuras por número» limita cuántas ranuras comparten una posición (0 = sin límite, 1 = una por número como el Dog Man). Prueba varias estrategias y se queda con la mejor.
3. `js/geometry.js`: con Clipper hace las ranuras (polilínea engrosada), resta del disco, dibuja los números con una tipografía de trazo propia, las muescas del borde y el marco de referencia, y extruye todo a mallas cerradas (earcut).
4. `js/export.js`: escribe el 3MF con la misma estructura que Bambu Studio, STL binario y SVG.
5. `js/app.js`: interfaz, vistas previas y simulación posición por posición.
6. `js/i18n.js`: textos de la interfaz en inglés y español.

Medidas por defecto tomadas del modelo [Dog Man de MakerWorld](https://makerworld.com/en/models/1809617-doodle-disc-22-dog-man#profileId-1930373) (120 mm, cuerpo 0,8 mm, números en relieve 0,32 mm, ranuras de 1,25 mm): aquí 120 mm, cuerpo 0,84 mm (cuadra con capas de 0,2 + 0,16), números 0,32 mm, ranuras 1,3 mm, puente 1,5 mm.

Los números miden 4 mm de alto con trazo de 0,9 mm (dos líneas de una boquilla de 0,4 mm) para que se lean bien impresos. El 1 lleva base y el 9 tiene el palo recto, así que ningún número se confunde con otro dado vuelta. Cada número queda al menos 1,5 mm («Holgura de los números») más lejos de las otras ranuras que de la suya, para que se vea claro a cuál pertenece. Si no hay sitio, como último recurso se usa un número algo más pequeño.

## Convenciones

- Coordenadas en mm, y hacia arriba, origen en el centro del disco.
- Si el disco está girado θ (antihorario), la ranura de un trozo asignado a θ es `R(-θ)·trozo`; su muesca está en el ángulo `90° − θ` y queda arriba frente a la marca del soporte.
- Las posiciones se numeran para que girando el disco en sentido horario aparezcan 1, 2, 3…

Librerías incluidas en `lib/`: Clipper (Angus Johnson, licencia Boost) y earcut (Mapbox, ISC).
