import { describe, it, expect } from 'vitest'

describe('db.ts — Types & Exports', () => {
    it('should export db and seed function', async () => {
        const dbModule = await import('../Data/db')
        expect(dbModule.db).toBeDefined()
        expect(dbModule.seedDefaultCategories).toBeDefined()
        expect(typeof dbModule.seedDefaultCategories).toBe('function')
    })

    it('db should have all required tables', async () => {
        const { db } = await import('../Data/db')
        expect(db.tables.map(t => t.name)).toEqual(
            expect.arrayContaining([
                'users',
                'accounts',
                'creditCards',
                'categories',
                'transactions',
                'budgetGoals',
            ])
        )
    })
})
