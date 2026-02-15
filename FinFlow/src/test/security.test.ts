import { describe, it, expect } from 'vitest'
import { hashPassword, isAlreadyHashed, validatePasswordStrength } from '../Backend/Application/Utils/crypto'
import { safeJsonParse } from '../Backend/Application/Utils/safeJson'

describe('crypto.ts — hashPassword', () => {
    it('should return a 64-char hex string', async () => {
        const hash = await hashPassword('test123')
        expect(hash).toHaveLength(64)
        expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
    })

    it('should produce deterministic results', async () => {
        const hash1 = await hashPassword('myPassword')
        const hash2 = await hashPassword('myPassword')
        expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', async () => {
        const hash1 = await hashPassword('password1')
        const hash2 = await hashPassword('password2')
        expect(hash1).not.toBe(hash2)
    })
})

describe('crypto.ts — isAlreadyHashed', () => {
    it('should detect a valid SHA-256 hash', () => {
        const hash = 'a'.repeat(64)
        expect(isAlreadyHashed(hash)).toBe(true)
    })

    it('should reject plaintext passwords', () => {
        expect(isAlreadyHashed('123@mudar')).toBe(false)
        expect(isAlreadyHashed('short')).toBe(false)
        expect(isAlreadyHashed('')).toBe(false)
    })

    it('should reject strings with uppercase hex', () => {
        const upper = 'A'.repeat(64)
        expect(isAlreadyHashed(upper)).toBe(false) // Only lowercase hex
    })
})

describe('crypto.ts — validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
        expect(validatePasswordStrength('Ab1!')).not.toBeNull()
    })

    it('should reject passwords without uppercase', () => {
        expect(validatePasswordStrength('abcd1234!')).not.toBeNull()
    })

    it('should reject passwords without numbers', () => {
        expect(validatePasswordStrength('Abcdefgh!')).not.toBeNull()
    })

    it('should reject passwords without special characters', () => {
        expect(validatePasswordStrength('Abcdefg1')).not.toBeNull()
    })

    it('should accept a strong password', () => {
        expect(validatePasswordStrength('MyP@ssw0rd')).toBeNull()
    })
})

describe('safeJson.ts — safeJsonParse', () => {
    it('should parse valid JSON', () => {
        expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
    })

    it('should return fallback on invalid JSON', () => {
        expect(safeJsonParse('not json', {})).toEqual({})
    })

    it('should return fallback on null', () => {
        expect(safeJsonParse(null, { x: 5 })).toEqual({ x: 5 })
    })

    it('should return fallback on empty string', () => {
        expect(safeJsonParse('', 'default')).toBe('default')
    })
})
