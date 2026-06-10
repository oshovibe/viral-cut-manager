import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dateFR } from "@/lib/format";
import {
  PLATFORM_LABELS,
  WARMUP_STATE_LABELS,
  type Platform,
  type WarmupState,
} from "@/lib/enums";
import {
  startWarmup,
  generateBrief,
  markAssessing,
  submitAssessment,
  logWarmupActivity,
  updateAccountHealth,
} from "@/lib/actions";
import {
  COMMENT_RULES,
  type WarmupPlan,
  type WarmupBrief,
  type WarmupAssessment,
} from "@/lib/warmup";
import { Card, Badge, Button, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATE_TONE: Record<string, string> = {
  warmed: "good",
  warming: "warn",
  warmup_content: "warn",
  assessment: "warn",
  extended: "warn",
  suppressed: "bad",
  new: "neutral",
};
const HEALTH_TONE: Record<string, string> = {
  healthy: "good",
  warning: "warn",
  suspended: "bad",
};
const VERDICT_TONE: Record<string, string> = {
  warmed: "good",
  extended: "warn",
  suppressed: "bad",
};

export default async function AccountDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      project: true,
      warmupActivities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!account) notFound();

  const plan: WarmupPlan | null = account.warmupPlanJson
    ? JSON.parse(account.warmupPlanJson)
    : null;
  const brief: WarmupBrief | null = account.warmupBriefJson
    ? JSON.parse(account.warmupBriefJson)
    : null;
  const assessment: WarmupAssessment | null = account.warmupAssessmentJson
    ? JSON.parse(account.warmupAssessmentJson)
    : null;

  const state = account.warmupState as WarmupState;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/projects/${account.projectId}`}
        className="text-xs text-muted hover:text-foreground"
      >
        ← {account.project.name}
      </Link>
      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">@{account.handle}</h1>
          <p className="text-sm text-muted">
            {PLATFORM_LABELS[account.platform as Platform] ?? account.platform} ·{" "}
            {WARMUP_STATE_LABELS[state] ?? state}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone={HEALTH_TONE[account.health]}>{account.health}</Badge>
          <Badge tone={STATE_TONE[state]}>{state}</Badge>
        </div>
      </header>

      {/* ---------- Pipeline warm-up (machine à états) ---------- */}
      <Card>
        <SectionTitle
          hint={
            account.warmupStartedAt
              ? `démarré le ${dateFR(account.warmupStartedAt)}`
              : undefined
          }
        >
          Pipeline de warm-up
        </SectionTitle>
        <p className="mb-4 text-xs text-muted">
          Méthode du skill <code>tiktok-warmup</code> de genfeed.ai (MIT). La publication
          automatique est bloquée tant que le compte n&apos;est pas «&nbsp;warmed&nbsp;».
        </p>

        <div className="flex flex-wrap gap-2">
          {(state === "new" || state === "extended" || state === "suppressed") && (
            <form action={startWarmup}>
              <input type="hidden" name="accountId" value={account.id} />
              <Button type="submit">
                {state === "new" ? "Démarrer le warm-up (J1-J2)" : "Relancer un warm-up"}
              </Button>
            </form>
          )}
          {state === "warming" && (
            <form action={generateBrief}>
              <input type="hidden" name="accountId" value={account.id} />
              <Button type="submit">Générer le contenu J3 →</Button>
            </form>
          )}
          {state === "warmup_content" && (
            <form action={markAssessing}>
              <input type="hidden" name="accountId" value={account.id} />
              <Button type="submit">Marquer comme publié → évaluation (J3 +48h)</Button>
            </form>
          )}
        </div>
      </Card>

      {/* ---------- Plan d'engagement J1-J2 ---------- */}
      {plan && (state === "warming" || state === "warmup_content" || state === "assessment") && (
        <Card className="mt-6">
          <SectionTitle hint={`niche : ${plan.niche}`}>Plan d&apos;engagement J1-J2</SectionTitle>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Mots-clés</h4>
              <ul className="text-sm text-muted">
                <li><strong className="text-foreground">Larges :</strong> {plan.keywordBank.broad.join(", ")}</li>
                <li><strong className="text-foreground">Problèmes :</strong> {plan.keywordBank.problem.join(", ")}</li>
                <li><strong className="text-foreground">Créateurs :</strong> {plan.keywordBank.creator.join(", ")}</li>
                <li><strong className="text-foreground">Tendances :</strong> {plan.keywordBank.trend.join(", ")}</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Critères de follow</h4>
              <ul className="list-disc pl-4 text-sm text-muted">
                {plan.followCriteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Checklist trackée */}
          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">
            Logger une session
          </h4>
          <form action={logWarmupActivity} className="rounded-lg bg-surface-2 p-4">
            <input type="hidden" name="accountId" value={account.id} />
            <div className="mb-3 flex gap-3">
              <div className="w-24">
                <label>Jour</label>
                <select name="day" defaultValue="1">
                  <option value="1">J1</option>
                  <option value="2">J2</option>
                </select>
              </div>
              <div className="w-40">
                <label>Session</label>
                <select name="session" defaultValue="morning">
                  <option value="morning">Matin</option>
                  <option value="afternoon">Après-midi</option>
                  <option value="evening">Soir</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(["morning", "afternoon", "evening"] as const).map((s) => (
                <div key={s}>
                  <div className="mb-1 text-xs font-semibold capitalize text-muted">{s}</div>
                  {plan.dailyChecklist[s].map((item) => (
                    <label key={item.key} className="mb-1 flex items-start gap-2 text-xs text-foreground">
                      <input type="checkbox" name={`item:${item.key}`} />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <textarea name="notes" rows={1} placeholder="Notes (optionnel)" className="mt-3" />
            <div className="mt-3">
              <Button type="submit">Enregistrer la session</Button>
            </div>
          </form>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted">Templates de commentaires</h4>
              <ul className="space-y-1 text-xs text-muted">
                {plan.commentTemplates.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
              <ul className="mt-2 list-disc pl-4 text-xs text-muted">
                {COMMENT_RULES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-bad">À ne PAS faire (J1-J2)</h4>
              <ul className="list-disc pl-4 text-xs text-muted">
                {plan.doNots.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* ---------- Brief contenu J3 ---------- */}
      {brief && (state === "warmup_content" || state === "assessment") && (
        <Card className="mt-6">
          <SectionTitle>Brief contenu J3 (slideshow)</SectionTitle>
          <div className="text-sm">
            <p><strong>Topic :</strong> {brief.topic}</p>
            <p className="text-muted">{brief.whyThisTopic}</p>
            <p className="mt-2"><strong>Format :</strong> {brief.format}</p>
            <p className="mt-2"><strong>Légende :</strong> {brief.caption}</p>
            <p><strong>Hashtags :</strong> {brief.hashtags.join(" ")}</p>
            <p className="mt-2"><strong>Son :</strong> <span className="text-muted">{brief.soundDirection}</span></p>
          </div>
          <h4 className="mb-1 mt-4 text-xs font-semibold uppercase text-muted">Slides</h4>
          <ol className="space-y-1 text-sm text-muted">
            {brief.slides.map((s, i) => (
              <li key={i}>
                <strong className="text-foreground">{s.role} :</strong> {s.textOverlay} — <em>{s.imageDirection}</em>
              </li>
            ))}
          </ol>
          <h4 className="mb-1 mt-4 text-xs font-semibold uppercase text-warn">Images (anti-hash perceptuel)</h4>
          <ul className="list-disc pl-4 text-xs text-muted">
            {brief.imageRequirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- Assessment ---------- */}
      {state === "assessment" && (
        <Card className="mt-6">
          <SectionTitle>Évaluation post-warm-up (J3 +48h)</SectionTitle>
          <p className="mb-3 text-xs text-muted">
            Saisis les métriques du post warm-up. Seuils : 200+ vues, 60%+ watch time,
            &gt;50% trafic FYP.
          </p>
          <form action={submitAssessment} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <input type="hidden" name="accountId" value={account.id} />
            <div>
              <label>Vues</label>
              <input name="views" inputMode="numeric" defaultValue="0" />
            </div>
            <div>
              <label>Watch time %</label>
              <input name="watchTimePct" inputMode="decimal" defaultValue="0" />
            </div>
            <div>
              <label>Trafic FYP %</label>
              <input name="fypTrafficPct" inputMode="decimal" defaultValue="0" />
            </div>
            <div>
              <label>Visites de profil</label>
              <input name="profileVisits" inputMode="numeric" defaultValue="0" />
            </div>
            <div>
              <label>Nouveaux abonnés</label>
              <input name="newFollowers" inputMode="numeric" defaultValue="0" />
            </div>
            <div className="flex items-end">
              <Button type="submit">Évaluer</Button>
            </div>
          </form>
        </Card>
      )}

      {assessment && (state === "warmed" || state === "extended" || state === "suppressed") && (
        <Card className="mt-6">
          <SectionTitle>Résultat de l&apos;évaluation</SectionTitle>
          <Badge tone={VERDICT_TONE[assessment.verdict]}>{assessment.verdict}</Badge>
          <p className="mt-2 text-sm">{assessment.summary}</p>
          <p className="mt-1 text-sm text-muted">→ {assessment.nextStep}</p>
        </Card>
      )}

      {/* ---------- Santé du compte ---------- */}
      <Card className="mt-6">
        <SectionTitle>Santé du compte</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <form action={updateAccountHealth} className="flex items-end gap-3">
            <input type="hidden" name="accountId" value={account.id} />
            <input type="hidden" name="strikes" value={account.strikes} />
            <div className="w-44">
              <label>État de santé</label>
              <select name="health" defaultValue={account.health}>
                <option value="healthy">healthy</option>
                <option value="warning">warning</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
            <Button type="submit" variant="ghost">Mettre à jour</Button>
          </form>
          <form action={updateAccountHealth}>
            <input type="hidden" name="accountId" value={account.id} />
            <input type="hidden" name="health" value={account.health} />
            <input type="hidden" name="addStrike" value="1" />
            <Button type="submit" variant="danger">+ 1 strike ({account.strikes})</Button>
          </form>
        </div>
      </Card>

      {/* ---------- Historique ---------- */}
      {account.warmupActivities.length > 0 && (
        <Card className="mt-6">
          <SectionTitle>Historique des sessions</SectionTitle>
          <ul className="space-y-1 text-sm">
            {account.warmupActivities.map((a) => {
              const checklist: Record<string, boolean> = JSON.parse(a.checklistJson);
              const done = Object.values(checklist).filter(Boolean).length;
              const total = Object.keys(checklist).length;
              return (
                <li key={a.id} className="flex justify-between border-b border-border/50 py-1">
                  <span className="text-muted">
                    J{a.day} · {a.session} — {dateFR(a.createdAt)}
                  </span>
                  <span>{done}/{total} items</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
