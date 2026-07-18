import { Injectable } from '@nestjs/common'
import { authenticator } from 'otplib'

const STEP_SECONDS = 30

@Injectable()
export class TotpService {
  constructor() {
    // Tolera ±1 passo de 30s para compensar dessincronização de relógio.
    authenticator.options = { window: 1 }
  }

  generateSecret(): string {
    return authenticator.generateSecret()
  }

  keyuri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'MiniCRM', secret)
  }

  generate(secret: string): string {
    return authenticator.generate(secret)
  }

  /**
   * Verifica o token com proteção contra replay.
   * Retorna o timeStep consumido se válido; null se inválido OU já usado (replay).
   */
  verify(secret: string, token: string, lastTotpStep: number | null): number | null {
    const delta = authenticator.checkDelta(token, secret)
    if (delta === null) return null
    const currentStep = Math.floor(Date.now() / 1000 / STEP_SECONDS)
    const timeStep = currentStep + delta
    if (lastTotpStep !== null && timeStep <= lastTotpStep) return null // replay
    return timeStep
  }
}
