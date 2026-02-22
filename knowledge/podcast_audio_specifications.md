# Podcast & Audio Broadcast Specifications

This document outlines the finalized and user-approved audio standards for the "The Archive" podcast and book reviews. These settings should be strictly followed for all future content updates to ensure consistency and a high-quality global audio experience.

## 🎙️ Global Audio Settings (AudioContext.jsx)

### Voice Configuration (Google Cloud TTS)
- **Role A (James/Host):** `ko-KR-Chirp3-HD-Achird`
- **Role B (Stella/Co-host):** `ko-KR-Chirp3-HD-Leda`
- **Speaking Rate:** `1.0` (Fixed - Do not change as it prevents acceleration issues)
- **Pitch:** `0.0`
- **Audio Encoding:** `MP3`

### Music & Mixing (Radio-Style Ducking)
- **Standard Theme:** "The Entertainer" (Scott Joplin)
- **Music URL:** `https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Entertainer.mp3`
- **Solo Volume:** `0.5` (Max volume during intro/outro solos)
- **Background Volume:** `0.2` (Ducked volume during speech)
- **Intro Timing:** 4 seconds (4000ms) of music solo before speech starts.
- **Total Duration:**
  - **Intro:** 16 seconds (16000ms) total background play.
  - **Outro:** 8 seconds (8000ms) total with slow fade.
- **Fade Dynamics:**
  - **Ducking:** -0.02 volume every 100ms until background level is reached.
  - **Fade-out:** -0.005 volume every 200ms for a "smoke-like" disappearance.

## 📝 Scripting & Editorial Standards

To maintain a professional broadcast feel and natural speech flow, all scripts must adhere to the following linguistic rules:

### 1. No Fillers or Markers
- **Prohibited:** "Ha", "Um", "Ah", "Wow", and visual markers like `(Laughter)`, `(Pause)`, `(Wait)`.
- **Reason:** These sound artificial when processed by TTS. Naturalness should be achieved through sentence structure.

### 2. Conversational Korean Endings
- Avoid stiff or literary endings. Use fluid, spoken Korean endings:
  - `~거든요`
  - `~고요`
  - `~니까요`
  - `~잖아요`
  - `~하네요`
- **Example:** Instead of "사피엔스가 지배자가 되었다.", use "사피엔스가 지배자가 된 거거든요."

### 3. Sentence Flow & Punctuation
- Use commas (`,`) to create natural pauses for the TTS engine.
- Ensure sentences are linked logically within a single speech block to maintain the "Radio" rhythm.
- Avoid repetitive sentence starts.

## 🚀 Execution Logic
- All audio is managed via the global `AudioContext` to allow persistent playback during page navigation.
- Prefetching is required for all dialogue lines to eliminate network gaps between speakers (80ms gap standard).

---
*Created: 2026-02-21*
*Status: Locked (User-Approved)*
