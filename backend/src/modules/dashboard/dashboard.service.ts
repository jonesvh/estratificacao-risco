import { prisma } from '../../config/database';

export async function getSummary() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalBeneficiaries,
    activeBeneficiaries,
    totalResponses,
    responsesThisMonth,
    riskDistribution,
  ] = await Promise.all([
    prisma.beneficiary.count(),
    prisma.beneficiary.count({ where: { isActive: true } }),
    prisma.questionnaireResponse.count(),
    prisma.questionnaireResponse.count({ where: { appliedAt: { gte: startOfMonth } } }),
    prisma.questionnaireResponse.groupBy({
      by: ['riskLevel'],
      _count: { id: true },
    }),
  ]);

  const riskCounts = Object.fromEntries(
    riskDistribution.map((r) => [r.riskLevel, r._count.id]),
  );

  return {
    beneficiaries: { total: totalBeneficiaries, active: activeBeneficiaries },
    responses: { total: totalResponses, thisMonth: responsesThisMonth },
    riskDistribution: {
      LOW: riskCounts['LOW'] ?? 0,
      MEDIUM: riskCounts['MEDIUM'] ?? 0,
      HIGH: riskCounts['HIGH'] ?? 0,
      VERY_HIGH: riskCounts['VERY_HIGH'] ?? 0,
    },
  };
}

export async function getRecentResponses() {
  return prisma.questionnaireResponse.findMany({
    take: 10,
    orderBy: { appliedAt: 'desc' },
    include: {
      beneficiary: { select: { id: true, name: true, cpf: true } },
      questionnaire: { select: { id: true, title: true } },
    },
  });
}
