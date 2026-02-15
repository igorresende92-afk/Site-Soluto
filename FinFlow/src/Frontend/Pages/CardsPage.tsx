import { useState, useEffect, useCallback } from 'react'
import {
    apiGetCards, apiCreateCard, apiUpdateCard, apiDeleteCard,
    apiGetTransactions,
    type ApiCreditCard, type ApiTransaction
} from '../../Services/api'
import { Plus, CreditCard as CardIcon, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'

const defaultColors = ['#00f3ff', '#7c3aed', '#ff4757', '#ffa502', '#2ed573', '#f472b6']

export function CardsPage() {
    const [cards, setCards] = useState<ApiCreditCard[]>([])
    const [transactions, setTransactions] = useState<ApiTransaction[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<ApiCreditCard | null>(null)

    const [name, setName] = useState('')
    const [limit, setLimit] = useState('')
    const [closingDay, setClosingDay] = useState('5')
    const [dueDay, setDueDay] = useState('15')
    const [color, setColor] = useState(defaultColors[0])

    const loadData = useCallback(async () => {
        try {
            const now = new Date()
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const [c, t] = await Promise.all([apiGetCards(), apiGetTransactions(month)])
            setCards(c)
            setTransactions(t)
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const getCardUsage = (cardId: number) => {
        return transactions
            .filter(t => t.creditCardId === cardId && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)
    }

    const openNew = () => {
        setEditing(null)
        setName('')
        setLimit('')
        setClosingDay('5')
        setDueDay('15')
        setColor(defaultColors[Math.floor(Math.random() * defaultColors.length)])
        setShowModal(true)
    }

    const openEdit = (card: ApiCreditCard) => {
        setEditing(card)
        setName(card.name)
        setLimit(String(card.limit))
        setClosingDay(String(card.closingDay))
        setDueDay(String(card.dueDay))
        setColor(card.color)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!name.trim()) return
        const data = {
            name: name.trim(),
            limit: parseFloat(limit) || 0,
            closingDay: parseInt(closingDay) || 5,
            dueDay: parseInt(dueDay) || 15,
            color,
        }
        if (editing?.id) {
            await apiUpdateCard(editing.id, data)
        } else {
            await apiCreateCard(data)
        }
        setShowModal(false)
        loadData()
    }

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir este cartão?')) {
            await apiDeleteCard(id)
            loadData()
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Cartões</h1>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> Novo
                </button>
            </div>

            <div className="container">
                {cards.length === 0 ? (
                    <div className="empty-state">
                        <CardIcon size={48} />
                        <p>Nenhum cartão cadastrado</p>
                        <p style={{ fontSize: '0.8rem' }}>Adicione seus cartões de crédito</p>
                    </div>
                ) : (
                    cards.map((card, i) => {
                        const used = getCardUsage(card.id)
                        const usagePercent = card.limit > 0 ? (used / card.limit) * 100 : 0
                        const isWarning = usagePercent >= 80

                        return (
                            <div
                                key={card.id}
                                className="card animate-in"
                                style={{
                                    marginBottom: 'var(--space-md)',
                                    animationDelay: `${i * 80}ms`,
                                    borderColor: isWarning ? 'rgba(255, 71, 87, 0.3)' : undefined,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <CardIcon size={20} color={card.color} />
                                        <span style={{ fontWeight: 700 }}>{card.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn-icon" onClick={() => openEdit(card)} style={{ width: 32, height: 32 }}>
                                            <Pencil size={14} />
                                        </button>
                                        <button className="btn-icon" onClick={() => handleDelete(card.id)} style={{ width: 32, height: 32, color: 'var(--color-expense)' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 'var(--space-sm)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        <span>Usado: {formatCurrency(used)}</span>
                                        <span>Limite: {formatCurrency(card.limit)}</span>
                                    </div>
                                    <div className="stats-bar">
                                        <div className="stats-bar-fill" style={{
                                            width: `${Math.min(usagePercent, 100)}%`,
                                            background: isWarning ? 'var(--color-danger)' : card.color,
                                        }} />
                                    </div>
                                </div>

                                {isWarning && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '6px 10px', background: 'rgba(255, 71, 87, 0.1)',
                                        borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--color-danger)',
                                    }}>
                                        <AlertTriangle size={14} /> Atenção: {Math.round(usagePercent)}% do limite utilizado
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    <span>Fechamento: dia {card.closingDay}</span>
                                    <span>Vencimento: dia {card.dueDay}</span>
                                </div>

                                <div style={{ marginTop: 'var(--space-md)', textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Disponível: </span>
                                    <span style={{ fontWeight: 700, color: 'var(--color-income)' }}>
                                        {formatCurrency(Math.max(card.limit - used, 0))}
                                    </span>
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
                            <h2>{editing ? 'Editar Cartão' : 'Novo Cartão'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label>Nome do cartão</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" />
                        </div>

                        <div className="form-group">
                            <label>Limite (R$)</label>
                            <input type="number" step="0.01" value={limit} onChange={e => setLimit(e.target.value)} placeholder="5000" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <div className="form-group">
                                <label>Dia de fechamento</label>
                                <input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Dia de vencimento</label>
                                <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Cor</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {defaultColors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: 32, height: 32, borderRadius: '50%', background: c,
                                            border: color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', padding: 'var(--space-md)' }}>
                            {editing ? 'Salvar' : 'Criar Cartão'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
