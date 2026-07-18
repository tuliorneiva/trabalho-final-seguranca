// =============================================================================
// DOMAIN TYPES — Mini CRM
// Interfaces centralizadas para toda a aplicação.
// =============================================================================

export interface Cliente {
  id: string | number;
  nome: string;
  email: string;
  status: 'Ativo' | 'Inativo' | 'Pendente';
}

export interface MfaGenerateResponse {
  secret: string;
  qrCodeUrl: string;
}

// ---- Auth ----

export interface AuthUser {
  nome: string;
  email: string;
  mfaEnabled: boolean;
}

// ---- Step-up MFA Context ----

export interface StepUpRequest {
  title?: string;
  description?: string;
}

export interface StepUpContextValue {
  /** Abre o modal de Step-up e retorna o código TOTP quando o usuário confirmar. */
  requestStepUp: (options?: StepUpRequest) => Promise<string>;
  isOpen: boolean;
  resolve: (code: string) => void;
  reject: (reason?: string) => void;
  options: StepUpRequest;
}

// ---- API Error ----

export type MfaErrorCode = 'MFA_REQUIRED' | 'MFA_INVALID' | 'UNKNOWN';

export interface ApiErrorResponse {
  message: string;
  code?: MfaErrorCode;
}
