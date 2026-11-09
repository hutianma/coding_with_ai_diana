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
| Branch | `m<number>-<short-name>` | `m3-drag-to-flip` |
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

### M7: Decorate
1. DIY binder cover: material, color, photo window, stickers.
2. DIY card backs: upload your own image for the back (cropped like the front), or decorate it with stickers and text.
3. Sticker layer: drag on, resize, rotate, delete.
4. A journal page **or** an ita bag display (Diana picks which first).
5. Saved as editable settings, not flat images.
6. ✅ **Check:** decorate a page, reload, and edit it again.

### M8: Share
1. Export the current binder spread / journal page / ita bag as a PNG.
2. Export a short page-flip video (WebM/MP4 via `MediaRecorder`) or GIF.
3. Share sheet on phones (`navigator.share`), download on computers.
4. ✅ **Check:** post one export to social media straight from the phone.

### M9: Unboxing mini-game (optional)
1. Seal chosen cards in an envelope or album.
2. Peel the shrink-wrap, open the flap or lid, flip through, reveal the cards one by one.
3. Sound effects + vibration where supported; Reduce Motion gets simple fades.
4. ✅ **Check:** opening feels like a ritual, not a button.

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
