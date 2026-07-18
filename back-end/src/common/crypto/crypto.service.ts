import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

@Injectable()
export class CryptoService {
  private readonly key: Buffer

  constructor() {
    const secret = process.env.MFA_ENC_KEY ?? 'dev-insecure-key-change-me'
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
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
    return plain.toString('utf8')
  }
}
