import { prisma } from "./db";

export type ProjectRoi = {
  revenueCents: number;
  costCents: number;
  roiCents: number;
  videoCount: number;
  postCount: number;
  accountCount: number;
  views: number;
};

// Agrège revenus, coûts et métriques (dernier snapshot par post) pour un projet.
export async function getProjectRoi(projectId: string): Promise<ProjectRoi> {
  const [revenueAgg, costAgg, videoCount, accountCount, posts] = await Promise.all([
    prisma.revenue.aggregate({ where: { projectId }, _sum: { amountCents: true } }),
    prisma.cost.aggregate({ where: { projectId }, _sum: { amountCents: true } }),
    prisma.video.count({ where: { projectId } }),
    prisma.account.count({ where: { projectId } }),
    prisma.post.findMany({
      where: { video: { projectId } },
      include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
    }),
  ]);

  const revenueCents = revenueAgg._sum.amountCents ?? 0;
  const costCents = costAgg._sum.amountCents ?? 0;
  const views = posts.reduce((sum, p) => sum + (p.metrics[0]?.views ?? 0), 0);

  return {
    revenueCents,
    costCents,
    roiCents: revenueCents - costCents,
    videoCount,
    postCount: posts.length,
    accountCount,
    views,
  };
}
