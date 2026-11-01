# Pawgress — 90-second demo script

## 0:00–0:10 — The idea

**Screen:** Welcome page, slow cursor movement over Mochi.

**Narration:** “Rehabilitation can feel repetitive and lonely. Pawgress turns a photo of your own pet into a playful movement companion. The promise is simple: get better together.”

## 0:10–0:22 — Choose a buddy

**Screen:** Select **Meet your buddy**. Show Mochi and the upload card. Briefly choose a pet photo if available, then use Mochi for the fast demo.

**Narration:** “Choose a validated local image, or use Mochi, the clearly labelled bundled demo pet. Photos stay in the browser—there is no account or upload service.”

## 0:22–0:35 — Safe setup

**Screen:** Select **Hatch My Pet**. Show the camera preview, local-processing badge, target slider, and safety text. Select **Use instant demo**.

**Narration:** “Camera mode uses MediaPipe locally to estimate shoulder elevation and trunk movement from shoulder, elbow, and hip landmarks. The visual target is user-configurable; Pawgress does not prescribe intensity. For a reliable hackathon demo, I’ll use simulated pose input.”

## 0:35–1:00 — Play

**Screen:** Click **Complete a demo rep** three times, leaving enough time to show each target and rep event. Focus on the pet hopping, platforms lighting, stars, meters, and feedback card.

**Narration:** “Both live and demo input use the same deterministic state machine: raise above the target, hold, lower through a hysteresis band, then return. Each full cycle emits one reward—never two. Event-based voice coaching never overlaps, and tracking loss or trunk movement has deterministic feedback.”

## 1:00–1:14 — Celebration and Ghost Mode

**Screen:** Show the island celebration, then the summary transition. If a prior camera session exists, briefly mention the Ghost toggle.

**Narration:** “Three successful reps bring your buddy to the island. Ghost Mode records timestamps, keypoints, and metrics so a prior local session can replay as a translucent reference skeleton.”

## 1:14–1:26 — Results

**Screen:** Hold on summary cards and past-session comparison.

**Narration:** “The summary shows reps, peak estimated elevation, trunk movement, time, and a local past-session comparison. Simulated data is explicitly labelled.”

## 1:26–1:30 — Close

**Screen:** Pawgress logo and tagline.

**Narration:** “Pawgress: a small movement, a shared adventure. Get better together.”
