import { readBlockConfig, toCamelCase, toClassName } from '../../scripts/aem.js';

/**
 * Applies section metadata to the parent section and removes the block.
 * `style` values become section classes; other keys become data attributes.
 * @param {Element} block The section-metadata block element
 */
export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    const meta = readBlockConfig(block);
    Object.entries(meta).forEach(([key, value]) => {
      if (key === 'style') {
        String(value)
          .split(',')
          .map((style) => toClassName(style.trim()))
          .filter(Boolean)
          .forEach((style) => section.classList.add(style));
      } else {
        section.dataset[toCamelCase(key)] = value;
      }
    });
  }

  const wrapper = block.parentElement;
  block.remove();
  if (wrapper && !wrapper.children.length) wrapper.remove();
}
