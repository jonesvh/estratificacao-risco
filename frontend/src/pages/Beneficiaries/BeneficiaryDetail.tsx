import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, User, ClipboardCheck, Pencil } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Modal } from '../../components/ui/Modal/Modal';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { Table } from '../../components/ui/Table/Table';
import { Badge } from '../../components/ui/Badge/Badge';
import { RiskBadge } from '../../components/shared/RiskBadge/RiskBadge';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { getBeneficiary, getBeneficiaryHistory, updateBeneficiary } from '../../services/beneficiaries.service';
import { getErrorMessage } from '../../services/api';
import { formatCPF, formatDate, formatDateTime, calcAge, GENDER_LABELS } from '../../utils/format';
import type { QuestionnaireResponse } from '../../types';
import styles from './BeneficiaryDetail.module.css';

const GENDER_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' },
];

const PLAN_TYPE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Empresarial', label: 'Empresarial' },
  { value: 'Fisica', label: 'Física' },
  { value: 'Adesao', label: 'Adesão' },
];

const editSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  birthDate: z.string().min(1, 'Data de nascimento obrigatória'),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
  planCode: z.string().optional(),
  municipio: z.string().max(100).optional(),
  estado: z.string().length(2, 'UF deve ter 2 letras').or(z.literal('')).optional(),
});

type EditFormData = z.infer<typeof editSchema>;

export function BeneficiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: b, isLoading } = useQuery({
    queryKey: ['beneficiary', id],
    queryFn: () => getBeneficiary(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['beneficiary-history', id],
    queryFn: () => getBeneficiaryHistory(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting },
  } = useForm<EditFormData>({ resolver: zodResolver(editSchema) });

  const editMutation = useMutation({
    mutationFn: (data: EditFormData) => updateBeneficiary(b!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiary', id] });
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      setEditOpen(false);
    },
  });

  function openEdit() {
    if (!b) return;
    resetEdit({
      name: b.name,
      cpf: b.cpf,
      birthDate: b.birthDate.slice(0, 10),
      gender: b.gender ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      planCode: b.planCode ?? '',
      municipio: b.municipio ?? '',
      estado: b.estado ?? '',
    });
    setEditOpen(true);
  }

  const historyColumns = [
    { key: 'questionnaire', header: 'Questionário', render: (r: QuestionnaireResponse) => r.questionnaire.title },
    { key: 'appliedAt', header: 'Data', render: (r: QuestionnaireResponse) => formatDateTime(r.appliedAt) },
    { key: 'totalScore', header: 'Pontuação', render: (r: QuestionnaireResponse) => Number(r.totalScore).toFixed(2) },
    { key: 'riskLevel', header: 'Risco', render: (r: QuestionnaireResponse) => <RiskBadge level={r.riskLevel} /> },
  ];

  if (isLoading) return <AppShell title="Beneficiário"><Spinner center size="xl" /></AppShell>;
  if (!b) return <AppShell title="Beneficiário"><p>Não encontrado.</p></AppShell>;

  return (
    <AppShell title={b.name} subtitle="Detalhes e histórico do beneficiário">
      <div className={styles.topBar}>
        <Button variant="outline" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/beneficiaries')}>
          Voltar
        </Button>
        <div className={styles.headerActions}>
          <Badge variant={b.isActive ? 'success' : 'neutral'} dot>{b.isActive ? 'Ativo' : 'Inativo'}</Badge>
          <Button variant="outline" leftIcon={<Pencil size={15} />} onClick={openEdit}>
            Editar
          </Button>
          <Button leftIcon={<ClipboardCheck size={15} />}
            onClick={() => navigate(`/responses/apply?beneficiaryId=${b.id}`)}>
            Aplicar Questionário
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader>
            <CardTitle><User size={15} className={styles.inlineIcon} />Dados Pessoais</CardTitle>
          </CardHeader>
          <CardBody>
            <div className={styles.dataGrid}>
              <DataItem label="CPF" value={formatCPF(b.cpf)} />
              <DataItem label="Nascimento" value={`${formatDate(b.birthDate)} (${calcAge(b.birthDate)} anos)`} />
              <DataItem label="Gênero" value={GENDER_LABELS[b.gender ?? 'NOT_INFORMED']} />
              <DataItem label="Telefone" value={b.phone ?? '—'} />
              <DataItem label="E-mail" value={b.email ?? '—'} />
              <DataItem label="Município" value={b.municipio ?? '—'} />
              <DataItem label="Estado (UF)" value={b.estado ?? '—'} />
              <DataItem label="Tipo de Plano" value={b.planCode ?? '—'} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aplicações</CardTitle>
          <span className={styles.historyCount}>{history?.length ?? 0} aplicação(ões)</span>
        </CardHeader>
        <CardBody className={styles.noPadding}>
          <Table columns={historyColumns} data={history ?? []} keyExtractor={(r) => r.id}
            onRowClick={(r) => navigate(`/responses/${r.id}`)}
            emptyMessage="Nenhuma aplicação registrada para este beneficiário." />
        </CardBody>
      </Card>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Beneficiário" size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button form="edit-beneficiary-form" type="submit" loading={isSubmitting || editMutation.isPending}>
              Salvar
            </Button>
          </>
        }>
        <form id="edit-beneficiary-form" onSubmit={handleSubmit((d) => editMutation.mutate(d))}
          className={styles.formGrid} noValidate>
          <Input label="Nome completo" required error={editErrors.name?.message} {...register('name')} />
          <Input label="CPF" required error={editErrors.cpf?.message} {...register('cpf')} maxLength={11} />
          <Input label="Data de nascimento" type="date" required error={editErrors.birthDate?.message} {...register('birthDate')} />
          <Select label="Gênero" options={GENDER_OPTIONS} {...register('gender')} />
          <Input label="Telefone" {...register('phone')} placeholder="(11) 99999-9999" />
          <Input label="E-mail" type="email" error={editErrors.email?.message} {...register('email')} />
          <Input label="Município" {...register('municipio')} placeholder="Ex: São Paulo" />
          <Input label="Estado (UF)" {...register('estado')} placeholder="SP" maxLength={2} />
          <Select label="Tipo de Plano" options={PLAN_TYPE_OPTIONS} {...register('planCode')} />
          {editMutation.isError && (
            <p className={styles.errorText}>{getErrorMessage(editMutation.error)}</p>
          )}
        </form>
      </Modal>
    </AppShell>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.dataItem}>
      <span className={styles.dataLabel}>{label}</span>
      <span className={styles.dataValue}>{value}</span>
    </div>
  );
}
