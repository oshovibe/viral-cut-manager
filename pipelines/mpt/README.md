# pipelines/mpt — adaptateur `local-mpt` (à venir, Phase 3)

Emplacement réservé pour le **fork de [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)**
(© harry0703, MIT — voir `../../CREDITS.md`), qui implémentera le type de projet `local-mpt` :
génération de vidéos à partir d'un prompt (script LLM → TTS → clips stock → sous-titres → montage).

Interface attendue côté core (cf. `docs/ARCHITECTURE.md`) : `produce(brief) → Video[]` + statut de job.

> Non encore implémenté dans la v1 (Phase 0). La v1 couvre le core data/revenus et le type `remakeit`.
