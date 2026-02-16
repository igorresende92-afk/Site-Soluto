/**
 * FinFlow - API Service Layer
 * Centralized HTTP client for communicating with PHP backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/Site-Soluto/FinFlow/api';

let authToken: string | null = localStorage.getItem('finflow_token');

function getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...getHeaders(), ...(options.headers || {}) },
    });

    if (res.status === 401) {
        authToken = null;
        localStorage.removeItem('finflow_token');
        localStorage.removeItem('finflow_session');
        window.location.hash = '#/';
        window.location.reload();
        throw new Error('Sessão expirada');
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Erro na requisição');
    }

    return data as T;
}

// ---- Token Management ----
export function setToken(token: string): void {
    authToken = token;
    localStorage.setItem('finflow_token', token);
}

export function clearToken(): void {
    authToken = null;
    localStorage.removeItem('finflow_token');
}

export function getToken(): string | null {
    return authToken;
}

// ---- Auth ----
export interface AuthResponse {
    token: string;
    user: ApiUser;
}

export interface ApiUser {
    id: number;
    name: string;
    email: string;
    photo?: string | null;
    isPremium: boolean;
    isAdmin: boolean;
    createdAt: string;
}

export async function apiLogin(email: string, passwordHash: string): Promise<AuthResponse> {
    return request('/auth.php?action=login', {
        method: 'POST',
        body: JSON.stringify({ email, password: passwordHash }),
    });
}

export async function apiRegister(name: string, email: string, passwordHash: string): Promise<AuthResponse> {
    return request('/auth.php?action=register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: passwordHash }),
    });
}

export async function apiGetMe(): Promise<{ user: ApiUser }> {
    return request('/auth.php?action=me');
}

// ---- Accounts ----
export interface ApiAccount {
    id: number;
    name: string;
    type: string;
    balance: number;
    color: string;
    icon: string;
    createdAt: string;
}

export async function apiGetAccounts(): Promise<ApiAccount[]> {
    return request('/accounts.php');
}

export async function apiCreateAccount(data: Partial<ApiAccount>): Promise<{ id: number }> {
    return request('/accounts.php', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateAccount(id: number, data: Partial<ApiAccount>): Promise<void> {
    return request(`/accounts.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteAccount(id: number): Promise<void> {
    return request(`/accounts.php?id=${id}`, { method: 'DELETE' });
}

// ---- Credit Cards ----
export interface ApiCreditCard {
    id: number;
    name: string;
    limit: number;
    closingDay: number;
    dueDay: number;
    color: string;
    createdAt: string;
}

export async function apiGetCards(): Promise<ApiCreditCard[]> {
    return request('/cards.php');
}

export async function apiCreateCard(data: Partial<ApiCreditCard>): Promise<{ id: number }> {
    return request('/cards.php', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateCard(id: number, data: Partial<ApiCreditCard>): Promise<void> {
    return request(`/cards.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteCard(id: number): Promise<void> {
    return request(`/cards.php?id=${id}`, { method: 'DELETE' });
}

// ---- Categories ----
export interface ApiCategory {
    id: number;
    name: string;
    icon: string;
    type: 'income' | 'expense';
    color: string;
}

export async function apiGetCategories(): Promise<ApiCategory[]> {
    return request('/categories.php');
}

export async function apiCreateCategory(data: Partial<ApiCategory>): Promise<{ id: number }> {
    return request('/categories.php', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateCategory(id: number, data: Partial<ApiCategory>): Promise<void> {
    return request(`/categories.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteCategory(id: number): Promise<void> {
    return request(`/categories.php?id=${id}`, { method: 'DELETE' });
}

export async function apiGenerateDefaults(): Promise<void> {
    return request('/categories.php?action=defaults', { method: 'POST' });
}

// ---- Transactions ----
export interface ApiTransaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: string;
    accountId: number;
    toAccountId?: number | null;
    creditCardId?: number | null;
    categoryId: number;
    isRecurring: boolean;
    recurrenceCount?: number | null;
    recurrenceGroupId?: string | null;
    installmentCurrent?: number | null;
    installmentTotal?: number | null;
    isRealized: boolean;
    createdAt: string;
}

export async function apiGetTransactions(month?: string, accountId?: number): Promise<ApiTransaction[]> {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (accountId) params.set('account_id', String(accountId));
    const qs = params.toString();
    return request(`/transactions.php${qs ? '?' + qs : ''}`);
}

export async function apiCreateTransaction(data: Partial<ApiTransaction>): Promise<{ id: number }> {
    return request('/transactions.php', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateTransaction(id: number, data: Partial<ApiTransaction>): Promise<void> {
    return request(`/transactions.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteTransaction(id: number): Promise<void> {
    return request(`/transactions.php?id=${id}`, { method: 'DELETE' });
}

// ---- Budget Goals ----
export interface ApiBudgetGoal {
    id: number;
    categoryId: number;
    month: string;
    limitAmount: number;
}

export async function apiGetBudgetGoals(): Promise<ApiBudgetGoal[]> {
    return request('/budget.php');
}

export async function apiCreateBudgetGoal(data: Partial<ApiBudgetGoal>): Promise<{ id: number }> {
    return request('/budget.php', { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateBudgetGoal(id: number, data: Partial<ApiBudgetGoal>): Promise<void> {
    return request(`/budget.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function apiDeleteBudgetGoal(id: number): Promise<void> {
    return request(`/budget.php?id=${id}`, { method: 'DELETE' });
}

// ---- User Profile ----
export async function apiUpdateName(name: string): Promise<void> {
    return request('/users.php?action=update_name', { method: 'PUT', body: JSON.stringify({ name }) });
}

export async function apiUpdatePhoto(photo: string | null): Promise<void> {
    return request('/users.php?action=update_photo', { method: 'PUT', body: JSON.stringify({ photo }) });
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request('/users.php?action=change_password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

export async function apiExportData(): Promise<Record<string, unknown[]>> {
    return request('/users.php?action=export');
}

// ---- Admin: User Management ----
export async function apiAdminGetUsers(): Promise<ApiUser[]> {
    return request('/admin.php?action=users');
}

export async function apiAdminCreateUser(data: {
    name: string; email: string; password: string;
    isPremium: boolean; isAdmin: boolean;
}): Promise<{ id: number }> {
    return request('/admin.php?action=create_user', {
        method: 'POST', body: JSON.stringify(data),
    });
}

export async function apiAdminUpdateUser(id: number, data: {
    name?: string; email?: string; password?: string;
    isPremium?: boolean; isAdmin?: boolean;
}): Promise<void> {
    return request(`/admin.php?action=update_user&id=${id}`, {
        method: 'PUT', body: JSON.stringify(data),
    });
}

export async function apiAdminDeleteUser(id: number): Promise<void> {
    return request(`/admin.php?action=delete_user&id=${id}`, { method: 'DELETE' });
}
