import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * cards-bento: equal feature cards with UI illustration on top and centred
 * title + description below. Each authored row is one card: [image | text].
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-bento-card';
    const image = document.createElement('div');
    image.className = 'cards-bento-card-image';
    const body = document.createElement('div');
    body.className = 'cards-bento-card-body';

    [...row.children].forEach((cell) => {
      cell.querySelectorAll('picture').forEach((picture) => {
        const parent = picture.parentElement;
        image.append(picture);
        if (parent && parent !== cell && !parent.textContent.trim() && !parent.children.length) {
          parent.remove();
        }
      });
      [...cell.children].forEach((el) => {
        if (el.textContent.trim()) body.append(el);
      });
    });

    if (image.children.length) li.append(image);
    if (body.children.length) li.append(body);
    if (li.children.length) ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });

  block.replaceChildren(ul);
}
