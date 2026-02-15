import { useState, useEffect, useCallback } from 'react'
import {
    apiGetAccounts, apiCreateAccount, apiUpdateAccount, apiDeleteAccount,
    type ApiAccount
} from '../../Services/api'
import { Plus, Pencil, Trash2, Wallet, PiggyBank, Landmark, MoreHorizontal, X } from 'lucide-react'

type AccountType = 'checking' | 'savings' | 'wallet' | 'other'

const accountIcons: Record<AccountType, typeof Wallet> = {
    checking: Landmark,
    savings: PiggyBank,
    wallet: Wallet,
    other: MoreHorizontal,
}

const accountLabels: Record<AccountType, string> = {
    checking: 'Conta Corrente',
    savings: 'Poupança',
    wallet: 'Carteira',
    other: 'Outro',
}

const defaultColors = ['#00f3ff', '#7c3aed', '#2ed573', '#ff4757', '#ffa502', '#ff6b6b', '#1e90ff', '#f472b6']

export function AccountsPage() {
    const [accounts, setAccounts] = useState<ApiAccount[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<ApiAccount | null>(null)
    const [name, setName] = useState('')
    const [type, setType] = useState<AccountType>('checking')
    const [balance, setBalance] = useState('')
    const [color, setColor] = useState(defaultColors[0])

    const loadAccounts = useCallback(async () => {
        try { setAccounts(await apiGetAccounts()) } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadAccounts() }, [loadAccounts])

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

    const openNew = () => {
        setEditing(null)
        setName('')
        setType('checking')
        setBalance('')
        setColor(defaultColors[Math.floor(Math.random() * defaultColors.length)])
        setShowModal(true)
    }

    const openEdit = (account: ApiAccount) => {
        setEditing(account)
        setName(account.name)
        setType(account.type as AccountType)
        setBalance(String(account.balance))
        setColor(account.color)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!name.trim()) return
        const data = {
            name: name.trim(),
            type,
            balance: parseFloat(balance) || 0,
            color,
            icon: accountIcons[type]?.name || 'Wallet',
        }
        if (editing?.id) {
            await apiUpdateAccount(editing.id, data)
        } else {
            await apiCreateAccount(data)
        }
        setShowModal(false)
        loadAccounts()
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir esta conta?')) {
            await apiDeleteAccount(id)
            loadAccounts()
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Contas</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        Total: {formatCurrency(totalBalance)}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> Nova
                </button>
            </div>

            <div className="container">
                {accounts.length === 0 ? (
                    <div className="empty-state">
                        <Wallet size={48} />
                        <p>Nenhuma conta cadastrada</p>
                        <p style={{ fontSize: '0.8rem' }}>Adicione suas contas bancárias, carteiras etc.</p>
                    </div>
                ) : (
                    accounts.map((account, i) => {
                        const Icon = accountIcons[account.type as AccountType] || Wallet
                        return (
                            <div key={account.id} className="list-item animate-in" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="list-item-icon" style={{ background: `${account.color}15` }}>
                                    <Icon size={22} color={account.color} />
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{account.name}</div>
                                    <div className="list-item-subtitle">{accountLabels[account.type as AccountType]}</div>
                                </div>
                                <div className="list-item-value" style={{ color: account.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                                    {formatCurrency(account.balance)}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn-icon" onClick={() => openEdit(account)} style={{ width: 32, height: 32 }}>
                                        <Pencil size={14} />
                                    </button>
                                    <button className="btn-icon" onClick={() => handleDelete(account.id)} style={{ width: 32, height: 32, color: 'var(--color-expense)' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Editar Conta' : 'Nova Conta'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label>Nome da conta</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" />
                        </div>

                        <div className="form-group">
                            <label>Tipo</label>
                            <select value={type} onChange={e => setType(e.target.value as AccountType)}>
                                {Object.entries(accountLabels).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Saldo inicial (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={balance}
                                onChange={e => setBalance(e.target.value)}
                                placeholder="0,00"
                            />
                        </div>

                        <div className="form-group">
                            <label>Cor</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {defaultColors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: c,
                                            border: color === c ? '3px solid white' : '3px solid transparent',
                                            cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', padding: 'var(--space-md)' }}>
                            {editing ? 'Salvar' : 'Criar Conta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
