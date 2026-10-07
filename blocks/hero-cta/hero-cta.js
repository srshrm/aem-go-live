import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * hero-cta: closing call-to-action with centred headline + CTA over a
 * full-bleed background image. Authored as [background image] then
 * [h2 + CTA link]; image and text may also share a cell.
 * @param {Element} block
 */
export default function decorate(block) {
  const background = document.createElement('div');
  background.className = 'hero-cta-background';
  const content = document.createElement('div');
  content.className = 'hero-cta-content';

  [...block.children].forEach((row) => {
    const cells = row.children.length ? [...row.children] : [row];
    cells.forEach((cell) => {
      cell.querySelectorAll('picture').forEach((picture) => {
        const parent = picture.parentElement;
        background.append(picture);
        if (parent && parent !== cell && !parent.textContent.trim() && !parent.children.length) {
          parent.remove();
        }
      });
      [...cell.children].forEach((el) => {
        if (el.textContent.trim()) content.append(el);
      });
    });
  });

  background.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '750' },
    ]));
  });

  const children = [];
  if (background.children.length) children.push(background);
  else block.classList.add('hero-cta-no-media');
  children.push(content);
  block.replaceChildren(...children);
}
