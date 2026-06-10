import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Users } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Table } from '../../components/ui/Table/Table';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { EmptyState } from '../../components/shared/EmptyState/EmptyState';
import { listBeneficiaries, createBeneficiary } from '../../services/beneficiaries.service';
import { getErrorMessage } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCPF, formatDate } from '../../utils/format';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Beneficiary } from '../../types';
import styles from './BeneficiaryList.module.css';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Masculino' }, { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' }, { value: 'NOT_INFORMED', label: 'Não informado' },
];

const PLAN_TYPE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Empresarial', label: 'Empresarial' },
  { value: 'Fisica', label: 'Física' },
  { value: 'Adesao', label: 'Adesão' },
];

const PLAN_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  { value: 'Empresarial', label: 'Empresarial' },
  { value: 'Fisica', label: 'Física' },
  { value: 'Adesao', label: 'Adesão' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' }, { value: 'true', label: 'Ativos' }, { value: 'false', label: 'Inativos' },
];

const schema = z.object({
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

type FormData = z.infer<typeof schema>;

export function BeneficiaryListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ['beneficiaries', page, debouncedSearch, status, planFilter],
    queryFn: () => listBeneficiaries({
      page, limit: 20, search: debouncedSearch || undefined,
      isActive: (status || undefined) as 'true' | 'false' | undefined,
      planCode: planFilter || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: createBeneficiary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      setModalOpen(false);
      reset();
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const columns = [
    { key: 'name', header: 'Nome', render: (b: Beneficiary) => <strong>{b.name}</strong> },
    { key: 'cpf', header: 'CPF', render: (b: Beneficiary) => formatCPF(b.cpf) },
    { key: 'birthDate', header: 'Nascimento', render: (b: Beneficiary) => formatDate(b.birthDate) },
    { key: 'planCode', header: 'Tipo de Plano', render: (b: Beneficiary) => b.planCode ?? '—' },
    { key: 'isActive', header: 'Status', render: (b: Beneficiary) => (
      <Badge variant={b.isActive ? 'success' : 'neutral'} dot>{b.isActive ? 'Ativo' : 'Inativo'}</Badge>
    )},
  ];

  return (
    <AppShell title="Beneficiários" subtitle="Gerencie os beneficiários do plano">
      <div className={styles.topBar}>
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Input placeholder="Buscar por nome ou CPF..." leftIcon={<Search size={16} />}
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select options={STATUS_OPTIONS} value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
          <Select options={PLAN_TYPE_FILTER_OPTIONS} value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} />
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Novo Beneficiário</Button>
      </div>

      {isLoading ? <Spinner center size="lg" /> : !data?.data.length ? (
        <EmptyState icon={<Users size={28} />} title="Nenhum beneficiário encontrado"
          description={search ? 'Tente outro termo de busca.' : 'Cadastre o primeiro beneficiário.'}
          action={<Button leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Novo Beneficiário</Button>} />
      ) : (
        <>
          <Table columns={columns} data={data.data} keyExtractor={(b) => b.id}
            onRowClick={(b) => navigate(`/beneficiaries/${b.id}`)} />
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages}
            total={data.meta.total} limit={data.meta.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Novo Beneficiário" size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalOpen(false); reset(); }}>Cancelar</Button>
            <Button form="beneficiary-form" type="submit" loading={isSubmitting || createMutation.isPending}>Cadastrar</Button>
          </>
        }>
        <form id="beneficiary-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className={styles.beneficiaryForm} noValidate>
          <div className={styles.formGrid}>
            <Input label="Nome completo" required error={errors.name?.message} {...register('name')} />
            <Input label="CPF (somente números)" required error={errors.cpf?.message} {...register('cpf')} maxLength={11} />
            <Input label="Data de nascimento" type="date" required error={errors.birthDate?.message} {...register('birthDate')} />
            <Select label="Gênero" options={GENDER_OPTIONS} placeholder="Selecione..." {...register('gender')} />
            <Input label="Telefone" {...register('phone')} placeholder="(11) 99999-9999" />
            <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Município" {...register('municipio')} placeholder="Ex: São Paulo" />
            <Input label="Estado (UF)" {...register('estado')} placeholder="SP" maxLength={2} />
            <Select label="Tipo de Plano" options={PLAN_TYPE_OPTIONS} {...register('planCode')} />
          </div>
          {createMutation.isError && (
            <p className={styles.errorText}>{getErrorMessage(createMutation.error)}</p>
          )}
        </form>
      </Modal>
    </AppShell>
  );
}
