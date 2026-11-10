# 🛠️ Build Workflow

How we build **Pocket Fandom** step by step. [README.md](README.md) says **what** we're building. This file says **how** we build it, one milestone at a time.

---

## 1. How each milestone works

Every milestone (M0, M1, M2, …) follows the same 7 steps:

```
 ① Pick     →  ② Branch   →  ③ Break down  →  ④ Build
                                                  ↓
 ⑦ Merge    ←  ⑥ Review   ←  ⑤ Check on screen & phone
```

| Step | What happens | Who |
|---|---|---|
| **① Pick** | Diana says which milestone is next, e.g. *"Let's do M2"* | Diana |
| **② Branch** | Make a new git branch, e.g. `m2-page-flip`, so `main` always works | Claude |
| **③ Break down** | Split the milestone into small tasks (each one ≤ ~1 hour) and show the list | Claude, Diana approves |
| **④ Build** | Write the code one task at a time, with a small commit after each task | Claude |
| **⑤ Check** | Run it in the browser, take screenshots, then Diana tries it on her **iPhone** | Claude + Diana |
| **⑥ Review** | Run `/code-review` on the changes. Fix what it finds, then Diana gives feedback ("faster flip", "more shine") | Claude + Diana |
| **⑦ Merge** | Open a pull request, merge it into `main`, tick the boxes in the README, and deploy the new version | Claude, Diana says OK |

**Rule:** one milestone per branch. Never start the next milestone until the current one is merged.

---

## 2. Definition of done (every milestone)

A milestone is finished only when **all** of these are true:

- [ ] It does what the README's *"Done when…"* column says.
- [ ] It works in **iPhone Safari** and **desktop Chrome/Safari**.
- [ ] Animations feel smooth, with no jitter (aim for 60 fps).
- [ ] It works with **Reduce Motion** turned on (simple fade instead of 3D).
- [ ] No errors in the browser console.
- [ ] No real people's photos or copyrighted images committed to the repo. Use only placeholder art.
- [ ] The README checklist is updated.

---

## 3. Git habits

| Thing | Convention | Example |
|---|---|---|
| Branch | `m<number>-<short-name>` for a milestone, `fix-<short-name>` for a fix to something already shipped | `m3-drag-to-flip`, `fix-shaker-motion` |
| Commit | Short message that starts with a verb | `Add snap-back easing to page flip` |
| Pull request | One per milestone, with screenshots or a GIF | *"M3: Drag to flip"* |
| `main` | Always working and deployable | — |

---

## 4. Milestone task breakdown

### M0: Setup
1. Create the app skeleton (`index.html`, `src/main.js`, `src/styles/base.css`). No build step.
2. Add `.gitignore` (`node_modules`, `dist`).
3. Set up the GitHub Pages deploy (GitHub Action on push to `main`).
4. ✅ **Check:** the public link opens on the phone.

### M1: Static binder
1. Binder layout: cover → open spread (left page + right page + spine).
2. Card pocket grid (2×2, then 3×3) at the **55:85** photocard ratio.
3. Placeholder cards (colored gradients with numbers, not real photos).
4. Responsive sizing: on phones, show one page at a time; on computers, show both pages side by side.
5. ✅ **Check:** screenshots on phone and computer sizes.

### M2: Page turn v1 (CSS 3D)
1. Page element with front and back faces (`backface-visibility: hidden`).
2. `PageFlip.js`: `flipTo(pageIndex)` animates `rotateY` from 0° to −180° around the spine.
3. Left and right arrow buttons + keyboard ← →.
4. Shadow on the page underneath and a moving highlight on the turning page.
5. Reduce Motion → fade instead of the flip.
6. ✅ **Check:** flip through 10 pages quickly with no flicker or jitter.

### M3: Drag to flip
1. Pointer Events: drag distance → `progress` (0 → 1) → rotation angle.
2. When you let go: if `progress > 0.5` **or** the swipe is fast, finish the flip; otherwise spring back.
3. Sideways drags turn pages; up/down scrolling and pinch-zoom still work (`touch-action: pan-y pinch-zoom`).
4. ✅ **Check:** on the iPhone, dragging feels like a real page.

### M4: Photocard Workshop
1. "New card" button → photo picker (`<input type="file" accept="image/*" multiple>`).
2. Crop screen locked to the 55:85 ratio (drag and pinch to frame the photo).
3. Card back designer: color, pattern, short text (or a second photo).
4. Make smaller copies (about 600 px tall) and save cards to **IndexedDB** (`src/storage/db.js`).
5. New cards go into the binder's next empty pockets; the placeholder cards go away once you have your own.
6. A "My cards" list to edit and delete cards.
7. ✅ **Check:** make 6 cards, reload the page, and they're still in the binder.

### M5: Card effects
1. Tap a card → it lifts out of the pocket → flip it to see the back.
2. **Tilt + glare:** mouse on computers, gyroscope on phones (with an "Enable motion" button for iOS).
3. **Holo foil** for cards whose finish is `"holo"`.
4. Handwritten **signature** drawn with a finger, shown on the card.
5. Only the card in focus is animated; Reduce Motion shows a still image.
6. ✅ **Check:** tilting the phone clearly changes the card, and the app stays smooth.

### M6: More merch
1. **Holo foil redesign:** keep the photo's colors; sparkles + a thin sheen instead of a rainbow wash.
2. **Badge (吧唧):** round crop, glossy dome, rim color, optional **流麻** fill (glitter, snow, stars, hearts, sakura) that drifts with the phone's tilt and can be shaken.
3. **Polaroid (拍立得):** single or **合拍** (two photos side by side / top & bottom), frame color, handwritten caption.
4. **＋ New** menu and the **My stuff** shelf (tabs for photocards, badges, polaroids); tap anything to pick it up.
5. ✅ **Check:** make one of each from your own photos.
6. Acrylic stands moved to "Later" (Diana: optional).

### M7: DIY binder cover
1. Sticker system: built-in stickers drawn for the app + your own images; drag, pinch / buttons to resize and turn, ✕ to remove.
2. Cover designs: pastel, leather, glitter or clear material; any color; five fonts already on phones; a window showing one of your cards (rounded, heart, circle, arch).
3. Cover editor with a live preview, opened by ✎ Edit while the binder is closed. Saved as settings, editable again.
4. ✅ **Check:** design a cover, reload, and edit it again.

### M8: Journal page
1. A paper page (a few paper styles) you can add cards, badges, polaroids, stickers and text to.
2. Move, resize and turn everything (reusing the sticker layer).
3. Saved as settings, editable again.
4. ✅ **Check:** make a page you'd be proud to show.

### M9: Card sleeves
1. Sleeve styles: toploader, bunny-ear fabric, plush animals (bear, fox, puppy, snowman), puffy leather (dots, cakes, hearts); any color; charms and stickers. (Diana: no holo sleeves.)
2. Show one favourite card in its sleeve: on the shelf, on journal pages, and picked up in the viewer (the charm swings with the tilt).
3. ✅ **Check:** a card looks special on its own.

### M10: Binder library
1. More than one binder (create, rename, delete; cards belong to a binder).
2. A shelf of binders you swipe through, then pull one out to open it.
3. ✅ **Check:** switching binders feels fun.

### M11: Ita bag
1. A bag with a clear window; arrange badges and cards inside.
2. ✅ **Check:** a bag you'd carry to a concert.

### Later
DIY card backs · share / export · unboxing mini-game · how all your things are shown in the app (e.g. a "my room" home screen) — to be designed with Diana.

### After Phase 1
Check the signals in the README ("How we'll know Phase 1 works"). Then pick the next steps from the README's "Later" table and split them into milestones (M10, M11, …). **Each one is its own branch.**

---

## 5. How to start a session with Claude

Just say one of these:

| You say | Claude does |
|---|---|
| *"Let's do M2"* | Steps ② → ③: makes the branch and shows the task list for you to approve |
| *"Continue"* | Picks up the next unfinished task on the current branch |
| *"Show me"* | Runs the app and takes screenshots |
| *"Review it"* | Runs `/code-review` and fixes what it finds |
| *"Ship it"* | Step ⑦: pull request, merge, deploy, update the README |
| *"Change X"* | Adjusts the design or behavior, e.g. "make the flip slower" |

---

## 6. Rules for Claude

- Follow [README.md](README.md) for **what** to build and this file for **how**.
- Keep `main` working. Do all work on a milestone branch.
- Small commits, one task each. Never push or merge without Diana's OK.
- Never add real people's photos, copyrighted images or copyrighted music to the repo.
- Plain JavaScript first, and no new libraries unless the README lists them or Diana agrees.
- After each task, explain briefly what changed and how to see it.
- Everything that goes to GitHub (code, comments, commits, docs) is written in **English**.
