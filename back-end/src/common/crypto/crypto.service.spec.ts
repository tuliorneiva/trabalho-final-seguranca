import { CryptoService } from './crypto.service'

describe('CryptoService', () => {
  const svc = new CryptoService()

  it('round-trips a value and does not store plaintext', () => {
    const enc = svc.encrypt('JBSWY3DPEHPK3PXP')
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP')
    expect(svc.decrypt(enc)).toBe('JBSWY3DPEHPK3PXP')
  })

  it('uses a random IV so ciphertext differs each call', () => {
    expect(svc.encrypt('same-value')).not.toBe(svc.encrypt('same-value'))
  })

  it('throws on malformed encrypted payload', () => {
    expect(() => svc.decrypt('malformed-value')).toThrow('Formato de payload criptografado inválido.')
  })
})
