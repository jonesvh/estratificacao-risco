import { readDb } from '../../config/jsonDb';

export async function getSummary() {
  const db = readDb();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startMs = startOfMonth.getTime();

  const totalBeneficiaries = db.beneficiaries.length;
  const activeBeneficiaries = db.beneficiaries.filter((b) => b.isActive).length;
  const totalResponses = db.responses.length;
  const responsesThisMonth = db.responses.filter(
    (r) => new Date(r.appliedAt).getTime() >= startMs,
  ).length;

  const riskCounts: Record<string, number> = {};
  for (const r of db.responses) {
    riskCounts[r.riskLevel] = (riskCounts[r.riskLevel] ?? 0) + 1;
  }

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
  const db = readDb();

  return db.responses
    .slice()
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 10)
    .map((r) => {
      const beneficiary = db.beneficiaries.find((b) => b.id === r.beneficiaryId);
      const questionnaire = db.questionnaires.find((q) => q.id === r.questionnaireId);
      return {
        ...r,
        beneficiary: beneficiary
          ? { id: beneficiary.id, name: beneficiary.name, cpf: beneficiary.cpf }
          : null,
        questionnaire: questionnaire ? { id: questionnaire.id, title: questionnaire.title } : null,
      };
    });
}
