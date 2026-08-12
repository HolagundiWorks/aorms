# AORMS hero — Nano Banana short video brief

**Job:** 6–8s silent loop for the aorms.in landing hero (dark Coal Black band).  
**Model path:** Nano Banana / Nano Banana 2 for **keyframes** → image-to-video (Veo or similar) for motion.  
**Brand lock:** Urbanist is page type only — **no text, logos, or UI chrome in the video**. Palette: Coal `#141517`, Fog `#F2F4F7`, Radiant Orange `#FF4F18` as scarce light accents only.

**Deliverables to drop in:**

| File | Role |
| --- | --- |
| `frontend/public/landing/hero/aorms-aec-loop.mp4` | Primary hero loop (H.264, ≤8s, muted, seamless) |
| `frontend/public/landing/hero/aorms-aec-loop.webm` | Optional smaller WebM |
| `frontend/public/landing/hero/aorms-aec-poster.jpg` | First-frame poster (16:9, 1920×1080) |

Hero component: `LandingHeroVideo` — plays only when `aorms-aec-loop.mp4` exists; poster alone is fine until the encode lands.

---

## Creative intent (one sentence)

Slow cinematic drift through an Indian AEC consulting atelier at dusk — drawings, model, city beyond the glass — so the suite feels built for architecture, engineering, and construction, not generic SaaS.

---

## Nano Banana — paste-ready keyframe prompts

Use **one prompt per generation**. Stay in the same chat thread to iterate (“Keep everything else exactly the same…”). Aspect **16:9**, resolution **2K**. Positive framing only.

### Frame 01 — open (poster + loop start)

Create a cinematic wide establishing still for a website hero background. Soft dusk light in a contemporary Indian architecture studio: long drafting table with rolled tracings and a physical massing model of a mid-rise concrete building, floor-to-ceiling glass looking onto a humid Bangalore-like skyline of towers and construction cranes. Camera is a low three-quarter angle, 35mm lens, shallow depth of field (f/2.0), focus on the model, background city softly bokeh. Colour grade is dark coal black shadows, cool fog-gray midtones, and a single scarce radiant orange `#FF4F18` accent from a desk task lamp and one distant facade light. Pure photographic realism, fine material texture on paper and concrete, calm and precise — no people in the foreground, no screens showing readable UI, no logos, no typography, no glassmorphism, no purple neon, no stock-photo smile. Empty left third of frame for later text overlay. Aspect ratio 16:9, 2K.

### Frame 02 — mid (AEC beat)

Keep the same atelier, lighting, colour grade, and camera language as the previous frame. Slow visual progress: the massing model is closer in frame; a steel rebar cage sketch and a printed BOQ sheet sit at the edge of the desk; through the glass a tower crane rotates almost imperceptibly. Still photographic, still dark coal canvas with scarce radiant orange lamp light. No people faces, no logos, no readable brand text, no UI mockups. Aspect ratio 16:9, 2K.

### Frame 03 — close (loop end → match Frame 01)

Return to a composition that can seamless-loop back to Frame 01: wider again, model and city balanced, orange task lamp in the same position, same dusk grade, same empty left third for type. Photographic still, architecture consulting mood, no logos, no typography, no neon purple. Aspect ratio 16:9, 2K.

---

## Image-to-video / motion prompt (after keyframes)

Use Frame 01 as first frame and Frame 03 as last frame (or Frame 01 → Frame 01 for a true loop).

Animate a seamless 7-second silent cinematic loop. Extremely slow camera push-in toward the architectural massing model on the drafting table, with faint parallax on the city skyline and a nearly imperceptible rotation of a distant tower crane. Soft dust motes in the orange lamp beam. Hold the dark coal black grade and scarce radiant orange accents. No cuts, no text, no logos, no UI overlays, no people walking through frame. Motion is calm and expensive — architecture film B-roll, not tech trailer. 16:9, 24fps, muted.

---

## Optional Nano Banana storyboard grid (planning only)

Generate a 2×3 storyboard grid of six consistent 16:9 frames for an AORMS AEC consulting hero loop: (1) dusk atelier wide, (2) massing model detail, (3) desk with drawings and BOQ sheet, (4) glass and crane skyline, (5) orange task lamp rim light, (6) return to wide empty-left composition. Same studio, same dusk grade, coal black and fog gray with scarce radiant orange accents, photographic, no text, no logos.

---

## Export checklist

- [ ] Mute audio track (hero autoplays muted)
- [ ] Trim to 6–8s; crossfade or match-cut ends for loop
- [ ] Export H.264 MP4 + poster JPEG from Frame 01
- [ ] Keep safe zone: left ~35% darker / emptier for brand + headline
- [ ] File size target under ~4 MB if possible (compress for marketing VPS)
- [ ] Drop into `frontend/public/landing/hero/` with the filenames above
