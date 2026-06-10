// Module Warm-up TikTok.
//
// Encode la méthode du skill `tiktok-warmup` de genfeed.ai (MIT), vendorisé dans
// vendor/skills/tiktok-warmup/. Voir CREDITS.md. Le skill reste la source de vérité
// méthodologique ; ce fichier en est l'implémentation déterministe (génération de plans,
// briefs et assessment depuis la niche d'un projet, sans appel LLM en v1).

export type ChecklistItem = { key: string; label: string };

export type WarmupPlan = {
  niche: string;
  durationDays: number;
  keywordBank: {
    broad: string[];
    problem: string[];
    creator: string[];
    trend: string[];
  };
  followCriteria: string[];
  doNotFollow: string[];
  dailyChecklist: {
    morning: ChecklistItem[];
    afternoon: ChecklistItem[];
    evening: ChecklistItem[];
  };
  commentTemplates: string[];
  doNots: string[];
};

export type WarmupBrief = {
  niche: string;
  topic: string;
  whyThisTopic: string;
  format: string;
  slides: { role: string; textOverlay: string; imageDirection: string }[];
  soundDirection: string;
  caption: string;
  hashtags: string[];
  imageRequirements: string[];
  prePostChecklist: string[];
};

export type WarmupAssessmentInput = {
  views: number;
  watchTimePct: number;
  fypTrafficPct: number;
  profileVisits?: number;
  newFollowers?: number;
};

export type WarmupVerdict = "warmed" | "extended" | "suppressed";

export type WarmupAssessment = {
  verdict: WarmupVerdict;
  summary: string;
  nextStep: string;
  thresholds: typeof WARMUP_THRESHOLDS;
  input: WarmupAssessmentInput;
};

// Seuils issus de la section "Post-Warmup Assessment" du skill.
export const WARMUP_THRESHOLDS = {
  views: 200,
  watchTimePct: 60,
  fypTrafficPct: 50,
  profileVisits: 20,
};

// La checklist quotidienne J1-J2 — clés stables pour le tracking en base (WarmupActivity).
export const DAILY_CHECKLIST: WarmupPlan["dailyChecklist"] = {
  morning: [
    { key: "fyp_watch", label: "5-10 min de FYP, visionnage à 80%+ sans skip (watch time)" },
    { key: "search_1", label: "Rechercher mot-clé niche #1 — regarder le top, suivre 3-5 comptes" },
    { key: "search_2", label: "Rechercher mot-clé niche #2 — regarder le top, suivre 3-5 comptes" },
    { key: "comments_3", label: "Laisser 2-3 commentaires sincères (templates ci-dessous)" },
  ],
  afternoon: [
    { key: "fyp_engage", label: "Engager avec la FYP recalibrée — récompenser la niche par du watch time" },
    { key: "like_5_10", label: "Liker 5-10 vidéos représentant la qualité visée" },
    { key: "duet_stitch", label: "Ouvrir Duet/Stitch sur 1 vidéo niche (poster non recommandé si tôt)" },
  ],
  evening: [
    { key: "scroll_5", label: "Scroller 5 min (watch time passif)" },
    { key: "save_sounds", label: "Sauvegarder 2-3 sons natifs de la niche (signal audio)" },
    { key: "discover", label: "Onglet Discover : interagir avec 1-2 sujets tendance de la niche" },
  ],
};

export const COMMENT_TEMPLATES = [
  "Observation précise : « Le passage où tu [détail démontré] répond à une vraie question que j'avais — [pourquoi ça résonne / ce que je vais tester]. »",
  "Question qui prouve le visionnage : « À [moment] — est-ce que [technique] marche mieux que [alternative] ? Je fais [X] et je me demande s'il y a une différence. »",
  "Valeur ajoutée : « Pour compléter — [info pertinente que le créateur n'a pas mentionnée]. Super décryptage. »",
  "Connexion perso : « C'est exactement ce qui m'est arrivé en testant [chose proche]. Fini par [résultat]. Je te suis pour la suite. »",
];

export const COMMENT_RULES = [
  "Jamais le même commentaire deux fois",
  "Jamais de commentaire 100% emoji (invisible pour l'algo)",
  "Éviter « super vidéo », « j'adore », « trop utile » (indistinguables d'un bot)",
  "Garder sous 150 caractères sur un compte neuf (anti-spam)",
  "Espacer : 3 par session, pas 10 d'affilée",
];

export const DO_NOTS_J1_J2 = [
  "NE PAS poster de contenu",
  "NE PAS ajouter de lien en bio (signal de monétisation = scrutin précoce)",
  "NE PAS suivre en masse (max 15-20 comptes/jour, pas en rafale)",
  "NE PAS réutiliser le même commentaire sur plusieurs vidéos",
  "NE PAS engager hors niche (ça dilue le signal)",
  "NE PAS connecter d'outil de scheduling tiers maintenant",
];

const FOLLOW_CRITERIA = [
  "Poste au moins 3x/semaine sur le dernier mois",
  "Moins de 500K abonnés (mid-tier = audience plus engagée dans la niche)",
  "Engagement authentique (commentaires spécifiques, pas que des emojis)",
  "Format similaire à ce que tu comptes créer",
];

const DO_NOT_FOLLOW = [
  "Comptes de marque/corporate de la niche (sauf si tu es une marque)",
  "Comptes inactifs depuis 2+ semaines",
  "Comptes au ratio abonnés/engagement suspect (chiffres gonflés)",
];

const IMAGE_REQUIREMENTS = [
  "Photos originales uniquement — pas de banque d'images (le hash perceptuel TikTok les détecte)",
  "Pas de captures d'écran d'autres apps/plateformes (signal de cross-contamination)",
  "Pas d'images recyclées de tes autres réseaux (toujours des doublons dans l'index TikTok)",
  "Prises au téléphone/appareil et uploadées fraîches (métadonnées uniques)",
  "Cadrage cohérent mais non identique (variété = création authentique)",
];

// Banques de mots-clés par niche. La CdM/foot est pré-remplie ; sinon, gabarit générique.
function keywordBankFor(niche: string): WarmupPlan["keywordBank"] {
  const n = niche.toLowerCase();
  if (/(foot|soccer|coupe du monde|world cup|fifa|match)/.test(n)) {
    return {
      broad: ["coupe du monde 2026", "but de folie", "highlights foot", "skills football"],
      problem: ["meilleur but du match", "ralenti penalty", "analyse tactique foot"],
      creator: ["compte foot tiktok", "créateur football shorts"],
      trend: ["célébration but", "geste technique 2026"],
    };
  }
  return {
    broad: [`${niche} pour débutants`, `bases ${niche}`, `${niche} expliqué`],
    problem: [`comment réussir en ${niche}`, `erreurs ${niche} à éviter`],
    creator: [`créateur ${niche}`, `${niche} motivation`],
    trend: [`tendance ${niche} 2026`, `challenge ${niche}`],
  };
}

export function generateWarmupPlan(niche: string): WarmupPlan {
  return {
    niche,
    durationDays: 2,
    keywordBank: keywordBankFor(niche),
    followCriteria: FOLLOW_CRITERIA,
    doNotFollow: DO_NOT_FOLLOW,
    dailyChecklist: DAILY_CHECKLIST,
    commentTemplates: COMMENT_TEMPLATES,
    doNots: DO_NOTS_J1_J2,
  };
}

// Gabarits de topics warm-up J3 (slideshow value, sans CTA promo).
function topicFor(niche: string): { topic: string; why: string } {
  const n = niche.toLowerCase();
  if (/(foot|soccer|coupe du monde|world cup|fifa|match)/.test(n)) {
    return {
      topic: "5 choses que personne ne remarque dans les ralentis de buts",
      why: "Pure valeur niche foot, save-worthy, zéro agenda promo — l'algo classe le compte comme « football ».",
    };
  }
  return {
    topic: `5 choses que j'aurais aimé savoir avant de me lancer en ${niche}`,
    why: `Pure valeur dans la niche ${niche}, sauvegardable et partageable, sans CTA promo.`,
  };
}

function hashtagsFor(niche: string): string[] {
  const n = niche.toLowerCase();
  if (/(foot|soccer|coupe du monde|world cup|fifa|match)/.test(n)) {
    return ["#football", "#coupedumonde2026", "#footballtiktok", "#but"];
  }
  const tag = niche.replace(/\s+/g, "").toLowerCase();
  return [`#${tag}`, `#${tag}tips`, `#apprendre`, `#fyp`];
}

export function generateWarmupBrief(niche: string): WarmupBrief {
  const { topic, why } = topicFor(niche);
  return {
    niche,
    topic,
    whyThisTopic: why,
    format: "Carrousel photo (slideshow TikTok), 3-8 slides, son tendance",
    slides: [
      { role: "Slide 1 — Hook", textOverlay: "[Titre choc, 6 mots max, gros et gras]", imageDirection: "[Image précise qui crée la curiosité — pas « image pertinente »]" },
      { role: "Slide 2", textOverlay: "[Point 1 — une seule idée, < 20 mots]", imageDirection: "[Visuel qui illustre le point]" },
      { role: "Slide 3", textOverlay: "[Point 2 — une seule idée]", imageDirection: "[Visuel dédié]" },
      { role: "Slide 4", textOverlay: "[Point 3 — une seule idée]", imageDirection: "[Visuel dédié]" },
      { role: "Slide finale — Soft CTA", textOverlay: "Enregistre ça / Partage (aucun appel promo)", imageDirection: "[Visuel propre et minimal]" },
    ],
    soundDirection:
      "Chercher dans la bibliothèque de sons un titre tendance de la niche ; tempo adapté au nombre de slides ; fallback : instrumental du genre si aucun son niche tendance.",
    caption: `${topic} (légende < 100 caractères, aucun CTA)`.slice(0, 100),
    hashtags: hashtagsFor(niche),
    imageRequirements: IMAGE_REQUIREMENTS,
    prePostChecklist: [
      "Compte âgé d'au moins 2 jours avec activité d'engagement loguée",
      "Toutes les images originales, jamais postées ailleurs",
      "Pas de banque d'images, captures ou assets recyclés",
      "Légende < 100 caractères, sans CTA ni lien",
      "3-7 hashtags, tous niche-pertinents",
      "Son tendance ET niche-approprié (pas juste populaire)",
      "Aucun lien en bio ajouté",
      "Pas de mention produit/service/marque/prix",
      "Slide finale : soft CTA valeur uniquement (enregistre/partage)",
    ],
  };
}

export function assessWarmup(input: WarmupAssessmentInput): WarmupAssessment {
  const t = WARMUP_THRESHOLDS;
  const allFromFollowing = input.fypTrafficPct <= 0;
  let verdict: WarmupVerdict;
  let summary: string;
  let nextStep: string;

  if (input.views >= t.views && input.watchTimePct >= t.watchTimePct && input.fypTrafficPct > t.fypTrafficPct) {
    verdict = "warmed";
    summary = `Vues ${input.views} ≥ ${t.views}, watch time ${input.watchTimePct}% ≥ ${t.watchTimePct}%, trafic FYP ${input.fypTrafficPct}% > ${t.fypTrafficPct}%.`;
    nextStep = "Warm-up réussi — passer à une cadence de publication graduée.";
  } else if (input.views < 50 || allFromFollowing) {
    verdict = "suppressed";
    summary = `Signaux faibles (vues ${input.views}, trafic FYP ${input.fypTrafficPct}%).`;
    nextStep = "Vérifier une suppression : auditer le lien bio, relire le post pour des soucis de politique.";
  } else {
    verdict = "extended";
    summary = `Résultats intermédiaires (vues ${input.views}, watch time ${input.watchTimePct}%, FYP ${input.fypTrafficPct}%).`;
    nextStep = "Prolonger le warm-up : 3 jours d'engagement seul, puis re-tester.";
  }

  return { verdict, summary, nextStep, thresholds: t, input };
}
