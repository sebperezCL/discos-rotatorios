# Rotating disc generator

**English** · [Español](README.es.md)

A static web app (no server) that turns a line illustration into a rotating stencil disc ("doodle disc") ready for 3D printing, with the numbers in a second color.

## Usage

Open `index.html` in Chrome, Edge or Firefox (double-clicking it is enough, no server needed). Pick a black-line-on-white image, adjust the parameters and download:

- **Multicolor 3MF (AMS)**: one object with two parts, `Disc` (filament 1) and `Numbers` (filament 2).
- **3MF with layer change**: a single part with a filament change at the first numbers-only layer, just like the Doodle Discs on MakerWorld. For printers without AMS.

  Use Bambu Studio 02.08.03 or newer. Version 02.08.02 has a bug: any 3MF without its own print profile triggers "The 3mf file has invalid config, load geometry data only" and the filament change by layer is dropped.

- **STL** files for the disc and the numbers separately, and an **SVG** of the top view.

The interface is available in English and Spanish. It follows the browser's language and can be switched from the selector in the top-right corner (the choice is remembered). Part and file names in the downloads follow the selected language.

## How it works

1. `js/vectorize.js`: threshold → cleanup → (fills to outline) → Zhang-Suen skeleton → graph → smoothed polylines.
2. `js/layout.js`: places the drawing on the disc (by default it tries above, below and to the sides of the center, at the largest size that keeps the center free, and shrinks it a little if something doesn't fit), joins chains at crossings, cuts them into pieces of a maximum length and, for each piece, looks for a disc rotation where its slot doesn't touch any other (respecting the minimum bridge) and where its number fits. "Max. slots per number" limits how many slots share a position (0 = no limit, 1 = one per number, like Dog Man). It tries several strategies and keeps the best one.
3. `js/geometry.js`: uses Clipper to build the slots (thickened polylines), subtracts them from the disc, draws the numbers with a custom stroke font, the rim notches and the reference frame, and extrudes everything into closed meshes (earcut).
4. `js/export.js`: writes the 3MF with the same structure as Bambu Studio, binary STL and SVG.
5. `js/app.js`: interface, previews and position-by-position simulation.
6. `js/i18n.js`: interface texts in English and Spanish.

Default measurements are taken from the [Dog Man model on MakerWorld](https://makerworld.com/en/models/1809617-doodle-disc-22-dog-man#profileId-1930373) (120 mm, 0.8 mm body, 0.32 mm raised numbers, 1.25 mm slots): here 120 mm, 0.84 mm body (matches 0.2 + 0.16 layers), 0.32 mm numbers, 1.3 mm slots, 1.5 mm bridge.

The numbers are 4 mm tall with a 0.9 mm stroke (two lines of a 0.4 mm nozzle) so they stay legible when printed. The 1 has a base and the 9 a straight stem, so no number reads as another one upside down. Each number is placed at least 1.5 mm ("Number clearance") farther from other slots than from its own, so it's clear which slot it belongs to. When there's no room, a slightly smaller number is used as a last resort.

## Conventions

- Coordinates in mm, y pointing up, origin at the center of the disc.
- If the disc is rotated by θ (counterclockwise), the slot of a piece assigned to θ is `R(-θ)·piece`; its notch sits at angle `90° − θ` and ends up at the top, facing the holder's mark.
- Positions are numbered so that turning the disc clockwise shows 1, 2, 3…

Libraries bundled in `lib/`: Clipper (Angus Johnson, Boost license) and earcut (Mapbox, ISC).
