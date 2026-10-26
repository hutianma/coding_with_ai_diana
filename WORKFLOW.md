# 🛠️ Build Workflow

How we build the Photocard Binder step by step. [README.md](README.md) says **what** we're building. This file says **how** we build it, one milestone at a time.

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
- [ ] No celebrity photos committed to the repo. Use only placeholder art.
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
3. Stop the page from scrolling during the drag (`touch-action: none`).
4. ✅ **Check:** on the iPhone, dragging feels like a real page.

### M4: Add your cards
1. "Add card" button → photo picker (`<input type="file" accept="image/*" multiple>`).
2. Crop screen locked to the 55:85 ratio (drag and pinch to frame the photo).
3. Make smaller copies (about 600 px tall), then save them to **IndexedDB** (`storage/db.js`).
4. Place new cards in the next empty pocket. Drag cards to rearrange them. Long-press a card to remove it.
5. ✅ **Check:** add 20 cards, reload the page, and they're all still there.

### M5: Polish
1. Sleeve shine layer on each pocket.
2. Tap a card → it lifts out → you can spin it in 3D and see the back.
3. Page-flip sound + vibration (where supported).
4. ✅ **Check:** Diana's "wow" test 😄

### M5b: 3D photos (one level at a time)
1. **Level 1:** tilt + glare. Mouse on computers, gyroscope on phones (with an "Enable motion" button for iOS).
2. **Level 2:** holo foil layer for cards whose finish is `"holo"`.
3. **Level 3:** pop-out layers. Cut out the person with background removal on the device, save the cut-out, and show the layers at different depths.
4. **Level 4:** depth map. Run a depth model on the device, then a WebGL shader moves each pixel based on depth and tilt.
5. Only the card you're focused on is animated in 3D.
6. ✅ **Check:** tilting the phone clearly changes the photo, and the app stays smooth.

### M6: Page turn v2 (Three.js curl)
1. Three.js scene with a bendable page mesh (about 40 segments across).
2. Bend the page around a cylinder that follows the drag.
3. Draw the cards onto the page, plus the plastic sleeve material and soft shadows.
4. Keep the CSS version as a backup for older phones.
5. ✅ **Check:** the page visibly curls while you drag it.

### M7: iOS app
1. Xcode project: SwiftUI app + **Share Extension** target.
2. Rebuild the binder view in SwiftUI using the web version as the design guide.
3. `PhotosPicker` for adding cards, SwiftData for saving them.
4. Share Extension: "Add to Binder" in Photos → the cards appear in the app.
5. 3D photos: Vision cut-outs + depth data from Portrait mode photos.
6. ✅ **Check:** running on Diana's iPhone through Xcode.

### M8: Extras
Multiple binders · tags · search and filter · share a page as an image or video · iCloud sync. **Each one is its own small branch.**

### M9: DIY cover
1. Cover editor: material, color, and front window.
2. Sticker layer: drag on, resize, rotate, delete.
3. Text tool with fonts.
4. Save as a `CoverDesign` (editable later, not a flat image).
5. ✅ **Check:** design a cover, reload the page, and edit it again.

### M10: Page music
1. Pick a song for a page or the whole binder: preview search, or an audio file from the phone.
2. Player with fade-in and fade-out between pages, and a start time (jump to the chorus).
3. A tap to turn music on, plus a mute button.
4. Later: Apple Music or Spotify playback.
5. ✅ **Check:** turning a page smoothly switches the song.

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
- Never add real celebrity photos or copyrighted music to the repo.
- Plain JavaScript first, and no new libraries unless the README lists them or Diana agrees.
- After each task, explain briefly what changed and how to see it.
