import Dexie, { type EntityTable } from 'dexie';
import { hashPassword, isAlreadyHashed } from '../Backend/Application/Utils/crypto';

// ============ TYPES ============
export interface User {
    id?: number;
    name: string;
    email: string;
    password: string; // SHA-256 hashed via Web Crypto API
    photo?: string;   // base64 data URL
    isPremium: boolean;
    isAdmin?: boolean;
    createdAt: Date;
}

export type AccountType = 'checking' | 'savings' | 'wallet' | 'other';

export interface Account {
    id?: number;
    name: string;
    type: AccountType;
    balance: number;
    color: string;
    icon: string;
    createdAt: Date;
}

export interface CreditCard {
    id?: number;
    name: string;
    limit: number;
    closingDay: number;   // 1-31
    dueDay: number;       // 1-31
    color: string;
    createdAt: Date;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Category {
    id?: number;
    name: string;
    icon: string;
    type: 'income' | 'expense';
    color: string;
}

export interface Transaction {
    id?: number;
    description: string;
    amount: number;
    type: TransactionType;
    date: Date;
    accountId: number;
    toAccountId?: number;       // for transfers
    creditCardId?: number;      // if expense on card
    categoryId: number;
    isRecurring: boolean;
    recurrenceCount?: number;   // how many times it repeats
    recurrenceGroupId?: string; // groups recurring items
    installmentCurrent?: number;
    installmentTotal?: number;
    isRealized: boolean;        // confirmed / efectivado
    createdAt: Date;
}

export interface BudgetGoal {
    id?: number;
    categoryId: number;
    month: string; // 'YYYY-MM'
    limitAmount: number;
}

// ============ DATABASE ============
const db = new Dexie('FinFlowDB') as Dexie & {
    users: EntityTable<User, 'id'>;
    accounts: EntityTable<Account, 'id'>;
    creditCards: EntityTable<CreditCard, 'id'>;
    categories: EntityTable<Category, 'id'>;
    transactions: EntityTable<Transaction, 'id'>;
    budgetGoals: EntityTable<BudgetGoal, 'id'>;
};

db.version(1).stores({
    users: '++id, name',
    accounts: '++id, name, type',
    creditCards: '++id, name',
    categories: '++id, name, type',
    transactions: '++id, type, date, accountId, categoryId, creditCardId, recurrenceGroupId',
    budgetGoals: '++id, categoryId, month',
});

db.version(2).stores({
    users: '++id, name, email',
    accounts: '++id, name, type',
    creditCards: '++id, name',
    categories: '++id, name, type',
    transactions: '++id, type, date, accountId, categoryId, creditCardId, recurrenceGroupId',
    budgetGoals: '++id, categoryId, month',
}).upgrade(tx => {
    return tx.table('users').toCollection().modify(user => {
        if (!user.email) {
            user.email = 'usuario@finflow.app';
            user.password = user.pin || '1234';
            delete user.pin;
        }
    });
});

db.version(3).stores({
    users: '++id, name, email',
    accounts: '++id, name, type',
    creditCards: '++id, name',
    categories: '++id, name, type',
    transactions: '++id, type, date, accountId, categoryId, creditCardId, recurrenceGroupId',
    budgetGoals: '++id, categoryId, month',
}).upgrade(tx => {
    // Grant admin to first registered user
    return tx.table('users').toCollection().modify(user => {
        if (user.id === 1) {
            user.isAdmin = true;
        }
    });
});

db.version(4).stores({
    users: '++id, name, email',
    accounts: '++id, name, type',
    creditCards: '++id, name',
    categories: '++id, name, type',
    transactions: '++id, type, date, accountId, categoryId, creditCardId, recurrenceGroupId',
    budgetGoals: '++id, categoryId, month',
}).upgrade(tx => {
    // LEGACY: v4 migration — credential setup already applied.
    // Hardcoded credentials removed for security (C2 remediation).
    return tx.table('users').toCollection().modify(user => {
        if (user.id === 1) {
            user.isAdmin = true;
        }
    });
});

// ============ SEED DATA ============
export async function seedDefaultCategories() {
    const count = await db.categories.count();
    if (count === 0) {
        await db.categories.bulkAdd([
            { name: 'Salário', icon: 'Banknote', type: 'income', color: '#2ed573' },
            { name: 'Freelance', icon: 'Laptop', type: 'income', color: '#00f3ff' },
            { name: 'Investimentos', icon: 'TrendingUp', type: 'income', color: '#7c3aed' },
            { name: 'Outros', icon: 'Plus', type: 'income', color: '#64748b' },
            { name: 'Alimentação', icon: 'UtensilsCrossed', type: 'expense', color: '#ff6b6b' },
            { name: 'Transporte', icon: 'Car', type: 'expense', color: '#ffa502' },
            { name: 'Moradia', icon: 'Home', type: 'expense', color: '#1e90ff' },
            { name: 'Saúde', icon: 'Heart', type: 'expense', color: '#ff4757' },
            { name: 'Educação', icon: 'GraduationCap', type: 'expense', color: '#2ed573' },
            { name: 'Lazer', icon: 'Gamepad2', type: 'expense', color: '#ff00ff' },
            { name: 'Assinaturas', icon: 'CreditCard', type: 'expense', color: '#00f3ff' },
            { name: 'Compras', icon: 'ShoppingBag', type: 'expense', color: '#f472b6' },
            { name: 'Outros', icon: 'MoreHorizontal', type: 'expense', color: '#64748b' },
        ]);
    }
}
/**
 * Migrates any plaintext passwords to SHA-256 hashes.
 * Safe to call multiple times — skips already-hashed passwords.
 */
export async function hashExistingPasswords() {
    const allUsers = await db.users.toArray();
    for (const user of allUsers) {
        if (user.id && !isAlreadyHashed(user.password)) {
            const hashed = await hashPassword(user.password);
            await db.users.update(user.id, { password: hashed });
        }
    }
}


/**
 * Ensures 'igor.resende92@hotmail.com' exists as admin.
 * If no users exist, it creates this account.
 */
export async function seedDefaultAdmin() {
    const adminEmail = 'igor.resende92@hotmail.com';
    const existing = await db.users.where('email').equals(adminEmail).first();

    if (!existing) {
        // If no user with this email, create it
        const hashedPassword = await hashPassword('88495397');

        await db.users.add({
            name: 'Igor Resende',
            email: adminEmail,
            password: hashedPassword,
            isPremium: true,
            isAdmin: true,
            createdAt: new Date()
        });
        console.log('Seeded admin user:', adminEmail);
    } else {
        // If exists, ensure it is admin/premium and update password
        const hashedPassword = await hashPassword('88495397');
        await db.users.update(existing.id!, {
            isAdmin: true,
            isPremium: true,
            password: hashedPassword
        });
    }
}

export { db };
