# Crédits & licences

Viral Cut Manager s'appuie sur le travail de projets open source et de services tiers,
crédités ici et aux endroits où leur code/méthode est utilisé.

## Code et méthodes intégrés

- **[MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)** — © harry0703, licence MIT.
  Le pipeline de génération vidéo (script LLM → TTS → clips stock → sous-titres → montage)
  est forké dans `pipelines/mpt/` pour le type de projet `local-mpt`. La licence MIT et le
  copyright d'origine sont conservés dans le fork.

- **[tiktok-warmup](https://github.com/genfeedai/genfeed.ai/tree/master/skills/tiktok-warmup)** —
  © genfeed.ai (genfeedai), licence MIT, version 1.0.0.
  Méthode de warm-up de comptes TikTok, vendorisée sans modification dans
  `vendor/skills/tiktok-warmup/` et implémentée par le module Warm-up du core
  (machine à états, checklists, briefs J3, assessment).

## Inspirations d'architecture

- **[claude-shorts](https://github.com/AgriciDaniel/claude-shorts)** — © AgriciDaniel.
  Le pipeline `local-full` (transcription faster-whisper, scoring LLM des segments,
  captions animées, exports par plateforme) s'inspire de son architecture.

## Services tiers

- **[Remakeit.io](https://remakeit.io)** — SaaS de clipping/publication (type de projet `remakeit`).
- **[Upload-Post](https://www.upload-post.com)** — API de publication multi-plateforme.
- **[Monid](https://monid.ai)** — extraction de données sociales (veille et analytics).

## Outillage

- **[crawl4ai](https://github.com/unclecode/crawl4ai)** — © unclecode, Apache 2.0. Veille et
  extraction web du projet.
- **yt-dlp, FFmpeg, faster-whisper** — récupération et traitement vidéo (licences respectives).
