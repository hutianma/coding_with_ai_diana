// Pick up a badge or polaroid from the shelf and look at it closely
import { openViewer } from '../cards/CardViewer.js';
import { createBadge, createBadgeBack, badgeName } from './Badge.js';
import { createPolaroid, createPolaroidBack, polaroidName, polaroidRatio } from './Polaroid.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function openMerchViewer(item, from) {
  if (item.kind === 'badge') {
    const front = createBadge(item, { live: !reducedMotion.matches });
    const shaker = front.shaker; // only badges with a 流麻 fill
    shaker?.start(); // the pieces keep sinking after you pick it up
    return openViewer({
      name: badgeName(item),
      shape: 'badge',
      front,
      back: createBadgeBack(item),
      from,
      onGravity: shaker ? (x, y) => shaker.setGravity(x, y) : null,
      buttons: shaker ? [{ label: 'Shake ✨', onClick: () => shaker.shake() }] : [],
      onClose: () => shaker?.stop(),
    });
  }

  return openViewer({
    name: polaroidName(item),
    shape: 'polaroid',
    ratio: polaroidRatio(item),
    front: createPolaroid(item),
    back: createPolaroidBack(item),
    from,
  });
}
