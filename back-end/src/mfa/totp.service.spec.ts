import { TotpService } from './totp.service'

describe('TotpService', () => {
  const svc = new TotpService()

  it('valid code accepted', () => {
    const secret = svc.generateSecret()
    const token = svc.generate(secret)
    const step = svc.verify(secret, token, null)
    expect(typeof step).toBe('number')
  })

  it('replay rejected: same token and step', () => {
    const secret = svc.generateSecret()
    const token = svc.generate(secret)
    const step = svc.verify(secret, token, null)
    // Verify step is a number before testing replay
    expect(typeof step).toBe('number')
    // Replay should be rejected (timeStep <= lastTotpStep)
    expect(svc.verify(secret, token, step)).toBeNull()
  })

  it('replay rejected: boundary case with step - 1', () => {
    const secret = svc.generateSecret()
    const token = svc.generate(secret)
    const step = svc.verify(secret, token, null)
    expect(typeof step).toBe('number')
    if (typeof step === 'number') {
      // Even with lastTotpStep = step - 1, the same token should still return step
      expect(svc.verify(secret, token, step - 1)).toEqual(step)
      // Now use step itself as lastTotpStep - should reject as replay
      expect(svc.verify(secret, token, step)).toBeNull()
    }
  })

  it('invalid code rejected', () => {
    const secret = svc.generateSecret()
    // Use a different secret to generate an invalid code
    const differentSecret = svc.generateSecret()
    const invalidToken = svc.generate(differentSecret)
    expect(svc.verify(secret, invalidToken, null)).toBeNull()
  })
})
