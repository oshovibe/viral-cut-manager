import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProjectRoi } from "@/lib/roi";
import { euros, compact, dateFR } from "@/lib/format";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  PROJECT_TYPE_LABELS,
  VIDEO_SOURCE_TYPES,
  PRODUCED_BY,
  REVENUE_PROGRAMS,
  REVENUE_PROGRAM_LABELS,
  type Platform,
  type ProjectType,
  type RevenueProgram,
} from "@/lib/enums";
import {
  createAccount,
  createVideo,
  setVideoStatus,
  createPost,
  addMetricSnapshot,
  addRevenue,
  addCost,
} from "@/lib/actions";
import { Card, Badge, Button, Stat, SectionTitle } from "@/components/ui";

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
const VIDEO_TONE: Record<string, string> = {
  in_review: "warn",
  approved: "accent",
  published: "good",
  rejected: "bad",
  draft: "neutral",
};

export default async function ProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      accounts: { orderBy: { createdAt: "asc" } },
      videos: {
        orderBy: { createdAt: "desc" },
        include: {
          posts: {
            include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 }, account: true },
          },
        },
      },
      revenues: { orderBy: { createdAt: "desc" } },
      costs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  const roi = await getProjectRoi(project.id);
  const inbox = project.videos.filter((v) => v.status === "in_review");

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/projects" className="text-xs text-muted hover:text-foreground">
        ← Projets
      </Link>
      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted">
            {project.niche} · {PROJECT_TYPE_LABELS[project.type as ProjectType] ?? project.type}
          </p>
        </div>
        <Badge tone="accent">{project.type}</Badge>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-bad/40 bg-bad/15 px-4 py-3 text-sm text-bad">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Revenus" value={euros(roi.revenueCents)} tone="good" />
        <Stat label="Coûts" value={euros(roi.costCents)} tone="bad" />
        <Stat label="ROI net" value={euros(roi.roiCents)} tone={roi.roiCents >= 0 ? "good" : "bad"} />
        <Stat label="Vues" value={compact(roi.views)} />
      </div>

      {project.type === "remakeit" && (
        <p className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-2 text-xs text-muted">
          Projet <strong>Remakeit</strong> : production et publication se font sur Remakeit.
          Ici on déclare les vidéos/posts publiés et on suit les stats &amp; revenus.
        </p>
      )}

      {/* ---------- INBOX DE VALIDATION ---------- */}
      <section className="mt-10">
        <SectionTitle hint={`${inbox.length} en attente`}>
          Inbox de validation
        </SectionTitle>
        {inbox.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Rien à valider. 🎉</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {inbox.map((v) => (
              <Card key={v.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.title}</div>
                    <div className="text-xs text-muted">
                      {v.sourceType}
                      {v.sourceUrl && (
                        <>
                          {" · "}
                          <a href={v.sourceUrl} className="text-accent" target="_blank">
                            source
                          </a>
                        </>
                      )}
                      {v.durationSec ? ` · ${v.durationSec}s` : ""} · produit par {v.producedBy}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={setVideoStatus}>
                      <input type="hidden" name="videoId" value={v.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="status" value="approved" />
                      <Button type="submit">Approuver</Button>
                    </form>
                    <form action={setVideoStatus}>
                      <input type="hidden" name="videoId" value={v.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button type="submit" variant="danger">
                        Rejeter
                      </Button>
                    </form>
                  </div>
                </div>
                {v.brief && <p className="mt-2 text-sm text-muted">{v.brief}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ---------- COMPTES ---------- */}
      <section className="mt-10 grid gap-6 md:grid-cols-[1fr_320px]">
        <div>
          <SectionTitle>Comptes &amp; warm-up</SectionTitle>
          <div className="space-y-3">
            {project.accounts.length === 0 && (
              <Card>
                <p className="text-sm text-muted">Aucun compte connecté.</p>
              </Card>
            )}
            {project.accounts.map((a) => (
              <Link key={a.id} href={`/accounts/${a.id}`}>
                <Card className="transition hover:border-accent/50">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      @{a.handle}{" "}
                      <span className="text-xs text-muted">
                        {PLATFORM_LABELS[a.platform as Platform] ?? a.platform}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={HEALTH_TONE[a.health]}>{a.health}</Badge>
                      <Badge tone={STATE_TONE[a.warmupState]}>{a.warmupState}</Badge>
                    </div>
                  </div>
                  {a.strikes > 0 && (
                    <div className="mt-2 text-xs text-bad">{a.strikes} strike(s)</div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card className="h-fit">
          <h3 className="mb-3 font-semibold">Ajouter un compte</h3>
          <form action={createAccount} className="space-y-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div>
              <label>Plateforme</label>
              <select name="platform" defaultValue="tiktok">
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p as Platform]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Handle</label>
              <input name="handle" required placeholder="moncompte" />
            </div>
            <Button type="submit">Ajouter</Button>
          </form>
        </Card>
      </section>

      {/* ---------- VIDÉOS + PUBLICATION ---------- */}
      <section className="mt-10 grid gap-6 md:grid-cols-[1fr_320px]">
        <div>
          <SectionTitle>Vidéos &amp; publication</SectionTitle>
          <div className="space-y-3">
            {project.videos.length === 0 && (
              <Card>
                <p className="text-sm text-muted">Aucune vidéo.</p>
              </Card>
            )}
            {project.videos.map((v) => (
              <Card key={v.id}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{v.title}</div>
                  <Badge tone={VIDEO_TONE[v.status]}>{v.status}</Badge>
                </div>

                {/* Posts déjà déclarés */}
                {v.posts.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {v.posts.map((post) => (
                      <div
                        key={post.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-xs"
                      >
                        <Badge>{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</Badge>
                        <span className="text-muted">@{post.account.handle}</span>
                        {post.url && (
                          <a href={post.url} target="_blank" className="text-accent">
                            voir
                          </a>
                        )}
                        <span className="text-muted">
                          {post.metrics[0]
                            ? `${compact(post.metrics[0].views)} vues · ${compact(post.metrics[0].likes)} likes`
                            : "pas de stats"}
                        </span>
                        {/* Snapshot de métriques */}
                        <form
                          action={addMetricSnapshot}
                          className="ml-auto flex items-center gap-1"
                        >
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="postId" value={post.id} />
                          <input
                            name="views"
                            placeholder="vues"
                            className="!w-20 !py-1"
                            inputMode="numeric"
                          />
                          <input
                            name="likes"
                            placeholder="likes"
                            className="!w-20 !py-1"
                            inputMode="numeric"
                          />
                          <input
                            name="shares"
                            placeholder="partages"
                            className="!w-20 !py-1"
                            inputMode="numeric"
                          />
                          <Button type="submit" variant="ghost">
                            + snapshot
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {/* Déclarer un post (si approuvée/publiée et comptes existants) */}
                {project.accounts.length > 0 && v.status !== "rejected" && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-accent">
                      Déclarer une publication
                    </summary>
                    <form action={createPost} className="mt-3 grid grid-cols-2 gap-2">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="videoId" value={v.id} />
                      <div className="col-span-2">
                        <label>Compte</label>
                        <select name="accountId">
                          {project.accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              @{a.handle} ({a.platform}) — {a.warmupState}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label>URL du post (optionnel)</label>
                        <input name="url" placeholder="https://tiktok.com/@.../video/..." />
                      </div>
                      <div className="col-span-2">
                        <label>Hashtags</label>
                        <input name="hashtags" placeholder="#football #coupedumonde2026" />
                      </div>
                      <label className="col-span-2 flex items-center gap-2 text-xs text-warn">
                        <input type="checkbox" name="override" />
                        Forcer même si le compte n&apos;est pas « warmed » (déconseillé)
                      </label>
                      <div className="col-span-2">
                        <Button type="submit">Déclarer publié</Button>
                      </div>
                    </form>
                  </details>
                )}
              </Card>
            ))}
          </div>
        </div>

        <Card className="h-fit">
          <h3 className="mb-3 font-semibold">Ajouter une vidéo</h3>
          <form action={createVideo} className="space-y-3">
            <input type="hidden" name="projectId" value={project.id} />
            <div>
              <label>Titre</label>
              <input name="title" required placeholder="Top 3 buts — match X" />
            </div>
            <div>
              <label>Source</label>
              <select name="sourceType" defaultValue="youtube">
                {VIDEO_SOURCE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>URL source (optionnel)</label>
              <input name="sourceUrl" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div>
              <label>Produit par</label>
              <select name="producedBy" defaultValue={project.type}>
                {PRODUCED_BY.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Brief / note</label>
              <textarea name="brief" rows={2} />
            </div>
            <Button type="submit">Ajouter à l&apos;inbox</Button>
          </form>
        </Card>
      </section>

      {/* ---------- REVENUS & COÛTS ---------- */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle hint={euros(roi.revenueCents)}>Revenus</SectionTitle>
          <form action={addRevenue} className="mb-4 grid grid-cols-2 gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="col-span-2">
              <label>Programme</label>
              <select name="program" defaultValue="tiktok_creator_rewards">
                {REVENUE_PROGRAMS.map((p) => (
                  <option key={p} value={p}>
                    {REVENUE_PROGRAM_LABELS[p as RevenueProgram]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Montant (€)</label>
              <input name="amount" inputMode="decimal" placeholder="12,50" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="estimated" /> estimé (RPM)
              </label>
            </div>
            <div className="col-span-2">
              <Button type="submit">Ajouter un revenu</Button>
            </div>
          </form>
          <ul className="space-y-1 text-sm">
            {project.revenues.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-border/50 py-1">
                <span className="text-muted">
                  {REVENUE_PROGRAM_LABELS[r.program as RevenueProgram] ?? r.program}
                  {r.estimated && <em className="text-warn"> (est.)</em>}
                </span>
                <span className="text-good">{euros(r.amountCents)}</span>
              </li>
            ))}
            {project.revenues.length === 0 && (
              <li className="text-sm text-muted">Aucun revenu saisi.</li>
            )}
          </ul>
        </Card>

        <Card>
          <SectionTitle hint={euros(roi.costCents)}>Coûts</SectionTitle>
          <form action={addCost} className="mb-4 grid grid-cols-2 gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="col-span-2">
              <label>Libellé</label>
              <input name="label" required placeholder="Abonnement Remakeit" />
            </div>
            <div>
              <label>Montant (€)</label>
              <input name="amount" inputMode="decimal" placeholder="19,00" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="recurring" /> récurrent
              </label>
            </div>
            <div className="col-span-2">
              <Button type="submit">Ajouter un coût</Button>
            </div>
          </form>
          <ul className="space-y-1 text-sm">
            {project.costs.map((c) => (
              <li key={c.id} className="flex justify-between border-b border-border/50 py-1">
                <span className="text-muted">
                  {c.label}
                  {c.recurring && <em className="text-muted"> /mois</em>}
                </span>
                <span className="text-bad">{euros(c.amountCents)}</span>
              </li>
            ))}
            {project.costs.length === 0 && (
              <li className="text-sm text-muted">Aucun coût saisi.</li>
            )}
          </ul>
        </Card>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        Dernière mise à jour {dateFR(project.updatedAt)}
      </p>
    </div>
  );
}
