/**
 * Security utilities for FinFlow.
 * Uses Web Crypto API (native, no dependencies).
 */

/**
 * Hashes a password using SHA-256 via Web Crypto API.
 * Returns a 64-character hex string.
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Checks if a string looks like an already-hashed password (64 hex chars = SHA-256).
 */
export function isAlreadyHashed(value: string): boolean {
    return /^[a-f0-9]{64}$/.test(value)
}

/**
 * Validates password strength.
 * Returns null if valid, or an error message string.
 */
export function validatePasswordStrength(password: string): string | null {
    if (password.length < 8) return 'Senha deve ter ao menos 8 caracteres'
    if (!/[A-Z]/.test(password)) return 'Senha deve conter ao menos uma letra maiúscula'
    if (!/[0-9]/.test(password)) return 'Senha deve conter ao menos um número'
    if (!/[^A-Za-z0-9]/.test(password)) return 'Senha deve conter ao menos um caractere especial (!@#$...)'
    return null
}
