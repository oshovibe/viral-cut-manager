# pipelines/clipper — adaptateur `local-full` (à venir, Phase 2)

Emplacement réservé pour le **pipeline de clipping maison**, inspiré de l'architecture de
[claude-shorts](https://github.com/AgriciDaniel/claude-shorts) (© AgriciDaniel — voir `../../CREDITS.md`) :

```
yt-dlp → ffmpeg (extraction audio) → faster-whisper (transcription)
→ scoring des segments par LLM → découpe + recadrage 9:16 → captions animées
→ export optimisé par plateforme
```

Adaptation foot prévue : scoring combinant pics d'énergie audio (stade), excitation du
commentateur et détection d'événements (buts, occasions).

Interface attendue côté core : `produce(brief) → Video[]` + statut de job.

> Non encore implémenté dans la v1 (Phase 0).
