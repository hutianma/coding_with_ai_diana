# 🛠️ Build Workflow

How we build **Pocket Album World** step by step. [README.md](README.md) says **what** we're building. This file says **how** we build it, one milestone at a time.

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

### M4: Card Maker
1. "New card" button → photo picker (`<input type="file" accept="image/*" multiple>`).
2. Crop screen locked to the 55:85 ratio (drag and pinch to frame the photo).
3. Card back designer: color, pattern, short text (or a second photo).
4. Make smaller copies (about 600 px tall) and save cards to **IndexedDB** (`src/storage/db.js`).
5. A "My cards" list to view, edit and delete cards.
6. ✅ **Check:** make 6 cards, reload the page, and they're all still there.

### M5: Album Studio v1
1. New album: title, cover photo, colors, font.
2. Sticker layer on the cover: drag on, resize, rotate, delete.
3. Templates: **envelope** and **CD case** first (gift box and blind box come in Phase 2).
4. Choose the album's 6 cards, plus an optional hidden card.
5. 3D preview of the finished package (spin it around).
6. Save as an `Album` + `CoverDesign` (editable later, not a flat image).
7. ✅ **Check:** design an album, reload the page, and edit it again.

### M6: Virtual Unboxing v1
1. Unboxing scene: the package sits in front of you.
2. **Peel the shrink-wrap** by dragging from a corner.
3. **Open** the envelope flap or CD case lid (CSS 3D hinge).
4. **Flip through the photobook** (reuses `PageFlip.js`), with the hidden card tucked between pages.
5. **Random drop:** pick 2 cards from the album (weights by rarity), cards slide out face-down, tap or drag to flip and reveal.
6. Sound effects + vibration where supported; Reduce Motion gets simple fades.
7. ✅ **Check:** opening an album feels like a ritual, not a button.

### M7: Collection loop
1. Unboxed cards become `CardInstance`s and go into the binder's next empty pockets.
2. Drag cards between pockets; long-press to remove.
3. Set page for each album: collected cards in color, missing ones as silhouettes, duplicates counter.
4. "Open another" button to unbox again.
5. ✅ **Check:** the whole loop works end to end: 6 photos → album → unbox 2 cards → binder → see what's missing.

### M8: Card effects
1. Tap a card → it lifts out of the pocket → flip it to see the back.
2. **Tilt + glare:** mouse on computers, gyroscope on phones (with an "Enable motion" button for iOS).
3. **Holo foil** for holo cards.
4. Only the card in focus is animated; Reduce Motion shows a still image.
5. ✅ **Check:** tilting the phone clearly changes the card, and the app stays smooth.

### M9: Playtest
1. Write a short playtest script: what to try, and 5 questions (Was unboxing fun? Would you open another? What was confusing?).
2. 3–5 friends play the loop on their phones; note what they say and where they get stuck.
3. Turn the feedback into small fixes and decide what Phase 2 focuses on.
4. ✅ **Check:** we know whether unboxing is fun, and what to change.

### Phase 2–4
Each phase is split into milestones (M10, M11, …) when we get there, following the README's Phase 2–4 table. **Each one is its own branch.**

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
