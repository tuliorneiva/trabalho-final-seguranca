import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { requireSecret } from '../config/secrets'

@Injectable()
export class CryptoService {
  private readonly key: Buffer

  constructor() {
    const secret = requireSecret('MFA_ENC_KEY', 'test-insecure-mfa-key')
    // Deriva uma chave de 32 bytes a partir de qualquer segredo.
    this.key = createHash('sha256').update(secret).digest()
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
  }

  decrypt(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':')
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Formato de payload criptografado inválido.')
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
    return plain.toString('utf8')
  }
}
