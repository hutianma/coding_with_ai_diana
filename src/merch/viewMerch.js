// Pick up a badge, polaroid or card sleeve and look at it closely
import { openViewer } from '../cards/CardViewer.js';
import { createCardSleeve, sleeveName, sleeveRatio } from './CardSleeve.js';
import { createCharmSwing } from './charmSwing.js';
import { createBadge, createBadgeBack, badgeName } from './Badge.js';
import { createPolaroid, createPolaroidBack, polaroidName, polaroidRatio } from './Polaroid.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// cards: { id: card } (a sleeve shows the card inside it)
export function openMerchViewer(item, from, { cards = {} } = {}) {
  if (item.kind === 'sleeve') return openSleeveViewer(item, from, cards[item.cardId]);
  if (item.kind === 'badge') {
    const front = createBadge(item, { live: !reducedMotion.matches });
    const shaker = front.shaker; // only badges with a 流麻 fill
    shaker?.start(); // the pieces keep sinking after you pick it up
    // Screen px → the fill's canvas px (the canvas is bigger than the badge on screen).
    // Measured once (not on every move, which would force extra layout work).
    let scale = 0;
    const toCanvas = () => (scale ||= front.querySelector('.badge__fill').width / front.getBoundingClientRect().width);
    return openViewer({
      name: badgeName(item),
      shape: 'badge',
      front,
      back: createBadgeBack(item),
      from,
      onGravity: shaker ? (x, y) => shaker.setGravity(x, y) : null,
      onShake: shaker ? (dx, dy) => { const s = toCanvas(); shaker.push(dx * s, dy * s); } : null,
      dragShakes: Boolean(shaker), // drag the badge around to slosh the pieces (tap or Flip turns it over)
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

// A sleeve: tilt to make it shine and its charm swing; flip it to see the back
function openSleeveViewer(item, from, card) {
  const front = createCardSleeve(item, card);
  const back = createCardSleeve(item, card, { side: 'back' });
  front.removeAttribute('role');
  back.removeAttribute('role');
  const charms = [front, back].map((el) => el.querySelector('.card-sleeve__charm')).filter(Boolean);
  const swing = charms.length && !reducedMotion.matches ? createCharmSwing(charms) : null;
  return openViewer({
    name: sleeveName(item),
    shape: 'sleeve',
    ratio: sleeveRatio(item),
    front,
    back,
    from,
    onGravity: swing ? (x, y) => swing.setGravity(x, y) : null,
    onShake: swing ? (dx) => swing.push(dx) : null,
    onClose: () => { if (swing) swing.stop(); },
  });
}
