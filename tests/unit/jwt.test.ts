import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken, verifyToken, TokenPayload } from '@/lib/jwt'

describe('JWT Utilities', () => {
  const testPayload: TokenPayload = {
    userId: 'user-123',
    email: 'test@example.com',
  }

  describe('signToken', () => {
    it('should create a valid JWT token', () => {
      const token = signToken(testPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should create different tokens for different payloads', () => {
      const token1 = signToken(testPayload)
      const token2 = signToken({ userId: 'user-456', email: 'other@example.com' })

      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = signToken(testPayload)
      const decoded = verifyToken(token)

      expect(decoded).not.toBeNull()
      expect(decoded?.userId).toBe(testPayload.userId)
      expect(decoded?.email).toBe(testPayload.email)
    })

    it('should return null for invalid token', () => {
      const result = verifyToken('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null for malformed token', () => {
      const result = verifyToken('not.a.valid.jwt.token')

      expect(result).toBeNull()
    })

    it('should return null for empty token', () => {
      const result = verifyToken('')

      expect(result).toBeNull()
    })
  })

  describe('signToken and verifyToken integration', () => {
    it('should round-trip token creation and verification', () => {
      const payload: TokenPayload = {
        userId: 'integration-test-user',
        email: 'integration@test.com',
      }

      const token = signToken(payload)
      const decoded = verifyToken(token)

      expect(decoded?.userId).toBe(payload.userId)
      expect(decoded?.email).toBe(payload.email)
    })
  })
})
