import Link from "next/link";
import { prisma } from "@/lib/db";
import { createProject } from "@/lib/actions";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, type ProjectType } from "@/lib/enums";
import { Card, Badge, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { videos: true, accounts: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">Projets</h1>
      <p className="mb-8 text-sm text-muted">
        Un projet = une niche + un type de production. Le reste (comptes, publication,
        stats, revenus) est commun.
      </p>

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {projects.length === 0 && (
            <Card>
              <p className="text-sm text-muted">Aucun projet. Crée-en un à droite →</p>
            </Card>
          )}
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="transition hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.name}</div>
                  <Badge tone="accent">{p.type}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted">{p.niche}</div>
                <div className="mt-3 text-xs text-muted">
                  {p._count.videos} vidéos · {p._count.accounts} comptes
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 font-semibold">Nouveau projet</h2>
          <form action={createProject} className="space-y-4">
            <div>
              <label>Nom</label>
              <input name="name" required placeholder="Coupe du Monde 2026" />
            </div>
            <div>
              <label>Niche</label>
              <input name="niche" required placeholder="football / coupe du monde" />
            </div>
            <div>
              <label>Type de production</label>
              <select name="type" defaultValue="remakeit">
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROJECT_TYPE_LABELS[t as ProjectType]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Notes (optionnel)</label>
              <textarea name="notes" rows={2} />
            </div>
            <Button type="submit">Créer le projet</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
