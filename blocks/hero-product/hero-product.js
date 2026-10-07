import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * True when a paragraph holds nothing but one or more links (a CTA row).
 * @param {Element} el
 */
function isCtaParagraph(el) {
  if (el.tagName !== 'P') return false;
  const links = [...el.querySelectorAll('a')];
  if (!links.length || el.querySelector('picture')) return false;
  const linkText = links.map((a) => a.textContent).join('').replace(/\s+/g, '');
  return linkText === el.textContent.replace(/\s+/g, '');
}

/**
 * hero-product: page-intro hero with text column (h1, copy, CTAs) and a
 * side product media column. Authors may put media and text in one cell,
 * separate cells, or separate rows; all are normalised.
 * @param {Element} block
 */
export default function decorate(block) {
  const media = document.createElement('div');
  media.className = 'hero-product-media';
  const content = document.createElement('div');
  content.className = 'hero-product-content';
  const actions = document.createElement('div');
  actions.className = 'hero-product-actions';

  [...block.children].forEach((row) => {
    const cells = row.children.length ? [...row.children] : [row];
    cells.forEach((cell) => {
      cell.querySelectorAll('picture').forEach((picture) => {
        const parent = picture.parentElement;
        media.append(picture);
        if (parent && parent !== cell && !parent.textContent.trim() && !parent.children.length) {
          parent.remove();
        }
      });
      [...cell.children].forEach((el) => {
        if (isCtaParagraph(el)) actions.append(el);
        else if (el.textContent.trim()) content.append(el);
      });
    });
  });

  // unformatted CTA links render as the secondary (glass) pill in this hero
  actions.querySelectorAll('p > a:not(.button)').forEach((a) => {
    a.classList.add('button', 'secondary');
    a.parentElement.classList.add('button-wrapper');
  });

  if (actions.children.length) content.append(actions);

  media.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 900px)', width: '1600' },
      { width: '750' },
    ]));
  });

  const children = [content];
  if (media.children.length) children.push(media);
  else block.classList.add('hero-product-no-media');
  block.replaceChildren(...children);
}
