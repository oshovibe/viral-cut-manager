# Viral Cut Manager

Outil open source qui **centralise la création de vidéos virales** (à partir de YouTube ou
générées) et leur publication sur TikTok, Instagram Reels et YouTube Shorts — organisé
**par projet** et tourné vers les **data et les revenus**.

Le cœur du produit n'est pas la production vidéo (volontairement interchangeable), c'est le
suivi de ce que chaque vidéo rapporte — vues, engagement, monétisation — et le **ROI par projet**.

> Premier projet testdrive : la Coupe du Monde FIFA 2026.

## Concept : tout est un Projet, la production est un adaptateur

Trois types de projets partageant le même core (data, validation, publication, stats, revenus,
warm-up des comptes) :

| Type | Production | Publication |
|------|-----------|-------------|
| `local-mpt` | Fork de [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) (génération from prompt) | Manuelle / API |
| `remakeit` | Déléguée à [Remakeit.io](https://remakeit.io) | Chez Remakeit ; le dashboard track |
| `local-full` | Pipeline clipping maison (yt-dlp → whisper → scoring → ffmpeg) | Manuelle / API |

L'interface d'un adaptateur est minuscule (`produce(brief) → Video[]`), donc en ajouter un
quatrième = un fichier.

## Module Warm-up TikTok

Intègre la méthode du skill MIT [tiktok-warmup de genfeed.ai](https://github.com/genfeedai/genfeed.ai/tree/master/skills/tiktok-warmup)
(vendorisé dans `vendor/skills/`) : machine à états par compte (`new → warming → warmed`),
checklists d'engagement J1-J2, brief de contenu J3, assessment à J3+48h, et **gating de la
publication** sur les comptes non « warmed ».

## Stack

- **Dashboard** : Next.js (App Router, TypeScript, Tailwind)
- **Données** : Prisma + SQLite (local, zéro setup)
- **Workers** (phases ultérieures) : Python (yt-dlp, faster-whisper, MoviePy, fork MPT)
- **Hébergement** : local (Mac mini)

## Démarrage

### App Mac (recommandé) — tout-en-un

Une app Electron lance l'outil sans terminal : double-clic → elle migre la base, charge les
données d'exemple, démarre le serveur et ouvre la fenêtre.

```bash
# 1. Préparer le dashboard (une fois)
cd apps/dashboard && npm install && cp .env.example .env && npm run build && cd ..

# 2. Construire l'app Mac
cd desktop && npm install && npm run dist
# → apps/desktop/dist/mac-arm64/Viral Cut Manager.app  (glisser dans Applications)
```

En développement, sans packager : `cd apps/desktop && npm install && npm start`.
La base de données de l'app vit dans `~/Library/Application Support/Viral Cut Manager/vcm.db`.

### En navigateur (dev)

```bash
cd apps/dashboard
npm install
cp .env.example .env
npx prisma migrate dev      # crée la base SQLite
npm run seed                # projet "Coupe du Monde 2026" + données d'exemple
npm run dev                 # http://localhost:3000
```

## Statut

| Phase | Contenu | État |
|-------|---------|------|
| **0** | Core data : projets, comptes + warm-up, suivi manuel des posts, stats, revenus, ROI | ✅ v1 |
| 1 | Intégration API de publication multi-plateforme | à venir |
| 2 | Pipeline `local-full` (clipping) | à venir |
| 3 | Adaptateur `local-mpt` (fork MoneyPrinterTurbo) | à venir |

> La v1 fonctionne **sans aucun abonnement tiers** : la publication se déclare et se suit
> manuellement (URL du post), exactement comme pour un projet Remakeit.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture complète, modèle de données, phasage, risques
- [`CREDITS.md`](CREDITS.md) — attributions et licences

## Licence

[MIT](LICENSE). Ce projet réutilise et crédite plusieurs travaux open source — voir [`CREDITS.md`](CREDITS.md).
