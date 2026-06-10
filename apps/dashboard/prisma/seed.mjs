import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.project.findFirst({
    where: { name: "Coupe du Monde 2026" },
  });
  if (existing) {
    console.log("Seed déjà présent (Coupe du Monde 2026). Rien à faire.");
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: "Coupe du Monde 2026",
      type: "remakeit",
      niche: "football / coupe du monde",
      notes:
        "Projet testdrive. Production & publication via Remakeit ; suivi data/revenus ici.",
    },
  });

  // Coût récurrent : abonnement Remakeit (plan Creator).
  await prisma.cost.create({
    data: {
      projectId: project.id,
      label: "Abonnement Remakeit (Creator)",
      amountCents: 1900,
      recurring: true,
      note: "19 €/mois — plan Creator",
    },
  });

  // Un compte TikTok à warm-up + un compte YouTube.
  await prisma.account.create({
    data: { projectId: project.id, platform: "tiktok", handle: "cdm2026clips" },
  });
  await prisma.account.create({
    data: { projectId: project.id, platform: "youtube", handle: "cdm2026shorts" },
  });

  // Une vidéo d'exemple dans l'inbox de validation.
  await prisma.video.create({
    data: {
      projectId: project.id,
      title: "Top 3 buts — match d'ouverture",
      sourceType: "youtube",
      sourceUrl: "https://www.youtube.com/",
      producedBy: "remakeit",
      brief: "Highlights du match d'ouverture, format 9:16, sous-titres FR.",
      durationSec: 42,
      status: "in_review",
    },
  });

  console.log(`Seed OK — projet « ${project.name} » créé.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
