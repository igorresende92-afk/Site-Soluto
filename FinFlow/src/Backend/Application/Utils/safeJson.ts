/**
 * Safe JSON parse — never throws, returns fallback on corrupt data.
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback
    try {
        return JSON.parse(json) as T
    } catch {
        return fallback
    }
}
