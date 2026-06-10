import Link from "next/link";
import { prisma } from "@/lib/db";
import { getProjectRoi } from "@/lib/roi";
import { euros, compact } from "@/lib/format";
import { PROJECT_TYPE_LABELS, type ProjectType } from "@/lib/enums";
import { Stat, Card, Badge, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  const rois = await Promise.all(projects.map((p) => getProjectRoi(p.id)));

  const totalRevenue = rois.reduce((s, r) => s + r.revenueCents, 0);
  const totalCost = rois.reduce((s, r) => s + r.costCents, 0);
  const totalViews = rois.reduce((s, r) => s + r.views, 0);
  const totalRoi = totalRevenue - totalCost;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted">
            Revenus, coûts et ROI agrégés de tous les projets.
          </p>
        </div>
        <LinkButton href="/projects">Gérer les projets</LinkButton>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Revenus" value={euros(totalRevenue)} tone="good" />
        <Stat label="Coûts" value={euros(totalCost)} tone="bad" />
        <Stat
          label="ROI net"
          value={euros(totalRoi)}
          tone={totalRoi >= 0 ? "good" : "bad"}
        />
        <Stat label="Vues cumulées" value={compact(totalViews)} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
        Projets
      </h2>

      {projects.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Aucun projet pour l&apos;instant.{" "}
            <Link href="/projects" className="text-accent">
              Créer le premier
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p, i) => {
            const r = rois[i];
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition hover:border-accent/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">{p.niche}</div>
                    </div>
                    <Badge tone="accent">{p.type}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {PROJECT_TYPE_LABELS[p.type as ProjectType] ?? p.type}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span>
                      ROI{" "}
                      <span
                        className={
                          r.roiCents >= 0 ? "text-good font-semibold" : "text-bad font-semibold"
                        }
                      >
                        {euros(r.roiCents)}
                      </span>
                    </span>
                    <span className="text-muted">{compact(r.views)} vues</span>
                    <span className="text-muted">{r.videoCount} vidéos</span>
                    <span className="text-muted">{r.accountCount} comptes</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
