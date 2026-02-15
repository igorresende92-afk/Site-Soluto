import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    apiGetBudgetGoals, apiCreateBudgetGoal, apiUpdateBudgetGoal, apiDeleteBudgetGoal,
    apiGetCategories, apiGetTransactions,
    type ApiBudgetGoal, type ApiCategory, type ApiTransaction
} from '../../Services/api'
import { Plus, X, Target, Pencil, Trash2 } from 'lucide-react'

export function BudgetGoalsPage() {
    const [goals, setGoals] = useState<ApiBudgetGoal[]>([])
    const [categories, setCategories] = useState<ApiCategory[]>([])
    const [transactions, setTransactions] = useState<ApiTransaction[]>([])

    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<ApiBudgetGoal | null>(null)
    const [categoryId, setCategoryId] = useState<number>(0)
    const [limitAmount, setLimitAmount] = useState('')
    const [month, setMonth] = useState(() => {
        const n = new Date()
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
    })

    const loadData = useCallback(async () => {
        try {
            const [g, c, t] = await Promise.all([
                apiGetBudgetGoals(),
                apiGetCategories(),
                apiGetTransactions(),
            ])
            setGoals(g)
            setCategories(c.filter(cat => cat.type === 'expense'))
            setTransactions(t)
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const goalsWithSpent = useMemo(() => {
        return goals.map(g => {
            const spent = transactions
                .filter(t => {
                    if (t.type !== 'expense' || !t.isRealized) return false
                    if (t.categoryId !== g.categoryId) return false
                    const d = new Date(t.date)
                    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    return m === g.month
                })
                .reduce((sum, t) => sum + t.amount, 0)
            const cat = categories.find(c => c.id === g.categoryId)
            const pct = g.limitAmount > 0 ? (spent / g.limitAmount) * 100 : 0
            return { ...g, spent, cat, pct }
        })
    }, [goals, transactions, categories])

    const openNew = () => {
        setEditing(null)
        setCategoryId(categories[0]?.id || 0)
        setLimitAmount('')
        const n = new Date()
        setMonth(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`)
        setShowModal(true)
    }

    const openEdit = (goal: ApiBudgetGoal) => {
        setEditing(goal)
        setCategoryId(goal.categoryId)
        setLimitAmount(String(goal.limitAmount))
        setMonth(goal.month)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!categoryId || !limitAmount) return
        const data = { categoryId, month, limitAmount: parseFloat(limitAmount) || 0 }
        if (editing?.id) {
            await apiUpdateBudgetGoal(editing.id, data)
        } else {
            await apiCreateBudgetGoal(data)
        }
        setShowModal(false)
        loadData()
    }

    const handleDelete = async (id: number) => {
        if (confirm('Excluir esta meta?')) {
            await apiDeleteBudgetGoal(id)
            loadData()
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Metas de Orçamento</h1>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> Nova
                </button>
            </div>

            <div className="container">
                {goalsWithSpent.length === 0 ? (
                    <div className="empty-state">
                        <Target size={48} />
                        <p>Nenhuma meta definida</p>
                        <p style={{ fontSize: '0.8rem' }}>Defina limites de gasto por categoria</p>
                    </div>
                ) : (
                    goalsWithSpent.map((g, i) => (
                        <div key={g.id} className="card animate-in"
                            style={{
                                marginBottom: 'var(--space-md)', animationDelay: `${i * 60}ms`,
                                borderColor: g.pct >= 100 ? 'rgba(255,71,87,0.3)' : g.pct >= 80 ? 'rgba(255,165,2,0.3)' : undefined
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.cat?.color || '#64748b' }} />
                                    <span style={{ fontWeight: 700 }}>{g.cat?.name || 'Categoria'}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>{g.month}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn-icon" onClick={() => openEdit(g)} style={{ width: 32, height: 32 }}>
                                        <Pencil size={14} />
                                    </button>
                                    <button className="btn-icon" onClick={() => handleDelete(g.id)} style={{ width: 32, height: 32, color: 'var(--color-expense)' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                <span>Gasto: {formatCurrency(g.spent)}</span>
                                <span>Meta: {formatCurrency(g.limitAmount)}</span>
                            </div>
                            <div className="stats-bar">
                                <div className="stats-bar-fill" style={{
                                    width: `${Math.min(g.pct, 100)}%`,
                                    background: g.pct >= 100 ? 'var(--color-danger)' : g.pct >= 80 ? '#ffa502' : g.cat?.color || 'var(--accent-primary)',
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: 4 }}>
                                <span style={{ color: g.pct >= 100 ? 'var(--color-danger)' : g.pct >= 80 ? '#ffa502' : 'var(--color-success)' }}>
                                    {Math.round(g.pct)}% utilizado
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    Restante: {formatCurrency(Math.max(g.limitAmount - g.spent, 0))}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Editar Meta' : 'Nova Meta'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label>Categoria</label>
                            <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
                                <option value={0}>Selecione</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Limite (R$)</label>
                            <input type="number" step="0.01" value={limitAmount} onChange={e => setLimitAmount(e.target.value)} placeholder="500,00" />
                        </div>

                        <div className="form-group">
                            <label>Mês</label>
                            <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
                        </div>

                        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', padding: 'var(--space-md)' }}>
                            {editing ? 'Salvar' : 'Criar Meta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
