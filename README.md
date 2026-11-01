# Pawgress

**Get better together.**

Pawgress is a playful home rehabilitation companion built as a four-hour solo hackathon MVP. A user chooses a photo of their pet, uses local webcam pose tracking (or instant demo controls), and helps their buddy cross three ice platforms by completing three shoulder raise-and-lower cycles.

The complete demo flow takes under 60 seconds and works without a camera, account, database, or API key.

## Run it

Requirements: Node.js 20+ and a modern browser.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. For webcam mode, use `localhost` or HTTPS and grant camera permission. The MediaPipe WASM runtime and pose model are downloaded from their official hosted assets the first time camera mode starts.

```bash
npm test
npm run build
```

Install the pinned Playwright browser once, then run the browser journeys:

```bash
npm run test:e2e:install
npm run test:e2e
```

## Fast judge path

1. Select **Meet your buddy**.
2. Keep **Mochi — Bundled demo** selected and choose **Hatch My Pet**.
3. Select **Use instant demo**.
4. Press **Complete a demo rep** three times.
5. Watch Mochi reach the island and review the saved session summary.

Demo angles and trunk movement are visibly labelled **Simulated data**. Demo mode runs through the same rep state machine and feedback event boundaries as camera mode.

## What was built during the hackathon

- Five-step responsive experience: welcome, pet selection, calibration, exercise game, summary.
- Canvas-rendered arctic expedition with four seeded biomes, shared water/platform physics, parallax scenery, snow, ripples, earned stars, and celebration effects.
- Validated PNG/JPEG/WebP pet image import (5 MB maximum) with local object URLs; images are not uploaded.
- Clearly labelled bundled Mochi fallback.
- MediaPipe Pose Landmarker loaded only after camera opt-in; webcam frames remain local.
- Shoulder/elbow/hip confidence checks, best-side selection, estimated arm elevation, estimated trunk lean, and exponential smoothing.
- Configurable visual target with an explicit non-prescription safety note.
- Deterministic rep state machine with hysteresis, target hold, a complete return phase, and exactly one reward per rep.
- Typed feedback events: `START`, `TARGET_REACHED`, `TRUNK_DEVIATION`, `TRACKING_LOST`, `REP_COMPLETED`, and `SESSION_COMPLETED`.
- Browser speech synthesis queue with no overlapping utterances and a mute control.
- Phase-aware pet animation: anticipate, charge, leap, land, idle, and celebrate. Uploaded photos use the same animated sticker rig.
- Web Audio ambience and event chimes with a shared mute control alongside queued speech.
- Ghost Mode segments prior camera recordings into repetitions, selects a strong personal reference, normalizes it to movement phase, and replays a translucent motion trail.
- Live performance counters for Canvas FPS, average and p95 frame time, particle load, MediaPipe inference time, and dropped camera frames.
- Development-only `window.__PAWGRESS__` inspection bridge and repeatable scene URLs for reproducing important states.
- Versioned localStorage session history, comparison, and reset controls.
- Optional credential-safe Decisions adapter boundary with deterministic local fallback.
- Vitest coverage for angle math, missing/low-confidence landmarks, trunk lean, rep transitions, exactly-once rewards, feedback cooldowns, simulation determinism, and normalized Ghost Mode.
- Playwright journeys for the complete challenge, named-scene inspection, and mobile overflow.

## Pet hatching and sprite assets

The requested `hatch-pet` skill was checked in the installed Codex skill catalog and local skill directories. It was not installed, so this project deliberately does **not** invent a command or API invocation for it.

The MVP instead supports safe local import of PNG, JPEG, and WebP assets through **Choose image → Hatch My Pet**. Static pet photos and pre-rendered sprite images both work as the buddy texture. If a documented hatch-pet skill becomes available later, its output can be imported through this same asset boundary without changing motion or game logic.

## Architecture

```text
src/
  components/          Canvas renderer, pet/pose overlays, metrics, progress
  dev/                 development-only inspection bridge
  game/                deterministic feedback and rep state machine
  services/            audio, voice, storage, optional decision adapter
  simulation/          seeded expedition, animation, water, springs, particles
  tracking/            MediaPipe lifecycle, pose math, normalized ghost replay
  types.ts             shared domain contracts
  App.tsx              flow orchestration and event boundaries
e2e/                   real-control and named-scene browser journeys
```

The pure motion and expedition simulations do not depend on React, MediaPipe, the camera, or the renderer. Demo frames and camera frames enter the same `processMotion` boundary. The Canvas runs its own animation loop and interpolates visual motion independently from pose inference.

## Continuous game feel

The whole repetition now controls the adventure instead of only its completion event:

| Rep state | Expedition response |
| --- | --- |
| Ready | Pet idles and watches the route |
| Raising | Pet anticipates; the scene charges with spark particles |
| Target held | Pet launches toward the next stop |
| Lowering | Pet continues through its jump arc |
| Reset reached | Water ripples, the platform springs, and one star is awarded |
| Session complete | The pet celebrates on the island |

The visuals never reward exceeding the selected target, penalize limited range, or change the user's target automatically.

## Repeatable development scenes

In development, append a scene name to the URL:

```text
/?scene=ready
/?scene=raising
/?scene=target-hold
/?scene=tracking-lost
/?scene=trunk-feedback
/?scene=final-leap
```

The development build also exposes `window.__PAWGRESS__` with `getState()`, `setDemoPose()`, `completeRep()`, and `loadScene()`. This interface is removed from production builds and accepts only typed pose values and named scenes—never arbitrary code.

## Motion logic

- Arm elevation is the 2D angle at the shoulder between the elbow and hip vectors. It is an estimate, not a clinical measurement.
- Trunk lean is the absolute angle between the shoulder/hip midpoint line and vertical.
- The tracker chooses the side with the stronger minimum landmark confidence.
- A rep must move above the selected target, remain there for 180 ms, move below the hysteresis band, and return to 30° or less.
- Tracking loss freezes the rep state. Trunk deviation gives feedback but does not diagnose or automatically alter exercise intensity.

## Optional Decisions adapter

Pawgress works entirely with deterministic local rules. No provider-specific Decisions API was assumed because no API documentation or vendor was supplied.

To integrate a documented server-side decision model, set:

```bash
VITE_DECISIONS_PROXY_URL=/api/decisions
```

At each feedback boundary, the browser sends this non-credential payload to your own same-origin proxy:

```json
{
  "event": {
    "id": "REP_COMPLETED-1234-1",
    "type": "REP_COMPLETED",
    "timestamp": 1234,
    "message": "Nice work! One ice hop closer.",
    "rep": 1,
    "metrics": { "armAngle": 20, "trunkLean": 1.2 }
  }
}
```

The proxy may return `{ "message": "..." }`. Requests time out after 1.2 seconds and always fall back to the local event message. Provider credentials belong only on that server; never use `VITE_` for secrets.

## Security and safety

- No frontend API keys, authentication, database, arbitrary code execution, or uploaded video.
- Uploads are restricted by MIME type and size and displayed from a browser-local object URL.
- Camera processing is local by default.
- Session recordings stay in versioned localStorage and can be cleared from the summary.
- Pawgress does not diagnose, prescribe a target, or automatically progress intensity. Users choose a visual game target and are told to follow their clinician's guidance and stop if movement feels unsafe.

## Concrete Codex use example

Codex was used to turn the MVP brief into working modules, then validate the result end to end:

> “Implement a pure TypeScript shoulder rep state machine with target hold and hysteresis; feed both simulated poses and MediaPipe frames through it; test that lowering below reset awards exactly one rep.”

The resulting tests exercise the same `updateRepState` and `stepExpedition` functions used by the live game. Codex also walked the complete upgraded demo in a local browser, visually inspected the mid-leap Canvas state and target-hold preset, checked the mobile breakpoint, and verified the browser console.

## 90-second demo video script

See [VIDEO_SCRIPT.md](./VIDEO_SCRIPT.md) for a timed shot list and narration.

## Notes for a production follow-up

This is intentionally an MVP, not a medical device. A production version would require clinician-led protocol design, accessibility/user testing, explicit consent and retention controls, a calibrated 3D motion validation study, offline model packaging, and a documented provider adapter reviewed against its actual API specification.
