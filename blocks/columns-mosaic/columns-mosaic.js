import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * columns-mosaic: image collage of N columns (typically 5) with stacked,
 * vertically staggered photos and a larger centre device mockup.
 * Authored as one row: [2 photos | 2 photos | phone | 2 photos | 2 photos].
 * Extra rows are merged column-by-column.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const columnCount = Math.max(...rows.map((r) => r.children.length), 0);
  const grid = document.createElement('div');
  grid.className = 'columns-mosaic-grid';
  const centerIdx = Math.floor((columnCount - 1) / 2);

  for (let i = 0; i < columnCount; i += 1) {
    const col = document.createElement('div');
    col.className = 'columns-mosaic-col';
    if (columnCount % 2 === 1 && i === centerIdx) col.classList.add('columns-mosaic-center');
    // distance from the centre drives stagger + responsive hiding
    const distance = Math.abs(i - (columnCount - 1) / 2);
    col.dataset.distance = Math.ceil(distance);
    if (i % 2 === 1) col.classList.add('columns-mosaic-offset');

    rows.forEach((row) => {
      const cell = row.children[i];
      if (!cell) return;
      cell.querySelectorAll('picture > img').forEach((img) => {
        const isCenter = col.classList.contains('columns-mosaic-center');
        const item = document.createElement('div');
        item.className = 'columns-mosaic-item';
        item.append(createOptimizedPicture(img.src, img.alt, false, [{ width: isCenter ? '600' : '400' }]));
        col.append(item);
      });
    });

    if (col.children.length) grid.append(col);
  }

  block.classList.add(`columns-mosaic-${grid.children.length}-cols`);
  block.replaceChildren(grid);
}
