export interface Company {
  _row_id: number;
  company_name: string;
  normalized_name: string;
  ssm_number?: string | null;
  business_type?: string | null;
  jurisdiction?: string | null;
  authority?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  registered_address?: string | null;
  operating_address?: string | null;
  phone?: string | null;
  website?: string | null;
  online_lending_approved?: string | null;
  online_approval_source?: string | null;
  online_approval_verified_date?: string | null;
  source?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  is_demo?: number | null;
}

export interface License {
  _row_id: number;
  company_id: number;
  license_number?: string | null;
  jurisdiction?: string | null;
  license_type?: string | null;
  license_start_date?: string | null;
  license_expiry_date?: string | null;
  status?: string | null;
  state?: string | null;
  district?: string | null;
  operating_address?: string | null;
  source?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
}

export interface Alias {
  _row_id: number;
  company_id: number;
  alias_name: string;
  normalized_alias: string;
  alias_type: string;
  confirmed_count?: number | null;
}

export interface CheckRecord {
  _row_id: number;
  _created_at?: number;
  transaction_date?: string | null;
  detected_name?: string | null;
  normalized_name?: string | null;
  amount?: string | null;
  matched_company_id?: number | null;
  matched_company_name?: string | null;
  confidence?: number | null;
  match_basis?: string | null;
  license_status_at_date?: string | null;
  source_method?: string | null;
}

export const ALIAS_TYPES = [
  '正式名称',
  '商业名称',
  '银行流水名称',
  '支付平台名称',
  'OCR错误名称',
  '人工新增名称',
] as const;
