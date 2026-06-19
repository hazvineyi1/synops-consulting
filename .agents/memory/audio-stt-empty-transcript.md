---
name: Audio STT returns empty string, not an error
description: gpt-4o-mini-transcribe via the Replit OpenAI proxy yields "" (no throw) for silent/no-speech/undecodable audio; treat empty transcript as failure.
---

The integration `speechToText` (gpt-4o-mini-transcribe, via the Replit OpenAI
proxy) returns an EMPTY string for silent, no-speech, or otherwise undecodable
audio. It does NOT throw. A valid recording with actual speech transcribes
correctly in both the direct-webm path and the ffmpeg wav-transcode path; the
empty result is specific to there being nothing to transcribe.

**Why:** A transcribe-to-notes helper that only catches thrown errors will treat
a silent recording as a successful empty transcript and persist garbage. During
this feature a real 72s webm test recording came back as "" purely because it
had no speech, while a TTS->STT round-trip returned the exact text.

**How to apply:** After calling speechToText, check for an empty (trimmed)
transcript and map it to the same failure path as a decode error (here: HTTP
422). Do not assume "no throw" means "got text". webm/wav format choice is NOT
the cause of an empty transcript; do not chase it as a format bug.
