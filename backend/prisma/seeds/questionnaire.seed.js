'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TITLE = 'Estratificação de Risco';

const RISK_CONFIG = {
  thresholds: [
    { min: 0,  max: 34,  level: 'LOW',      label: 'Baixo Risco' },
    { min: 35, max: 60,  level: 'MEDIUM',   label: 'Risco Moderado' },
    { min: 61, max: 95,  level: 'HIGH',     label: 'Alto Risco' },
    { min: 96, max: 227, level: 'VERY_HIGH', label: 'Muito Alto Risco' },
  ],
};

const DIMENSIONS = [
  // ── Dimensão 0 ───────────────────────────────────────────────────────────────
  {
    name: 'Condições Clínicas',
    orderIndex: 0,
    weight: 1,
    questions: [
      {
        text: 'Você possui algum destes diagnósticos?',
        type: 'MULTIPLE_CHOICE',
        orderIndex: 0,
        isRequired: true,
        weight: 1,
        helpText: 'Selecione todos que se aplicam.',
        options: [
          { label: 'Câncer em tratamento ativo',                                                        value: 'cancer',          score: 12, orderIndex: 0 },
          { label: 'Insuficiência renal crônica em hemodiálise',                                        value: 'irc_hemodialise', score: 12, orderIndex: 1 },
          { label: 'Insuficiência cardíaca descompensada',                                              value: 'ic_descomp',      score: 11, orderIndex: 2 },
          { label: 'DPOC grave com exacerbações frequentes',                                            value: 'dpoc_grave',      score: 8,  orderIndex: 3 },
          { label: 'Doença neurológica progressiva (Parkinson, Alzheimer, Doença Senil, AVC Recorrente)', value: 'neuro_prog',    score: 8,  orderIndex: 4 },
          { label: 'Diabetes com complicações (nefro, retino ou neuropatia)',                           value: 'dm_comp',         score: 7,  orderIndex: 5 },
          { label: 'Doença crônica controlada / outras condições',                                     value: 'cronica_ctrl',    score: 4,  orderIndex: 6 },
          { label: 'Sem diagnóstico relevante',                                                        value: 'sem_diag',        score: 0,  orderIndex: 7 },
        ],
      },
      {
        text: 'Data do diagnóstico (se aplicável)',
        type: 'TEXT',
        orderIndex: 1,
        isRequired: false,
        weight: 1,
        helpText: 'Informe a data aproximada do diagnóstico (ex: 01/2024).',
        options: [],
      },
      {
        text: 'Quantidade de doenças crônicas simultâneas',
        type: 'SINGLE_CHOICE',
        orderIndex: 2,
        isRequired: true,
        weight: 1,
        helpText: null,
        options: [
          { label: 'Nenhuma ou 1 doença', value: 'zero_um',     score: 0, orderIndex: 0 },
          { label: '2 doenças',           value: 'duas',        score: 3, orderIndex: 1 },
          { label: '3 doenças',           value: 'tres',        score: 6, orderIndex: 2 },
          { label: '4 ou mais',           value: 'quatro_mais', score: 9, orderIndex: 3 },
        ],
      },
      {
        text: 'Uso de medicação de alta complexidade',
        type: 'SINGLE_CHOICE',
        orderIndex: 3,
        isRequired: true,
        weight: 1,
        helpText: 'Ex.: imunobiológicos, oncológicos orais, imunossupressores, anticoagulantes de última geração.',
        options: [
          { label: 'Não usa',     value: 'nenhuma',   score: 0, orderIndex: 0 },
          { label: '1 medicação', value: 'uma',       score: 5, orderIndex: 1 },
          { label: '2 ou mais',   value: 'duas_mais', score: 9, orderIndex: 2 },
        ],
      },
      {
        text: 'Quais doenças crônicas você possui?',
        type: 'MULTIPLE_CHOICE',
        orderIndex: 4,
        isRequired: false,
        weight: 1,
        helpText: 'Selecione todas as doenças presentes.',
        options: [
          { label: 'Hipertensão Arterial',                 value: 'hta',        score: 0, orderIndex: 0 },
          { label: 'Diabetes',                             value: 'dm',         score: 0, orderIndex: 1 },
          { label: 'DPOC',                                 value: 'dpoc',       score: 0, orderIndex: 2 },
          { label: 'Obesidade',                            value: 'obesidade',  score: 0, orderIndex: 3 },
          { label: 'Tabagismo',                            value: 'tabagismo',  score: 0, orderIndex: 4 },
          { label: 'Alcoolismo',                           value: 'alcoolismo', score: 0, orderIndex: 5 },
          { label: 'Câncer',                               value: 'cancer2',    score: 0, orderIndex: 6 },
          { label: 'Doenças Neurológicas',                 value: 'neuro',      score: 0, orderIndex: 7 },
          { label: 'Hiperlipidemias / Colesterol Elevado', value: 'colesterol', score: 0, orderIndex: 8 },
          { label: 'Depressão',                            value: 'depressao',  score: 0, orderIndex: 9 },
          { label: 'Ansiedade',                            value: 'ansiedade',  score: 0, orderIndex: 10 },
          { label: 'Outras',                               value: 'outras',     score: 0, orderIndex: 11 },
        ],
      },
      {
        text: 'Descreva outras doenças crônicas (caso tenha marcado "Outras")',
        type: 'TEXT',
        orderIndex: 5,
        isRequired: false,
        weight: 1,
        helpText: null,
        options: [],
      },
      {
        text: 'O médico indicou que a sua doença pode limitar a expectativa de vida?',
        type: 'SINGLE_CHOICE',
        orderIndex: 6,
        isRequired: true,
        weight: 1,
        helpText: null,
        options: [
          { label: 'Não',     value: 'nao',    score: 0,  orderIndex: 0 },
          { label: 'Sim',     value: 'sim',    score: 10, orderIndex: 1 },
          { label: 'Não sei', value: 'naosci', score: 2,  orderIndex: 2 },
        ],
      },
    ],
  },

  // ── Dimensão 1 ───────────────────────────────────────────────────────────────
  {
    name: 'Padrão de Utilização dos Serviços',
    orderIndex: 1,
    weight: 1,
    questions: [
      {
        text: 'Internações hospitalares nos últimos 12 meses',
        type: 'SINGLE_CHOICE',
        orderIndex: 0,
        isRequired: true,
        weight: 1,
        helpText: null,
        options: [
          { label: 'Nenhuma',   value: 'nenhuma',   score: 0,  orderIndex: 0 },
          { label: '1',         value: 'uma',       score: 4,  orderIndex: 1 },
          { label: '2',         value: 'duas',      score: 8,  orderIndex: 2 },
          { label: '3 ou mais', value: 'tres_mais', score: 14, orderIndex: 3 },
        ],
      },
      {
        text: 'Dias de UTI nos últimos 12 meses',
        type: 'SINGLE_CHOICE',
        orderIndex: 1,
        isRequired: true,
        weight: 1,
        helpText: 'Inclua todos os períodos de terapia intensiva, mesmo em internações diferentes.',
        options: [
          { label: 'Nenhum',       value: 'nenhum', score: 0,  orderIndex: 0 },
          { label: '1 a 7 dias',   value: 'ate7',   score: 6,  orderIndex: 1 },
          { label: 'Mais de 7 dias', value: 'mais7', score: 12, orderIndex: 2 },
        ],
      },
      {
        text: 'Visitas ao pronto-socorro nos últimos 6 meses',
        type: 'SINGLE_CHOICE',
        orderIndex: 2,
        isRequired: true,
        weight: 1,
        helpText: null,
        options: [
          { label: 'Nenhuma',   value: 'nenhuma',   score: 0, orderIndex: 0 },
          { label: '1',         value: 'uma',       score: 3, orderIndex: 1 },
          { label: '2',         value: 'duas',      score: 6, orderIndex: 2 },
          { label: '3 ou mais', value: 'tres_mais', score: 9, orderIndex: 3 },
        ],
      },
      {
        text: 'Procedimentos de alta complexidade frequentes',
        type: 'SINGLE_CHOICE',
        orderIndex: 3,
        isRequired: true,
        weight: 1,
        helpText: 'Ex.: Cirurgias, cateterismos, sessões de quimioterapia, radioterapia ou diálise.',
        options: [
          { label: 'Não realiza',  value: 'nao',      score: 0, orderIndex: 0 },
          { label: 'Ocasionalmente', value: 'ocasional', score: 5, orderIndex: 1 },
          { label: 'Regularmente', value: 'regular',  score: 9, orderIndex: 2 },
        ],
      },
    ],
  },

  // ── Dimensão 2 ───────────────────────────────────────────────────────────────
  {
    name: 'Capacidade Funcional e Fragilidade',
    orderIndex: 2,
    weight: 1,
    questions: [
      {
        text: 'Mobilidade atual',
        type: 'SINGLE_CHOICE',
        orderIndex: 0,
        isRequired: true,
        weight: 1,
        helpText: 'Nível de desempenho funcional',
        options: [
          { label: 'Sem limitação',                                value: 'sem',        score: 0, orderIndex: 0 },
          { label: 'Com alguma dificuldade, mas independente',     value: 'dificuldade', score: 2, orderIndex: 1 },
          { label: 'Precisa de apoio, andador ou bengala',         value: 'apoio',      score: 5, orderIndex: 2 },
          { label: 'Maior parte do tempo sentado / cadeira de rodas', value: 'cadeira', score: 7, orderIndex: 3 },
          { label: 'Acamado parcial ou totalmente',                value: 'acamado',    score: 9, orderIndex: 4 },
        ],
      },
      {
        text: 'Independência nas atividades básicas do dia a dia',
        type: 'SINGLE_CHOICE',
        orderIndex: 1,
        isRequired: true,
        weight: 1,
        helpText: 'Considere: banho, alimentação, higiene, continência, mobilidade.',
        options: [
          { label: 'Totalmente independente',                    value: 'indep',   score: 0, orderIndex: 0 },
          { label: 'Precisa ajuda em algumas atividades',        value: 'algumas', score: 3, orderIndex: 1 },
          { label: 'Precisa de ajuda na maioria das atividades', value: 'maioria', score: 6, orderIndex: 2 },
          { label: 'Dependência total',                          value: 'total',   score: 9, orderIndex: 3 },
        ],
      },
      {
        text: 'Houve piora funcional nos últimos 3 meses?',
        type: 'SINGLE_CHOICE',
        orderIndex: 2,
        isRequired: true,
        weight: 1,
        helpText: 'Compare a capacidade atual com 3 meses atrás.',
        options: [
          { label: 'Não, estável',          value: 'nao',    score: 0, orderIndex: 0 },
          { label: 'Sim, piora leve',       value: 'leve',   score: 3, orderIndex: 1 },
          { label: 'Sim, piora importante', value: 'import', score: 6, orderIndex: 2 },
          { label: 'Sim, piora muito rápida', value: 'rapida', score: 9, orderIndex: 3 },
        ],
      },
      {
        text: 'Perda de peso involuntária',
        type: 'SINGLE_CHOICE',
        orderIndex: 3,
        isRequired: true,
        weight: 1,
        helpText: 'Perda sem dieta intencional.',
        options: [
          { label: 'Não houve perda de peso', value: 'nenhuma', score: 0, orderIndex: 0 },
          { label: 'Perda de menos de 5%',    value: 'ate5',    score: 2, orderIndex: 1 },
          { label: 'Perda entre 5% e 10%',    value: '5_10',    score: 5, orderIndex: 2 },
          { label: 'Perda acima de 10%',      value: 'acima10', score: 8, orderIndex: 3 },
        ],
      },
    ],
  },

  // ── Dimensão 3 ───────────────────────────────────────────────────────────────
  {
    name: 'Sintomas e Saúde Mental',
    orderIndex: 3,
    weight: 1,
    questions: [
      {
        text: 'Intensidade da dor (escala de 0 a 10)',
        type: 'SINGLE_CHOICE',
        orderIndex: 0,
        isRequired: true,
        weight: 1,
        helpText: 'Considere a sensação de dor no dia a dia.',
        options: [
          { label: '0 a 3 – Leve ou ausente', value: '0_3',  score: 0, orderIndex: 0 },
          { label: '4 a 6 – Moderada',        value: '4_6',  score: 4, orderIndex: 1 },
          { label: '7 a 10 – Intensa',        value: '7_10', score: 8, orderIndex: 2 },
        ],
      },
      {
        text: 'Quantidade de sintomas na última semana',
        type: 'SINGLE_CHOICE',
        orderIndex: 1,
        isRequired: true,
        weight: 1,
        helpText: 'Considere: dispneia, náusea, fadiga, insônia, confusão mental, edema, vômito, perda de apetite.',
        options: [
          { label: 'Nenhum ou 1', value: 'zero_um',   score: 0, orderIndex: 0 },
          { label: '2 a 3',       value: 'dois_tres', score: 2, orderIndex: 1 },
          { label: '4 a 5',       value: 'quatro_5',  score: 5, orderIndex: 2 },
          { label: '6 ou mais',   value: 'seis_mais', score: 8, orderIndex: 3 },
        ],
      },
      {
        text: 'Apresenta sintomas de ansiedade ou depressão?',
        type: 'SINGLE_CHOICE',
        orderIndex: 2,
        isRequired: true,
        weight: 1,
        helpText: 'Alterações de humor, falta de interesse, preocupação excessiva ou desânimo.',
        options: [
          { label: 'Não',            value: 'nao',      score: 0, orderIndex: 0 },
          { label: 'Leve ou moderado', value: 'leve_mod', score: 4, orderIndex: 1 },
          { label: 'Grave',          value: 'grave',    score: 7, orderIndex: 2 },
        ],
      },
      {
        text: 'Tem acompanhamento de saúde mental em curso?',
        type: 'SINGLE_CHOICE',
        orderIndex: 3,
        isRequired: true,
        weight: 1,
        helpText: 'Ex.: Psicólogo, psiquiatra ou médico com prescrição de antidepressivo / ansiolítico.',
        options: [
          { label: 'Não apresenta sintomas / não é necessário', value: 'nao_necessario', score: 0, orderIndex: 0 },
          { label: 'Sim, tratamento adequado e regular',        value: 'adq_regular',   score: 0, orderIndex: 1 },
          { label: 'Sim, mas tratamento irregular',             value: 'irreg',         score: 3, orderIndex: 2 },
          { label: 'Não tem acompanhamento (mas necessita)',    value: 'nao_possui',    score: 5, orderIndex: 3 },
        ],
      },
    ],
  },

  // ── Dimensão 4 ───────────────────────────────────────────────────────────────
  {
    name: 'Contexto Social e Adesão',
    orderIndex: 4,
    weight: 1,
    questions: [
      {
        text: 'Situação do cuidador principal',
        type: 'SINGLE_CHOICE',
        orderIndex: 0,
        isRequired: true,
        weight: 1,
        helpText: 'Considera familiar ou profissional que acompanha o beneficiário no cotidiano.',
        options: [
          { label: 'Cuidador dedicado e sempre disponível', value: 'dedicado',    score: 0, orderIndex: 0 },
          { label: 'Cuidador com disponibilidade limitada', value: 'limitado',    score: 4, orderIndex: 1 },
          { label: ' Sem cuidador',                         value: 'sem',         score: 8, orderIndex: 2 },
          { label: 'Não se aplica',                         value: 'naoseaplica', score: 0, orderIndex: 3 },
        ],
      },
      {
        text: 'Adesão ao tratamento',
        type: 'SINGLE_CHOICE',
        orderIndex: 1,
        isRequired: true,
        weight: 1,
        helpText: 'Considere: uso regular de medicamentos conforme prescrição, participação em consultas, seguir orientações da equipe multiprofissional.',
        options: [
          { label: 'Boa adesão',     value: 'boa',    score: 0,  orderIndex: 0 },
          { label: 'Adesão parcial', value: 'parcial', score: 5, orderIndex: 1 },
          { label: 'Baixa adesão',   value: 'baixa',  score: 10, orderIndex: 2 },
        ],
      },
      {
        text: 'Atividade física',
        type: 'SINGLE_CHOICE',
        orderIndex: 2,
        isRequired: true,
        weight: 1,
        helpText: null,
        options: [
          { label: 'Pratico regularmente, 3x ou mais por semana', value: 'tres_mais', score: 0, orderIndex: 0 },
          { label: 'Sim, 1 ou 2x por semana',                     value: 'uma_duas',  score: 3, orderIndex: 1 },
          { label: 'Não pratico nenhum tipo de atividade física',  value: 'nao',       score: 6, orderIndex: 2 },
        ],
      },
      {
        text: 'Histórico familiar de doenças',
        type: 'MULTIPLE_CHOICE',
        orderIndex: 3,
        isRequired: true,
        weight: 1,
        helpText: 'Considere Pais, irmãos e filhos',
        options: [
          { label: 'Hipertensão Arterial',   value: 'hta',     score: 1, orderIndex: 0 },
          { label: 'Diabetes',               value: 'dm',      score: 1, orderIndex: 1 },
          { label: 'Doenças Cardiovasculares', value: 'avc',   score: 1, orderIndex: 2 },
          { label: 'Câncer',                 value: 'cancer',  score: 1, orderIndex: 3 },
          { label: 'Hiperlipidemia',         value: 'hiperli', score: 1, orderIndex: 4 },
          { label: 'Outra',                  value: 'outra',   score: 1, orderIndex: 5 },
          { label: 'Nenhuma',                value: 'nenhuma', score: 0, orderIndex: 6 },
        ],
      },
      {
        text: 'Descreva outras doenças (caso tenha marcado "Outras")',
        type: 'TEXT',
        orderIndex: 4,
        isRequired: false,
        weight: 1,
        helpText: null,
        options: [],
      },
    ],
  },
];

async function seed() {
  const existing = await prisma.questionnaire.findFirst({ where: { title: TITLE } });
  if (existing) {
    console.log('[questionnaire-seed] Questionário já existe:', TITLE);
    return;
  }

  console.log('[questionnaire-seed] Criando questionário:', TITLE);

  const questionnaire = await prisma.questionnaire.create({
    data: {
      title: TITLE,
      description: 'Avaliação multidimensional de risco em saúde para estratificação de beneficiários.',
      version: 1,
      isActive: true,
      riskConfig: RISK_CONFIG,
    },
  });

  for (const dimDef of DIMENSIONS) {
    const dimension = await prisma.dimension.create({
      data: {
        questionnaireId: questionnaire.id,
        name: dimDef.name,
        orderIndex: dimDef.orderIndex,
        weight: dimDef.weight,
      },
    });

    for (const qDef of dimDef.questions) {
      const question = await prisma.question.create({
        data: {
          questionnaireId: questionnaire.id,
          dimensionId: dimension.id,
          text: qDef.text,
          type: qDef.type,
          orderIndex: qDef.orderIndex,
          isRequired: qDef.isRequired,
          weight: qDef.weight,
          helpText: qDef.helpText || null,
        },
      });

      if (qDef.options && qDef.options.length > 0) {
        await prisma.questionOption.createMany({
          data: qDef.options.map((opt) => ({
            questionId: question.id,
            label: opt.label,
            value: opt.value,
            score: opt.score,
            orderIndex: opt.orderIndex,
          })),
        });
      }
    }
  }

  console.log('[questionnaire-seed] Questionário criado com sucesso:', questionnaire.id);
}

seed()
  .catch((e) => { console.error('[questionnaire-seed] Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
