import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the environment variable before importing the module
const MOCK_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests'

describe('Encryption Utilities', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', MOCK_ENCRYPTION_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption')

      const originalText = 'Hello, World!'
      const encrypted = encrypt(originalText)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(originalText)
    })

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      const { encrypt } = await import('@/lib/encryption')

      const text = 'Same text'
      const encrypted1 = encrypt(text)
      const encrypted2 = encrypt(text)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle special characters', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption')

      const text = 'Special chars: äöü ß € @ # $ % ^ & * () {} []'
      const encrypted = encrypt(text)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(text)
    })

    it('should handle empty string', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption')

      const text = ''
      const encrypted = encrypt(text)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(text)
    })

    it('should handle long text', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption')

      const text = 'A'.repeat(10000)
      const encrypted = encrypt(text)
      const decrypted = decrypt(encrypted)

      expect(decrypted).toBe(text)
    })

    it('should throw error for invalid encrypted format', async () => {
      const { decrypt } = await import('@/lib/encryption')

      expect(() => decrypt('invalid-format')).toThrow('Failed to decrypt data')
    })

    it('should throw error for tampered ciphertext', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption')

      const encrypted = encrypt('test')
      const parts = encrypted.split(':')
      parts[2] = 'tampered' + parts[2]
      const tampered = parts.join(':')

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data')
    })
  })

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt an object correctly', async () => {
      const { encryptObject, decryptObject } = await import('@/lib/encryption')

      const obj = { name: 'Test', value: 123, nested: { foo: 'bar' } }
      const encrypted = encryptObject(obj)
      const decrypted = decryptObject(encrypted)

      expect(decrypted).toEqual(obj)
    })

    it('should handle arrays', async () => {
      const { encryptObject, decryptObject } = await import('@/lib/encryption')

      const arr = [1, 2, 3, 'test', { key: 'value' }]
      const encrypted = encryptObject(arr)
      const decrypted = decryptObject(encrypted)

      expect(decrypted).toEqual(arr)
    })

    it('should handle null values in objects', async () => {
      const { encryptObject, decryptObject } = await import('@/lib/encryption')

      const obj = { value: null, other: 'test' }
      const encrypted = encryptObject(obj)
      const decrypted = decryptObject(encrypted)

      expect(decrypted).toEqual(obj)
    })

    it('should handle complex nested structures', async () => {
      const { encryptObject, decryptObject } = await import('@/lib/encryption')

      const obj = {
        database: {
          host: 'localhost',
          port: 5432,
          credentials: {
            username: 'admin',
            password: 'secret123',
          },
        },
        options: ['opt1', 'opt2'],
      }

      const encrypted = encryptObject(obj)
      const decrypted = decryptObject(encrypted)

      expect(decrypted).toEqual(obj)
    })
  })

  describe('encryption key handling', () => {
    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      vi.unstubAllEnvs()
      vi.resetModules()
      vi.stubEnv('ENCRYPTION_KEY', '')

      const { encrypt } = await import('@/lib/encryption')

      expect(() => encrypt('test')).toThrow()
    })
  })
})
