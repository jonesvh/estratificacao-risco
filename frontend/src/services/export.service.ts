import axios from 'axios';
import type { RiskLevel } from '../types';

export interface ExportFilters {
  beneficiaryId?: string;
  questionnaireId?: string;
  riskLevel?: RiskLevel;
  dateFrom?: string;
  dateTo?: string;
}

export async function exportResponsesXlsx(filters: ExportFilters): Promise<void> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  );

  const response = await axios.get('/api/export/responses', {
    params,
    responseType: 'blob',
    withCredentials: true,
  });

  const filename =
    response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') ??
    `estratificacao_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const url = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
