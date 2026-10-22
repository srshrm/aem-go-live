import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Groups each heading with the content that follows it (until the next
 * heading or a CTA-only paragraph) into a feature item.
 * @param {Element} cell
 */
function groupFeatures(cell) {
  const nodes = [...cell.children];
  if (!nodes.some((el) => /^H[1-6]$/.test(el.tagName))) return;
  const list = document.createElement('div');
  list.className = 'columns-feature-list';
  let current = null;
  const trailing = [];
  nodes.forEach((el) => {
    const isHeading = /^H[1-6]$/.test(el.tagName);
    const isCta = el.classList.contains('button-wrapper')
      || (el.tagName === 'P' && el.querySelector('a') && el.textContent.trim() === el.querySelector('a').textContent.trim());
    if (isHeading) {
      current = document.createElement('div');
      current.className = 'columns-feature-item';
      current.append(el);
      list.append(current);
    } else if (isCta || !current) {
      current = null;
      trailing.push(el);
    } else {
      current.append(el);
    }
  });
  // leading intro content (before first heading) stays first, CTAs after the list
  const firstHeadingIdx = nodes.findIndex((el) => /^H[1-6]$/.test(el.tagName));
  const leading = trailing.filter((el) => nodes.indexOf(el) < firstHeadingIdx);
  const after = trailing.filter((el) => nodes.indexOf(el) > firstHeadingIdx);
  cell.replaceChildren(...leading, list, ...after);
}

/**
 * columns-feature: alternating 2-column feature rows
 * ([features + CTA | layered UI image], then [image | features + CTA]).
 * @param {Element} block
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-feature-row');
    const cells = [...row.children];
    cells.forEach((cell) => {
      const pictures = [...cell.querySelectorAll('picture')];
      const isImageCell = pictures.length && !cell.textContent.trim();
      if (isImageCell) {
        cell.classList.add('columns-feature-media');
        pictures.forEach((picture, idx) => {
          const img = picture.querySelector('img');
          const optimized = createOptimizedPicture(img.src, img.alt, false, [
            { media: '(min-width: 900px)', width: idx === 0 ? '1200' : '600' },
            { width: '750' },
          ]);
          optimized.classList.add(idx === 0 ? 'columns-feature-primary' : 'columns-feature-overlay');
          picture.replaceWith(optimized);
        });
        cell.querySelectorAll('p').forEach((p) => {
          if (!p.textContent.trim() && p.querySelector('picture')) p.replaceWith(...p.childNodes);
        });
        if (pictures.length > 1) cell.classList.add('columns-feature-layered');
      } else {
        cell.classList.add('columns-feature-text');
        groupFeatures(cell);
      }
    });
    // flag rows where the image comes first so the layout can mirror
    if (cells[0] && cells[0].classList.contains('columns-feature-media')) {
      row.classList.add('columns-feature-media-first');
    }
  });
}
