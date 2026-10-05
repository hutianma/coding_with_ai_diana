# 📒 Photocard Binder

A digital photocard binder for showing off your celebrity and idol photocard collection. You flip through pages with a realistic 3D page-turn, just like a real binder with plastic sleeves.

> **Status:** planning stage. This README is the project plan.

---

## 1. The idea

Collectors keep photocards in binders with clear pocket sleeves, and part of the fun is flipping through the pages. This project recreates that online:

- Cards sit in **pocket sleeves** (2×2 or 3×3 per page) with a glossy plastic shine.
- You **drag or swipe** to turn a page. The page bends, casts a shadow, and lands on the other side.
- You can **tap a card** to lift it out of its sleeve, spin it in 3D, and see the back.
- Cards come from **your own photo library**, so you can add a card straight from the Photos app.

---

## 2. Platform decision

| Option | What's possible | Verdict |
|---|---|---|
| **Plugin inside Apple Photos** | Apple only allows *Photo Editing Extensions*, which edit a single photo. You can't add a custom viewer or binder inside Photos. | ❌ Not possible |
| **Share Extension** ("Add to Binder" in the Photos share sheet) | You select photos in Photos, tap Share, then tap **Add to Binder**, and the photos are sent to our app. | ✅ This is how we "plug into" Photos |
| **Web app (PWA)** | Runs in Safari on iPhone, iPad and computers, and can be added to the home screen. Can pick photos from your library. | ✅ **Start here**: fastest to build and share |
| **Native iOS app (SwiftUI)** | Best performance, works offline, includes the Share Extension, and can go on the App Store. | ✅ **Phase 2** |

**Plan:** build the **web prototype first** to perfect the page-turn animation and design. Then turn it into a **native iOS app with a Photos Share Extension**.

---

## 3. Features

### MVP (must have)
- [ ] Binder cover screen. Tap it to open.
- [ ] Pages with 2×2 or 3×3 card pockets.
- [ ] **3D page turn**: drag the page edge to flip it, or tap the arrows.
- [ ] Add cards from your photo library and crop them to photocard ratio (**55 × 85 mm**, about 2:3.1).
- [ ] Rearrange cards by dragging. Remove cards.
- [ ] Collection saved on the device, so it's still there after you close the app.

### Nice to have
- [ ] Tap a card to lift it out, spin it in 3D, and see its front and back.
- [ ] Holographic or glossy shine that moves when you tilt the phone (gyroscope).
- [ ] Several binders, for example one per group or artist, with custom covers and colors.
- [ ] Tags for each card: artist, group, album, era, and whether it's rare.
- [ ] Search and filter ("show all cards from album X").
- [ ] Page-flip sound and a small vibration.
- [ ] Share a page as an image or short video for social media.
- [ ] Optional account and cloud sync (iCloud / Sign in with Apple).

---

## 4. Tech stack

### Phase 1: Web prototype
| Part | Choice | Why |
|---|---|---|
| Language | HTML + CSS + JavaScript (later TypeScript) | Simple, no setup needed |
| Build tool | [Vite](https://vitejs.dev) | Fast dev server, easy to deploy |
| 3D page turn (simple) | **CSS 3D transforms** (`perspective`, `rotateY`, `backface-visibility`) | Smooth, light, good for a first version |
| 3D page turn (realistic bend) | **Three.js**: a page mesh whose vertices are bent along a curl | A real paper-curl look |
| Gestures | Pointer Events (drag progress → rotation angle) | Works with mouse and touch |
| Storage | **IndexedDB** (via `idb-keyval`) | Can store many images on the device |
| Hosting | GitHub Pages / Vercel | Free, one link to share |

### Phase 2: Native iOS
| Part | Choice |
|---|---|
| App UI | SwiftUI |
| 3D page turn | SceneKit or RealityKit (bent page mesh), or `UIPageViewController` with `.pageCurl` as a quick fallback |
| Photo access | `PhotosPicker` (PhotosUI) |
| Photos integration | **Share Extension** target → "Add to Binder" |
| Storage | SwiftData + image files in the app's storage |
| Sync (optional) | CloudKit |
| Tilt shine | CoreMotion |

---

## 5. How the page turn works

### Version A: CSS 3D (start here)
```
 ┌──────────── binder (perspective: 2000px) ────────────┐
 │  left page (static)  ║  right page (flippable)       │
 │                      ║  ┌ front face ┐               │
 │                      ║  └ back face  ┘ (rotateY 180) │
 └──────────────────────╨───────────────────────────────┘
                       spine = transform-origin: left center
```
1. Each page is a `div` with a **front** and a **back** face (`backface-visibility: hidden`).
2. `transform-origin` sits on the **spine** (the left edge).
3. As you drag, `progress = dragDistance / pageWidth` (from 0 to 1), so `rotateY(-progress * 180deg)`.
4. When you let go, the page finishes the flip if progress is over 0.5, and springs back if not (easing curve).
5. For depth, a shadow gradient on the page underneath gets stronger as the page lifts. A highlight moves across the turning page.

### Version B: Three.js paper curl (upgrade)
1. Each page is a `PlaneGeometry` with many segments across its width (for example 40).
2. Every frame, each vertex is bent around a **cylinder** whose position follows the drag. This makes the page curl instead of turning like a stiff board.
3. The card textures (`CanvasTexture`) are drawn onto the page. A second slightly transparent layer with a reflective material acts as the plastic sleeve.
4. Soft shadows come from a directional light with shadow maps.

### Plastic sleeve and shine effect
- Each pocket is a slightly transparent layer with a **diagonal white gradient** on top.
- The gradient angle follows the pointer or the phone's tilt, which makes the plastic shine.
- Holo cards get a rainbow layer (`mix-blend-mode: color-dodge`).

---

## 5b. Making photos look 3D (the image changes with the viewing angle)

Goal: when you **tilt your phone** or **move your mouse**, each photocard looks like a real object with depth. It isn't a flat picture.

**What controls the angle**
- 📱 Phone: gyroscope (`DeviceOrientationEvent`; iPhone Safari needs a one-time "Allow motion" button) / CoreMotion in the iOS app.
- 💻 Computer: mouse position over the card.
- The tilt is limited to about ±15° and smoothed, so it feels calm and doesn't jitter.

There are four levels of the effect, from easiest to most impressive:

| Level | Effect | How it works | Difficulty |
|---|---|---|---|
| **1. Tilt + glare** | The card leans toward you and a shiny streak slides across it | CSS `rotateX/rotateY` + a moving gradient layer | ⭐ Easy |
| **2. Holo foil** | Rainbow shimmer that shifts with the angle, like holographic cards | Rainbow gradient + sparkle texture, `mix-blend-mode: color-dodge`, offset by the tilt | ⭐⭐ |
| **3. Pop-out layers** | The person floats **in front of** the background, and the two move at different speeds | Cut the subject out of the photo (on-device AI), then stack 2–3 layers at different depths (`translateZ`) | ⭐⭐⭐ |
| **4. Depth map** | The whole photo has real depth, like *Spatial Scenes* in the iOS Photos app | Get a depth map (an image where brightness means distance). WebGL shifts each pixel based on its depth and the tilt angle | ⭐⭐⭐⭐ |

**Where the cut-outs (Level 3) and depth maps (Level 4) come from**
- **Web:** cut-outs from on-device background removal (e.g. `@imgly/background-removal`); depth from an AI depth model running in the browser (e.g. *Depth Anything* via `transformers.js`).
- **iOS:** cut-outs from Apple's Vision framework (`VNGenerateForegroundInstanceMaskRequest`, the same as "lift subject" in Photos). Depth comes from **Portrait mode photos, which already store real depth data** (`AVDepthData`), or from an AI depth model for other photos.
- Everything runs **on the device**, so photos are never uploaded.
- Each result is calculated once when a card is added, then saved with the card, so later viewing stays fast.

**Bonus: lenticular cards.** Some real photocards change picture when you tilt them. You choose 2–3 photos, and the card blends between them depending on the angle.

**Rules so it feels good**
- The 3D effect runs only on the card you're looking at or holding, not on all 9 cards at once, so the app stays smooth.
- Turned off during page turns, and replaced by a still image when *Reduce Motion* is on.

---

## 5c. Future ideas (later, after the main plan)

### 🎨 DIY binder cover
Users design their own cover, like decorating a real binder:
- Choose a cover color or material (leather, glitter, clear plastic, pastel).
- Add a photo or a photocard to a **front window** on the cover.
- **Stickers:** hearts, stars, the group's logo, or your own images. Drag them on, then resize and rotate them.
- Text in fun fonts, such as the idol's name, the group's name, or a fan-club name.
- Spine label and ribbon or charm decorations.
- The cover is saved as a list of stickers and settings, not as a flat image, so it can be edited again later.

### 🎵 Music for each page
When you open a page, its own song plays, such as the song from that stage performance or the idol's signature song.
- Each page (or the whole binder) can be given a **theme song**, with a start time (e.g. jump to the chorus).
- Music **fades** from one song to the next as you turn the page.
- Play/pause and mute buttons. Music never starts by surprise; the user taps once to turn music on (browsers require this anyway).

**Where the music comes from (copyright-safe options).** The app must not include or upload songs. Instead:
| Source | How |
|---|---|
| **Apple Music** | MusicKit (web: MusicKit JS, iOS: MusicKit). Plays full songs for subscribers and 30-second previews for everyone else |
| **Spotify / YouTube** | Official embedded players linked to a song or stage video |
| **Song previews** | iTunes Search API: free 30-second previews, with no account needed |
| **Your own files** | The user picks an audio file stored on their own device |

---

## 6. Data model

```ts
Binder {
  id: string
  name: string            // "SEVENTEEN binder"
  coverColor: string
  cover?: CoverDesign     // DIY cover (future)
  themeSong?: Song        // default music for the whole binder (future)
  layout: "2x2" | "3x3"
  pages: Page[]
}

Page {
  id: string
  slots: (CardId | null)[]   // 4 or 9 slots
  song?: Song                // overrides binder themeSong (future)
}

CoverDesign {
  material: "leather" | "glitter" | "clear" | "pastel"
  color: string
  windowCardId?: CardId
  stickers: { image: string, x: number, y: number, scale: number, rotation: number }[]
  texts: { content: string, font: string, color: string, x: number, y: number }[]
}

Song {
  title: string
  artist: string
  source: "appleMusic" | "spotify" | "youtube" | "preview" | "localFile"
  ref: string             // song ID, URL, or local file key
  startAt?: number        // seconds, e.g. jump to the chorus
}

Card {
  id: string
  frontImage: Blob        // cropped to 55:85
  backImage?: Blob
  artist?: string
  group?: string
  album?: string
  tags: string[]
  finish: "matte" | "glossy" | "holo"
  effect: "none" | "tilt" | "popout" | "depth" | "lenticular"
  subjectMask?: Blob      // cut-out of the person (Level 3)
  depthMap?: Blob         // grayscale depth image (Level 4)
  lenticularImages?: Blob[]
  addedAt: Date
}
```

---

## 7. Planned project structure (Phase 1)

```
coding_with_ai_diana/
├── README.md
├── index.html
├── package.json
├── public/
│   └── sample-cards/        # placeholder art for demos (NOT real celebrity photos)
└── src/
    ├── main.js              # app entry
    ├── binder/
    │   ├── Binder.js        # pages, current spread, navigation
    │   ├── PageFlip.js      # drag → rotation, snapping, easing
    │   └── Sleeve.js        # pocket + plastic glare
    ├── cards/
    │   ├── CardPicker.js    # pick a photo from the library
    │   ├── Cropper.js       # crop to photocard ratio
    │   └── CardViewer.js    # tap-to-inspect 3D card
    ├── storage/
    │   └── db.js            # IndexedDB save/load
    └── styles/
        ├── binder.css
        └── sleeve.css
```

---

## 8. Roadmap

| Milestone | Goal | Done when… |
|---|---|---|
| **M0: Setup** | Vite project, deploy to GitHub Pages | The empty page is live at a public link |
| **M1: Static binder** | Cover plus a 2×2 page grid with placeholder cards | Looks like a binder on phone and computer |
| **M2: Page turn v1** | CSS 3D flip with tap arrows | Pages flip smoothly at 60 fps |
| **M3: Drag to flip** | Pointer and touch dragging with snapping | Feels natural on iPhone Safari |
| **M4: Add your cards** | Photo picker + crop + save to IndexedDB | Cards are still there after a reload |
| **M5: Polish** | Sleeve shine, shadows, sound, card inspect view | Friends say "wow" 😄 |
| **M5b: 3D photos** | Tilt + glare → holo → pop-out layers → depth map | The photo changes when you tilt the phone |
| **M6: Page turn v2** | Three.js curling paper | The page visibly bends while dragged |
| **M7: iOS app** | SwiftUI app + Photos **Share Extension** | "Add to Binder" works from the Photos app |
| **M8: Extras** | Multiple binders, tags, search, sharing, iCloud sync | — |
| **M9: DIY cover** | Cover editor with materials, stickers, text, and a front window | You can design a cover and edit it again later |
| **M10: Page music** | A theme song for each page, with fading between songs | Turning a page changes the song |

---

## 9. Things to keep in mind

- **Copyright and privacy:** celebrity photos and official photocards belong to their owners. The app only shows photos **from your own library on your own device**. It does not ship or host any celebrity images. Demo assets use placeholder art.
- **Performance:** make thumbnails smaller (for example 600 px tall) so big binders stay smooth. Only draw the pages next to the one you're on.
- **Accessibility:** offer arrow buttons and keyboard navigation (← →) as well as dragging, and follow the *Reduce Motion* setting by using a simple fade instead of the flip.
- **iPhone Safari quirks:** test 3D transforms and the photo picker on a real device early.

---

## 10. Getting started (after M0)

```bash
npm install
npm run dev      # open the link it prints, then try it on your phone on the same Wi-Fi
```

---

## Credits

Made by Diana with help from Claude Code.
