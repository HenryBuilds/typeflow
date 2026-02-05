import crypto from 'crypto';
import { env } from '@/lib/env';

// Encryption key from validated environment (must be 32 bytes for AES-256)
const getEncryptionKey = (): Buffer => {
  const key = env.ENCRYPTION_KEY;
  
  // If the key is not exactly 32 bytes, hash it to get 32 bytes
  if (key.length !== 64) { // 32 bytes = 64 hex characters
    return crypto.createHash('sha256').update(key).digest();
  }
  
  return Buffer.from(key, 'hex');
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM
const AUTH_TAG_LENGTH = 16;

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv:authTag:encryptedData (all in hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Helper functions for encrypting/decrypting objects
export function encryptObject(obj: unknown): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptObject<T>(encryptedText: string): T {
  return JSON.parse(decrypt(encryptedText)) as T;
}
