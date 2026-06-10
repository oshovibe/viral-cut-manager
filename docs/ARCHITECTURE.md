# Viral Cut Manager — Architecture

> Document fondateur, rédigé le 10 juin 2026 à la veille de la Coupe du Monde FIFA 2026
> (11 juin – 19 juillet 2026), qui sert de premier projet testdrive.

## 1. Vision

Un outil qui centralise la création de vidéos virales (à partir de YouTube ou générées) et leur
publication sur TikTok, Instagram Reels et YouTube Shorts, **organisé par projet** et
**tourné vers les data et les revenus** : le cœur du produit n'est pas la production vidéo,
c'est le suivi de ce que chaque vidéo rapporte (vues, engagement, monétisation) et le ROI par projet.

Principes de cadrage (décisions prises) :

- **Human-in-the-loop** : le système propose, l'utilisateur valide avant publication.
- **Volume cible** : 5-10 vidéos/jour pendant la Coupe du Monde.
- **Dashboard web** comme interface principale.
- **Versatilité** : la production est un détail d'implémentation interchangeable (voir § 3).

## 2. Concept central : tout est un Projet, la production est un adaptateur

Les trois types de projets ne diffèrent que par le bloc production. Tout le reste
(validation, publication, stats, revenus, warm-up des comptes) est partagé dans le core.

```
                ┌──────────────────────────────────────────────┐
                │            VIRAL CUT MANAGER (core)           │
                │  Dashboard · DB · Validation · Publication    │
                │       · Analytics · Revenus · Warm-up         │
                └────────┬──────────────┬──────────────┬───────┘
                         │              │              │
               ┌─────────▼────┐ ┌───────▼──────┐ ┌─────▼────────────┐
               │ Adapter MPT  │ │ Adapter      │ │ Adapter          │
               │ (génération  │ │ Remakeit     │ │ Pipeline local   │
               │ from prompt, │ │ (production+ │ │ complet (clipping│
               │ fork crédité)│ │ publish chez │ │ YouTube → shorts)│
               │              │ │ eux ; ici on │ │                  │
               │              │ │ track)       │ │                  │
               └──────────────┘ └──────────────┘ └──────────────────┘
```

Interface d'un adapter (volontairement minuscule) : `produce(brief) → Video[]` + statut de job.
Ajouter un 4ᵉ type plus tard (ex. Ssemble API) = un fichier.

### 2.1 Type `local-mpt` — génération from prompt

Fork du pipeline de **[MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)**
(MIT, harry0703 — crédité dans `CREDITS.md` et dans le README du fork) : sujet → script LLM →
TTS (Edge TTS gratuit) → clips stock (Pexels/Pixabay) → sous-titres (faster-whisper) →
montage (MoviePy/FFmpeg). Backend FastAPI réutilisable tel quel comme worker.
Cas d'usage : contenu transformatif sans clip de match (tops, stats animées, storytelling).

### 2.2 Type `remakeit` — production déléguée au SaaS

**[Remakeit.io](https://remakeit.io)** fait clipping + sous-titres + auto-publish multi-réseaux,
mais **n'expose ni API ni MCP** (vérifié le 10 juin 2026). L'intégration est donc :
production et publication à la main dans leur UI, et notre dashboard sert de **suivi** —
on déclare les posts publiés (URL), le core collecte les stats et les revenus.
Tarifs constatés : Creator 19 €/mois, Expert 35 €/mois, Professional 75 €/mois (crédits).

### 2.3 Type `local-full` — pipeline clipping maison

Pipeline complet en local, inspiré de l'architecture de
**[claude-shorts](https://github.com/AgriciDaniel/claude-shorts)** (AgriciDaniel) :

```
yt-dlp (récupération) → ffmpeg (extraction audio) → faster-whisper (transcription)
→ scoring des segments par LLM → découpe + recadrage 9:16 → captions animées
→ export optimisé par plateforme (Shorts 12 Mbps / TikTok CRF 18 / Reels 4.5 Mbps)
```

Adaptation foot nécessaire : claude-shorts score du contenu *parlé* ; pour des matchs,
le scoring devra combiner pics d'énergie audio (stade), excitation du commentateur
et détection d'événements (buts, occasions).

## 3. Modèle de données (le vrai produit)

```
Project   (type: local-mpt | remakeit | local-full, niche, comptes, coûts)
 └─ Account     (plateforme, handle, état warm-up : new → warming → warmed,
 │              strikes/takedowns, statut santé)
 └─ Video       (asset produit, peu importe par qui, + brief/source)
     └─ Post    (1 vidéo × N plateformes : compte, url, date, hashtags, statut)
         └─ MetricSnapshot (vues, likes, shares, watch time — horodatés → courbes)
             └─ Revenue    (programme : TikTok Creator Rewards, YT Shorts,
                            bonus IG ; montants réels saisis + RPM estimé)
```

Règles d'or :

- **Snapshots horodatés**, jamais d'écrasement : les courbes de croissance sont la donnée clé.
- **Saisie manuelle des revenus en première classe** : aucune plateforme n'expose proprement
  les gains par API. RPM estimés par plateforme en attendant les montants réels.
- **ROI par projet** = revenus − coûts (abonnement Remakeit, crédits API, Upload-Post…).
  Champ coûts sur le Project, agrégation dans le dashboard.

## 4. Modules du core

### 4.1 Sourcing / veille
- **yt-dlp** pour récupérer les vidéos YouTube (watchlist de chaînes par projet).
- **[Monid](https://monid.ai)** (CLI + skill) pour la veille : tendances TikTok de la niche
  (vidéos, hashtags, profils) via scrapers Apify. Sert aussi aux analytics (§ 4.5).

### 4.2 Validation (inbox)
File de clips candidats dans le dashboard : preview, édition légère (titre, hashtags,
timecodes), approve/reject en 1 clic. C'est le goulot d'étranglement humain à 5-10 vidéos/jour,
donc l'UX est optimisée pour la décision rapide, pas pour le montage.

### 4.3 Publication
**[Upload-Post](https://www.upload-post.com)** : on connecte les comptes une fois sur leur
interface, ensuite une seule clé API pour publier sur TikTok, Instagram, YouTube (+7 autres).
Gratuit 10 uploads/mois, payant dès 12 $/mois (scheduling + analytics inclus).
Choisi pour éviter les processus d'approbation des APIs officielles (TikTok Content Posting,
Instagram Graph, YouTube Data) incompatibles avec le timing CdM.
Les projets `remakeit` court-circuitent ce module (publication chez Remakeit).

### 4.4 Module Warm-up (comptes TikTok)

Basé sur le skill **[tiktok-warmup](https://github.com/genfeedai/genfeed.ai/tree/master/skills/tiktok-warmup)**
de **genfeed.ai** (MIT), vendorisé tel quel dans `vendor/skills/tiktok-warmup/` avec attribution.
Le principe : TikTok assigne un trust score aux nouveaux comptes ; poster du contenu promotionnel
sans phase de warm-up enterre définitivement la distribution.

Intégration complète dans l'outil :

1. **Machine à états par compte** : `new → warming (J1-J2) → warmup_content (J3) →
   assessment (J3+48h) → warmed` (ou `extended` / `suppressed` selon le résultat).
2. **Génération du plan** : à la création d'un compte, le core génère depuis la niche du projet
   le keyword bank, les critères de follow, la checklist quotidienne (sessions matin/aprem/soir)
   et les templates de commentaires — directement depuis la méthode du skill.
3. **Checklist trackée dans le dashboard** : chaque session cochée est loguée
   (table `WarmupActivity`), avec rappels des interdits (pas de post J1-J2, pas de bio link,
   max 15-20 follows/jour, pas de commentaires dupliqués).
4. **Brief de contenu J3** : génération du brief slideshow (hook, slides, sound direction,
   caption < 100 caractères sans CTA, 3-7 hashtags, exigences d'images originales —
   détection de hash perceptuel TikTok).
5. **Assessment automatisé à J3+48h** : le module analytics compare les métriques du post
   warm-up aux seuils du skill (200+ vues, 60%+ watch time, >50% trafic FYP) et propose
   le verdict : `warmed`, `extend 3 jours`, ou `check suppression`.
6. **Gating de la publication** : le module publication **refuse l'auto-publish sur un compte
   non `warmed`** (override manuel possible, avec avertissement). Un compte frappé de
   strikes/takedowns peut être rétrogradé et repasser par un warm-up.

### 4.5 Analytics & revenus
- Collecte programmée (cron sur le Mac mini) : analytics Upload-Post + scrapers Monid
  pour les posts hors Upload-Post (projets Remakeit notamment).
- Saisie manuelle des revenus + RPM estimés.
- Dashboard : courbes par vidéo/plateforme, top contenus, ROI par projet,
  santé des comptes (warm-up, strikes).
- Boucle de feedback : les patterns gagnants (type de moment, durée, hook) redescendent
  vers le scoring du pipeline `local-full`.

## 5. Stack & infra (décisions prises)

| Choix | Décision | Pourquoi |
|---|---|---|
| Dashboard | **Next.js** | UI riche (inbox, courbes), écosystème |
| Workers | **Python** (FastAPI) | yt-dlp, faster-whisper, MoviePy, fork MPT déjà en Python |
| Communication | DB partagée + table de jobs (queue simple) | pas de broker à maintenir en solo |
| DB | **SQLite** | zéro setup, solo, local ; migration Postgres possible via ORM |
| Hébergement | **Local sur le Mac mini** | zéro coût, Apple Silicon pour whisper, stockage vidéos local |

## 6. Structure du repo (monorepo)

```
viral-cut-manager/
├─ apps/
│  ├─ dashboard/          # Next.js (UI : projets, inbox, stats, revenus, warm-up)
│  └─ api/                # FastAPI (jobs, webhooks, orchestration des adapters)
├─ pipelines/
│  ├─ mpt/                # fork MoneyPrinterTurbo (MIT, crédité)
│  └─ clipper/            # pipeline local complet (type local-full)
├─ vendor/
│  └─ skills/tiktok-warmup/  # skill genfeed.ai vendorisé (MIT, non modifié)
├─ packages/
│  └─ shared/             # schémas DB, types partagés
├─ docs/
│  └─ ARCHITECTURE.md     # ce document
└─ CREDITS.md             # attributions et licences
```

## 7. Phasage (calé sur la Coupe du Monde, qui démarre le 11 juin 2026)

| Phase | Contenu | Objectif |
|---|---|---|
| **0** (jours 1-2) | Core data : DB, projets, comptes + warm-up tracking, type `remakeit` | Produire chez Remakeit dès le jour 1, tout tracker ici |
| **1** | Publication Upload-Post + inbox de validation | Publier depuis l'outil |
| **2** | Pipeline `local-full` (clipping) | Autonomie production, 5-10 vidéos/jour |
| **3** | Adapter `local-mpt` (fork MoneyPrinterTurbo) | Contenu généré sans clips de matchs |

## 8. Risques identifiés

- **Copyright FIFA** : les clips de matchs sont les contenus les plus enforcés (Content ID,
  strikes, bans). Mitigations : transformations (zoom/crop, overlays, voix off), suivi
  strikes/takedowns par compte dans le core, type `local-mpt` comme repli 100 % transformatif.
- **Ban de comptes** : mitigé par le module warm-up et le suivi de santé des comptes.
- **Dépendance Remakeit sans API** : assumée et confinée au type de projet `remakeit` ;
  l'outil reste fonctionnel sans eux.
- **Quotas Upload-Post** : 5-10 vidéos/jour × 3 plateformes ≈ 450-900 uploads/mois → plan payant.

## 9. Ressources de référence

- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) — pipeline génération (MIT, forké)
- [tiktok-warmup de genfeed.ai](https://github.com/genfeedai/genfeed.ai/tree/master/skills/tiktok-warmup) — méthode warm-up (MIT, vendorisé)
- [claude-shorts](https://github.com/AgriciDaniel/claude-shorts) — inspiration architecture clipping
- [Upload-Post](https://www.upload-post.com/skills/claude-code/) — publication multi-plateforme
- [Monid](https://monid.ai) — extraction de données sociales (veille + analytics)
- [Remakeit.io](https://remakeit.io) — SaaS production/publication (type de projet dédié)
- [Skill tiktok-marketing](https://claudemarketplaces.com/skills/claude-office-skills/skills/tiktok-marketing) — règles métier contenu (hooks, créneaux, hashtags)
- [crawl4ai](https://github.com/unclecode/crawl4ai) — outillage de veille web du projet
