"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { str, num, fnum, toCents } from "./format";
import {
  generateWarmupPlan,
  generateWarmupBrief,
  assessWarmup,
} from "./warmup";
import { PUBLISH_READY_STATE } from "./enums";

// ---------- Projets ----------

export async function createProject(formData: FormData) {
  const project = await prisma.project.create({
    data: {
      name: str(formData.get("name")),
      type: str(formData.get("type")) || "remakeit",
      niche: str(formData.get("niche")),
      notes: str(formData.get("notes")) || null,
    },
  });
  revalidatePath("/");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

// ---------- Comptes ----------

export async function createAccount(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  await prisma.account.create({
    data: {
      projectId,
      platform: str(formData.get("platform")),
      handle: str(formData.get("handle")),
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function startWarmup(formData: FormData) {
  const accountId = str(formData.get("accountId"));
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: { project: true },
  });
  const plan = generateWarmupPlan(account.project.niche);
  await prisma.account.update({
    where: { id: accountId },
    data: {
      warmupState: "warming",
      warmupStartedAt: account.warmupStartedAt ?? new Date(),
      warmupPlanJson: JSON.stringify(plan),
    },
  });
  revalidatePath(`/accounts/${accountId}`);
}

export async function logWarmupActivity(formData: FormData) {
  const accountId = str(formData.get("accountId"));
  const day = num(formData.get("day"));
  const session = str(formData.get("session"));
  // Les clés cochées arrivent comme des champs "item:<key>".
  const checklist: Record<string, boolean> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("item:")) checklist[k.slice(5)] = v === "on" || v === "true";
  }
  await prisma.warmupActivity.create({
    data: {
      accountId,
      day,
      session,
      checklistJson: JSON.stringify(checklist),
      notes: str(formData.get("notes")) || null,
    },
  });
  revalidatePath(`/accounts/${accountId}`);
}

export async function generateBrief(formData: FormData) {
  const accountId = str(formData.get("accountId"));
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: { project: true },
  });
  const brief = generateWarmupBrief(account.project.niche);
  await prisma.account.update({
    where: { id: accountId },
    data: {
      warmupState: "warmup_content",
      warmupBriefJson: JSON.stringify(brief),
    },
  });
  revalidatePath(`/accounts/${accountId}`);
}

export async function markAssessing(formData: FormData) {
  const accountId = str(formData.get("accountId"));
  await prisma.account.update({
    where: { id: accountId },
    data: { warmupState: "assessment" },
  });
  revalidatePath(`/accounts/${accountId}`);
}

export async function submitAssessment(formData: FormData) {
  const accountId = str(formData.get("accountId"));
  const assessment = assessWarmup({
    views: num(formData.get("views")),
    watchTimePct: fnum(formData.get("watchTimePct")),
    fypTrafficPct: fnum(formData.get("fypTrafficPct")),
    profileVisits: num(formData.get("profileVisits")),
    newFollowers: num(formData.get("newFollowers")),
  });
  await prisma.account.update({
    where: { id: accountId },
    data: {
      warmupState: assessment.verdict,
      warmupAssessmentJson: JSON.stringify(assessment),
    },
  });
  revalidatePath(`/accounts/${accountId}`);
}

export async function updateAccountHealth(formData: FormData) {
  const accountId = str(formData.get("accountId"));
  const addStrike = str(formData.get("addStrike")) === "1";
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  await prisma.account.update({
    where: { id: accountId },
    data: {
      health: str(formData.get("health")) || account.health,
      strikes: addStrike ? account.strikes + 1 : num(formData.get("strikes")),
    },
  });
  revalidatePath(`/accounts/${accountId}`);
}

// ---------- Vidéos ----------

export async function createVideo(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  await prisma.video.create({
    data: {
      projectId,
      title: str(formData.get("title")),
      sourceType: str(formData.get("sourceType")) || "youtube",
      sourceUrl: str(formData.get("sourceUrl")) || null,
      brief: str(formData.get("brief")) || null,
      producedBy: str(formData.get("producedBy")) || "manual",
      durationSec: num(formData.get("durationSec")) || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function setVideoStatus(formData: FormData) {
  const videoId = str(formData.get("videoId"));
  const projectId = str(formData.get("projectId"));
  await prisma.video.update({
    where: { id: videoId },
    data: { status: str(formData.get("status")) },
  });
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Posts (déclaration manuelle + gating warm-up) ----------

export async function createPost(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  const accountId = str(formData.get("accountId"));
  const override = str(formData.get("override")) === "on";

  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  // Gating : on refuse la publication sur un compte non « warmed » sauf override explicite.
  if (account.warmupState !== PUBLISH_READY_STATE && !override) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        `Compte @${account.handle} non « warmed » (état : ${account.warmupState}). Termine le warm-up ou coche l'override.`,
      )}`,
    );
  }

  await prisma.post.create({
    data: {
      videoId: str(formData.get("videoId")),
      accountId,
      platform: account.platform,
      url: str(formData.get("url")) || null,
      caption: str(formData.get("caption")) || null,
      hashtags: str(formData.get("hashtags")) || null,
      status: str(formData.get("status")) || "published",
      publishedAt: new Date(),
    },
  });
  await prisma.video.update({
    where: { id: str(formData.get("videoId")) },
    data: { status: "published" },
  });
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Métriques ----------

export async function addMetricSnapshot(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  await prisma.metricSnapshot.create({
    data: {
      postId: str(formData.get("postId")),
      views: num(formData.get("views")),
      likes: num(formData.get("likes")),
      comments: num(formData.get("comments")),
      shares: num(formData.get("shares")),
      watchTimePct: fnum(formData.get("watchTimePct")) || null,
      profileVisits: num(formData.get("profileVisits")) || null,
      followersGained: num(formData.get("followersGained")) || null,
      source: str(formData.get("source")) || "manual",
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

// ---------- Revenus & coûts ----------

export async function addRevenue(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  await prisma.revenue.create({
    data: {
      projectId,
      postId: str(formData.get("postId")) || null,
      program: str(formData.get("program")) || "other",
      amountCents: toCents(formData.get("amount")),
      estimated: str(formData.get("estimated")) === "on",
      note: str(formData.get("note")) || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function addCost(formData: FormData) {
  const projectId = str(formData.get("projectId"));
  await prisma.cost.create({
    data: {
      projectId,
      label: str(formData.get("label")),
      amountCents: toCents(formData.get("amount")),
      recurring: str(formData.get("recurring")) === "on",
      note: str(formData.get("note")) || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}
