// Pick something up (a photocard, badge or polaroid): it lifts out of its place, and you
// can flip it to see the back and tilt it to make the surface shine. Only this one item
// is animated.
import { createCard, cardName, finishOf } from './Card.js';
import { createCardBack, DEFAULT_BACK } from './CardBack.js';
import { screenGravity, screenAcceleration } from '../merch/motion.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const MAX_TILT = 14; // degrees
let motionAllowed = false; // iPhone asks once per visit before sharing the phone's tilt

// card: the card to show. from: the card element in the binder (where it lifts from).
export function openCardViewer(card, from) {
  const front = createCard(card);
  front.removeAttribute('role');
  front.removeAttribute('aria-label');
  return openViewer({
    name: cardName(card),
    front,
    back: createCardBack(card.back ?? { ...DEFAULT_BACK, text: 'Sample' }),
    finish: finishOf(card),
    from,
  });
}

// name: what screen readers call it. front / back: the two sides (elements).
// shape: 'card' | 'badge' | 'polaroid' (sets the size and corners).
// finish: 'matte' | 'glossy' | 'holo'. from: the element it lifts out of.
// ratio: width / height of the item, for shapes that vary (polaroids).
// Shaker badges:
//   onGravity(x, y): which way is down on the screen (from the phone's sensors or the mouse)
//   onShake(dx, dy): the item was moved by (dx, dy) screen px — by the phone shaking or a finger
//   dragShakes: dragging moves the item around (and shakes it) instead of turning it over
// buttons: extra [{ label, onClick }] shown next to Flip. onClose: called when put back.
export function openViewer({ name, front: frontContent, back: backContent, shape = 'card', ratio = null, finish = 'glossy', from = null, onGravity = null, onShake = null, dragShakes = false, buttons = [], onClose = null }) {
  const dialog = document.createElement('dialog');
  dialog.className = `viewer viewer--shape-${shape}`;
  if (ratio) dialog.style.setProperty('--ratio', ratio); // before it's measured for the lift
  dialog.setAttribute('aria-label', name);
  dialog.innerHTML = `
    <div class="viewer__stage">
      <div class="viewer__lift">
        <div class="viewer__card" role="button" tabindex="0" aria-pressed="false" aria-label="Flip it over">
          <div class="viewer__face viewer__face--front"></div>
          <div class="viewer__face viewer__face--back"></div>
        </div>
      </div>
    </div>
    <div class="viewer__controls">
      <button class="viewer__btn viewer__motion" type="button" hidden>✨ Turn on tilt effects</button>
      <button class="viewer__btn viewer__flip" type="button">Flip</button>
      <button class="viewer__btn viewer__close" type="button">Put back</button>
    </div>
  `;
  const $ = (sel) => dialog.querySelector(sel);
  const stage = $('.viewer__stage');
  const lift = $('.viewer__lift');
  const cardEl = $('.viewer__card');
  const motionBtn = $('.viewer__motion');

  // Each side: the same drawing as elsewhere, plus a shine layer
  $('.viewer__face--front').append(frontContent, makeLayer('viewer__glare'), makeLayer('viewer__holo'));
  $('.viewer__face--back').append(backContent, makeLayer('viewer__glare'));
  dialog.classList.add(`viewer--${finish}`);

  // Extra buttons (e.g. Shake for a badge)
  const closeBtn = $('.viewer__close');
  for (const { label, onClick } of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'viewer__btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    closeBtn.before(btn);
  }

  // ---------- Flip (tap, drag sideways, button, Enter/Space) ----------
  let flipAngle = 0; // 0 = front, 180 = back (any multiple of 180 when resting)
  let dragAngle = 0; // extra turn while a finger drags

  function setFlipped(angle) {
    flipAngle = angle;
    dragAngle = 0;
    const showingBack = Math.round(angle / 180) % 2 !== 0;
    cardEl.setAttribute('aria-pressed', String(showingBack));
    dialog.classList.toggle('is-back', showingBack);
    // Ease into place, then stop easing so tilting follows the pointer straight away
    // (a timer as well as transitionend, which doesn't fire if nothing moved)
    cardEl.classList.add('is-settling');
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => cardEl.classList.remove('is-settling'), 600);
    draw();
  }
  let settleTimer = 0;

  cardEl.addEventListener('transitionend', () => cardEl.classList.remove('is-settling'));
  const flip = () => { if (!closing) setFlipped(flipAngle + 180); };
  $('.viewer__flip').addEventListener('click', flip);
  cardEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flip();
    }
  });

  let drag = null;
  cardEl.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;
    drag = { id: event.pointerId, x0: event.clientX, y0: event.clientY, moved: false, offset: { x: 0, y: 0 } };
    try { cardEl.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
  });
  cardEl.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x0;
    const dy = event.clientY - drag.y0;
    // Shaking counts movement in any direction; turning over only counts sideways
    if (dragShakes ? Math.hypot(dx, dy) > 6 : Math.abs(dx) > 6) drag.moved = true;
    if (closing) return;
    if (drag.moved && dragShakes) {
      // Shake it: the item follows the finger (with a bit of stretch) and the fill sloshes
      const next = { x: rubber(dx), y: rubber(dy) };
      onShake?.(next.x - drag.offset.x, next.y - drag.offset.y);
      drag.offset = next;
      lift.style.transform = `translate(${next.x}px, ${next.y}px)`;
      return;
    }
    if (drag.moved && !reducedMotion.matches) {
      cardEl.classList.remove('is-settling');
      dragAngle = dx * 0.6; // the card follows the finger
      draw();
    }
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved } = drag;
    if (closing) {
      drag = null;
      return;
    }
    const offset = drag.offset;
    drag = null;
    if (!moved) return flip(); // a tap
    if (dragShakes) return springBack(offset);
    // Let go: settle on whichever side is facing you
    setFlipped(Math.round((flipAngle + dragAngle) / 180) * 180);
  };

  // A shaken item springs back to the middle (and the fill sloshes once more).
  // (Shaking only exists without Reduce Motion: the fill isn't live otherwise.)
  function springBack(offset) {
    lift.style.transform = '';
    if (closing) return;
    onShake?.(-offset.x, -offset.y);
    lift.animate([{ transform: `translate(${offset.x}px, ${offset.y}px)` }, { transform: 'none' }], {
      duration: 260,
      easing: 'cubic-bezier(.3, 1.4, .5, 1)',
    });
  }
  cardEl.addEventListener('pointerup', endDrag);
  cardEl.addEventListener('pointercancel', (event) => {
    if (drag && event.pointerId === drag.id) {
      const offset = drag.offset;
      drag = null;
      if (dragShakes) springBack(offset);
      else setFlipped(flipAngle);
    }
  });

  // ---------- Tilt (mouse on computers, phone tilt on phones) ----------
  let target = { x: 0, y: 0 }; // where the tilt wants to go, -1 … 1
  let tilt = { x: 0, y: 0 }; // where it is now (eases towards the target)
  let frame = 0;

  let usingMouse = false;
  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || drag) return;
    usingMouse = true;
    const r = cardEl.getBoundingClientRect();
    target = {
      x: clamp(((event.clientX - r.left) / r.width) * 2 - 1),
      y: clamp(((event.clientY - r.top) / r.height) * 2 - 1),
    };
    startLoop();
  });
  stage.addEventListener('pointerleave', () => {
    target = { x: 0, y: 0 };
    startLoop();
  });

  let baseOrientation = null; // how the phone was held when the card was picked up
  function onOrientation(event) {
    if (event.beta == null || event.gamma == null) return;
    baseOrientation ??= { beta: event.beta, gamma: event.gamma };
    // No motion sensor readings (some browsers): estimate "down" from the tilt angles
    if (!motionGravity) {
      const rad = Math.PI / 180;
      sendGravity(clamp(Math.sin(event.gamma * rad)), clamp(Math.sin(event.beta * rad)));
    }
    target = {
      x: clamp((event.gamma - baseOrientation.gamma) / 25),
      y: clamp((event.beta - baseOrientation.beta) / 25),
    };
    startLoop();
  }

  // Gravity and shaking come from the motion sensor: it knows which way is really down
  // (also upside down), and how hard the phone moves in any direction
  let gravity = null; // smoothed, so a shake doesn't look like a change of "down"
  let motionGravity = false; // the motion sensor is giving gravity readings
  let sentGravity = null;
  // Only pass on real changes: sensor jitter would otherwise keep the fill animating
  // (and the battery draining) while the phone is held still
  function sendGravity(x, y) {
    if (!onGravity) return;
    if (sentGravity && Math.abs(x - sentGravity.x) + Math.abs(y - sentGravity.y) < 0.04) return;
    sentGravity = { x, y };
    onGravity(x, y);
  }
  function onMotion(event) {
    const g = screenGravity(event.accelerationIncludingGravity);
    if (g) {
      motionGravity = true;
      gravity = gravity ? { x: gravity.x * 0.8 + g.x * 0.2, y: gravity.y * 0.8 + g.y * 0.2 } : g;
      sendGravity(gravity.x, gravity.y);
    }
    const a = screenAcceleration(event.acceleration);
    // Ignore the tiny jitter of a hand holding still. Metres per second² → a few px of push.
    if (a && onShake && Math.hypot(a.x, a.y) > 1.2) onShake(a.x * 1.6, a.y * 1.6);
  }

  function listenToTilt({ orientation = true, motion = true } = {}) {
    if (orientation) addEventListener('deviceorientation', onOrientation);
    if (motion && (onGravity || onShake)) addEventListener('devicemotion', onMotion);
  }

  // iPhone: tilt needs a one-time "Allow" from a button tap. Computers (mouse) never ask.
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const needsPermission = isTouch && typeof DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission === 'function';
  if (!reducedMotion.matches) {
    if (needsPermission && !motionAllowed) {
      motionBtn.hidden = false;
      motionBtn.addEventListener('click', async () => {
        // Ask for both, separately: the tilt angles (shine) and the motion sensor
        // (gravity, shaking). Either one still works if the other is refused.
        const ask = async (Api) => {
          if (typeof Api === 'undefined' || typeof Api.requestPermission !== 'function') return true;
          try { return (await Api.requestPermission()) === 'granted'; } catch { return false; }
        };
        const [orientation, motion] = await Promise.all([
          ask(globalThis.DeviceOrientationEvent),
          onGravity || onShake ? ask(globalThis.DeviceMotionEvent) : false,
        ]);
        motionAllowed = orientation || motion;
        motionBtn.hidden = true;
        listenToTilt({ orientation, motion });
      });
    } else {
      listenToTilt();
    }
  }

  function startLoop() {
    if (reducedMotion.matches || frame) return;
    frame = requestAnimationFrame(step);
  }

  function step() {
    frame = 0;
    tilt.x += (target.x - tilt.x) * 0.15;
    tilt.y += (target.y - tilt.y) * 0.15;
    if (usingMouse) onGravity?.(tilt.x * 0.8, 1); // a computer: down is down, nudged by the mouse
    draw();
    if (Math.abs(target.x - tilt.x) > 0.002 || Math.abs(target.y - tilt.y) > 0.002) startLoop();
  }

  function draw() {
    const angle = flipAngle + dragAngle;
    if (reducedMotion.matches) {
      // Reduce Motion: no turning in 3D; the sides swap with a fade (see CSS)
      cardEl.style.transform = 'none';
      return;
    }
    // On the back the sideways tilt is mirrored, so it still leans towards your finger.
    // cos() blends smoothly between the two while the card is being turned.
    const tx = tilt.x * MAX_TILT * Math.cos((angle * Math.PI) / 180);
    const ty = tilt.y * MAX_TILT;
    cardEl.style.transform = `rotateX(${-ty}deg) rotateY(${angle + tx}deg)`;
    // Shine follows the tilt: --mx/--my from 0% to 100%
    cardEl.style.setProperty('--mx', `${50 + tilt.x * 50}%`);
    cardEl.style.setProperty('--my', `${50 + tilt.y * 50}%`);
    cardEl.style.setProperty('--tilt', String(Math.min(1, Math.hypot(tilt.x, tilt.y))));
  }

  // ---------- Open and close ----------
  let closing = false;
  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    drag = null;
    lift.style.transform = ''; // put back from the middle, even mid-shake
    cancelAnimationFrame(frame);
    onClose?.();
    removeEventListener('deviceorientation', onOrientation);
    removeEventListener('devicemotion', onMotion);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.close();
      dialog.remove();
      from?.focus?.();
    };
    const fromRect = from?.isConnected ? from.getBoundingClientRect() : null;
    if (reducedMotion.matches || !fromRect?.width) {
      dialog.classList.add('is-closing');
      setTimeout(finish, 150);
      return;
    }
    // Put the card back into its pocket
    dialog.classList.add('is-closing');
    lift.animate([{ transform: 'none' }, { transform: liftFrom(fromRect) }], {
      duration: 320,
      easing: 'cubic-bezier(.4, 0, .6, 1)',
    }).finished.then(finish, finish);
    setTimeout(finish, 450); // close even if the animation never finishes (e.g. a background tab)
  }

  $('.viewer__close').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  // Tap outside the card to put it back
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target === stage) close();
  });

  // The transform that puts the big card exactly where the small one is
  function liftFrom(fromRect) {
    const r = lift.getBoundingClientRect();
    const scale = fromRect.width / r.width;
    const dx = fromRect.left + fromRect.width / 2 - (r.left + r.width / 2);
    const dy = fromRect.top + fromRect.height / 2 - (r.top + r.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  }

  document.body.append(dialog);
  dialog.showModal();
  cardEl.focus({ preventScroll: true });
  draw();

  // Lift the card out of its pocket
  const fromRect = from?.getBoundingClientRect();
  if (!reducedMotion.matches && fromRect?.width) {
    lift.animate([{ transform: liftFrom(fromRect) }, { transform: 'none' }], {
      duration: 420,
      easing: 'cubic-bezier(.2, .8, .2, 1)',
    });
  }

  return dialog;
}

function makeLayer(className) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function clamp(v) {
  return Math.max(-1, Math.min(1, v));
}

// Follows the finger, but harder the further it goes (like a rubber band), max ~60 px
function rubber(d) {
  return Math.sign(d) * 60 * (1 - Math.exp(-Math.abs(d) / 90));
}
