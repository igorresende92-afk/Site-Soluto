import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    apiGetTransactions, apiCreateTransaction, apiUpdateTransaction, apiDeleteTransaction,
    apiGetAccounts, apiGetCards, apiGetCategories, apiUpdateAccount,
    type ApiTransaction, type ApiAccount, type ApiCreditCard, type ApiCategory
} from '../../Services/api'
import {
    Plus, X, TrendingUp, TrendingDown, ArrowLeftRight,
    Pencil, Trash2, Repeat, Check, Clock
} from 'lucide-react'

type TransactionType = 'income' | 'expense' | 'transfer'

export function TransactionsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [transactions, setTransactions] = useState<ApiTransaction[]>([])
    const [accounts, setAccounts] = useState<ApiAccount[]>([])
    const [cards, setCards] = useState<ApiCreditCard[]>([])
    const [categories, setCategories] = useState<ApiCategory[]>([])

    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<ApiTransaction | null>(null)

    const [description, setDescription] = useState('')
    const [amount, setAmount] = useState('')
    const [type, setType] = useState<TransactionType>('expense')
    const [accountId, setAccountId] = useState<number>(0)
    const [toAccountId, setToAccountId] = useState<number>(0)
    const [creditCardId, setCreditCardId] = useState<number>(0)
    const [categoryId, setCategoryId] = useState<number>(0)
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
    const [isRecurring, setIsRecurring] = useState(false)
    const [recurrenceCount, setRecurrenceCount] = useState('1')
    const [installmentTotal, setInstallmentTotal] = useState('1')
    const [isRealized, setIsRealized] = useState(true)
    const [useCard, setUseCard] = useState(false)

    const loadData = useCallback(async () => {
        try {
            const [t, a, c, cat] = await Promise.all([
                apiGetTransactions(),
                apiGetAccounts(),
                apiGetCards(),
                apiGetCategories(),
            ])
            setTransactions(t)
            setAccounts(a)
            setCards(c)
            setCategories(cat)
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const openNew = () => {
        setEditing(null)
        setDescription('')
        setAmount('')
        setType('expense')
        setAccountId(accounts[0]?.id || 0)
        setToAccountId(0)
        setCreditCardId(0)
        setCategoryId(categories[0]?.id || 0)
        setDate(new Date().toISOString().slice(0, 10))
        setIsRecurring(false)
        setRecurrenceCount('1')
        setInstallmentTotal('1')
        setIsRealized(true)
        setUseCard(false)
        setShowModal(true)
    }

    useEffect(() => {
        if (searchParams.get('new') === '1' && accounts.length > 0) {
            openNew()
            setSearchParams({}, { replace: true })
        }
    }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

    const openEdit = (t: ApiTransaction) => {
        setEditing(t)
        setDescription(t.description)
        setAmount(String(t.amount))
        setType(t.type)
        setAccountId(t.accountId)
        setToAccountId(t.toAccountId || 0)
        setCreditCardId(t.creditCardId || 0)
        setCategoryId(t.categoryId)
        setDate(new Date(t.date).toISOString().slice(0, 10))
        setIsRecurring(t.isRecurring)
        setRecurrenceCount(String(t.recurrenceCount || 1))
        setInstallmentTotal(String(t.installmentTotal || 1))
        setIsRealized(t.isRealized)
        setUseCard(!!t.creditCardId)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!description.trim() || !amount) return
        const amountVal = parseFloat(amount)
        const instTotal = parseInt(installmentTotal) || 1
        const recCount = parseInt(recurrenceCount) || 1
        const groupId = crypto.randomUUID()

        const baseTx = {
            description: description.trim(),
            amount: amountVal,
            type,
            date,
            accountId,
            toAccountId: type === 'transfer' ? toAccountId : undefined,
            creditCardId: useCard && type === 'expense' ? creditCardId : undefined,
            categoryId,
            isRecurring,
            recurrenceCount: isRecurring ? recCount : undefined,
            recurrenceGroupId: (isRecurring || instTotal > 1) ? groupId : undefined,
            installmentCurrent: undefined as number | undefined,
            installmentTotal: instTotal > 1 ? instTotal : undefined,
            isRealized,
        }

        if (editing?.id) {
            await apiUpdateTransaction(editing.id, baseTx)

            // Update account balance if realized changed
            if (isRealized !== editing.isRealized) {
                await updateAccountBalance(type, accountId, amountVal, isRealized, toAccountId)
            }
        } else {
            if (instTotal > 1 && type === 'expense') {
                const installmentAmount = amountVal / instTotal
                for (let i = 0; i < instTotal; i++) {
                    const instDate = new Date(date)
                    instDate.setMonth(instDate.getMonth() + i)
                    await apiCreateTransaction({
                        ...baseTx,
                        amount: installmentAmount,
                        date: instDate.toISOString().slice(0, 10),
                        installmentCurrent: i + 1,
                        isRealized: i === 0 ? isRealized : false,
                    })
                }
            } else if (isRecurring && recCount > 1) {
                for (let i = 0; i < recCount; i++) {
                    const recDate = new Date(date)
                    recDate.setMonth(recDate.getMonth() + i)
                    await apiCreateTransaction({
                        ...baseTx,
                        date: recDate.toISOString().slice(0, 10),
                        isRealized: i === 0 ? isRealized : false,
                    })
                }
            } else {
                await apiCreateTransaction(baseTx)
            }

            if (isRealized) {
                await updateAccountBalance(type, accountId, amountVal, true, toAccountId)
            }
        }

        setShowModal(false)
        loadData()
    }

    const updateAccountBalance = async (txType: TransactionType, accId: number, val: number, realized: boolean, toAccId?: number) => {
        if (!realized) return
        const account = accounts.find(a => a.id === accId)
        if (!account) return

        if (txType === 'income') {
            await apiUpdateAccount(accId, { ...account, balance: account.balance + val })
        } else if (txType === 'expense') {
            await apiUpdateAccount(accId, { ...account, balance: account.balance - val })
        } else if (txType === 'transfer' && toAccId) {
            const toAccount = accounts.find(a => a.id === toAccId)
            if (toAccount) {
                await apiUpdateAccount(accId, { ...account, balance: account.balance - val })
                await apiUpdateAccount(toAccId, { ...toAccount, balance: toAccount.balance + val })
            }
        }
    }

    const handleDelete = async (t: ApiTransaction) => {
        if (!confirm('Excluir esta transação?')) return

        if (t.isRealized) {
            const account = accounts.find(a => a.id === t.accountId)
            if (account) {
                if (t.type === 'income') {
                    await apiUpdateAccount(t.accountId, { ...account, balance: account.balance - t.amount })
                } else if (t.type === 'expense') {
                    await apiUpdateAccount(t.accountId, { ...account, balance: account.balance + t.amount })
                }
            }
        }

        await apiDeleteTransaction(t.id)
        loadData()
    }

    const toggleRealized = async (t: ApiTransaction) => {
        const newRealized = !t.isRealized
        await apiUpdateTransaction(t.id, { ...t, isRealized: newRealized })
        await updateAccountBalance(t.type, t.accountId, t.amount, newRealized, t.toAccountId || undefined)
        loadData()
    }

    const typeIcons = {
        income: <TrendingUp size={18} color="#2ed573" />,
        expense: <TrendingDown size={18} color="#ff4757" />,
        transfer: <ArrowLeftRight size={18} color="#ffa502" />,
    }

    const typeLabels = {
        income: 'Receita',
        expense: 'Despesa',
        transfer: 'Transferência',
    }

    const filteredCategories = categories.filter(c =>
        type === 'transfer' ? true : c.type === (type === 'income' ? 'income' : 'expense')
    )

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Transações</h1>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> Nova
                </button>
            </div>

            <div className="container">
                {transactions.length === 0 ? (
                    <div className="empty-state">
                        <ArrowLeftRight size={48} />
                        <p>Nenhuma transação</p>
                        <p style={{ fontSize: '0.8rem' }}>Adicione receitas, despesas ou transferências</p>
                    </div>
                ) : (
                    transactions.map((t, i) => {
                        const cat = categories.find(c => c.id === t.categoryId)
                        const acc = accounts.find(a => a.id === t.accountId)
                        return (
                            <div key={t.id} className="list-item animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                                <div className="list-item-icon" style={{
                                    background: t.type === 'income' ? 'rgba(46,213,115,0.12)' : t.type === 'expense' ? 'rgba(255,71,87,0.12)' : 'rgba(255,165,2,0.12)'
                                }}>
                                    {typeIcons[t.type]}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {t.description}
                                        {t.isRecurring && <Repeat size={12} color="var(--accent-primary)" />}
                                        {t.installmentTotal && t.installmentTotal > 1 && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2 }}>
                                                {t.installmentCurrent}/{t.installmentTotal}
                                            </span>
                                        )}
                                    </div>
                                    <div className="list-item-subtitle">
                                        {cat?.name || ''} · {acc?.name || ''} · {new Date(t.date).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <span className={`list-item-value ${t.type === 'income' ? 'amount-positive' : t.type === 'expense' ? 'amount-negative' : 'amount-neutral'}`}>
                                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} {formatCurrency(t.amount)}
                                    </span>
                                    <div style={{ display: 'flex', gap: 2 }}>
                                        <button className="btn-icon" onClick={() => toggleRealized(t)}
                                            style={{ width: 26, height: 26, color: t.isRealized ? 'var(--color-success)' : 'var(--text-muted)' }}
                                            title={t.isRealized ? 'Realizada' : 'Pendente'}>
                                            {t.isRealized ? <Check size={12} /> : <Clock size={12} />}
                                        </button>
                                        <button className="btn-icon" onClick={() => openEdit(t)} style={{ width: 26, height: 26 }}>
                                            <Pencil size={12} />
                                        </button>
                                        <button className="btn-icon" onClick={() => handleDelete(t)} style={{ width: 26, height: 26, color: 'var(--color-expense)' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
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
                            <h2>{editing ? 'Editar Transação' : 'Nova Transação'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-lg)' }}>
                            {(['income', 'expense', 'transfer'] as TransactionType[]).map(t => (
                                <button key={t} className={`btn ${type === t ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setType(t)} style={{ flex: 1 }}>
                                    {typeLabels[t]}
                                </button>
                            ))}
                        </div>

                        <div className="form-group">
                            <label>Descrição</label>
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Supermercado" />
                        </div>

                        <div className="form-group">
                            <label>Valor (R$)</label>
                            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
                        </div>

                        <div className="form-group">
                            <label>Data</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label>{type === 'transfer' ? 'Conta origem' : 'Conta'}</label>
                            <select value={accountId} onChange={e => setAccountId(Number(e.target.value))}>
                                <option value={0}>Selecione</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>

                        {type === 'transfer' && (
                            <div className="form-group">
                                <label>Conta destino</label>
                                <select value={toAccountId} onChange={e => setToAccountId(Number(e.target.value))}>
                                    <option value={0}>Selecione</option>
                                    {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        )}

                        {type === 'expense' && (
                            <div className="toggle-wrapper">
                                <span style={{ fontSize: '0.85rem' }}>Usar cartão de crédito</span>
                                <div className={`toggle ${useCard ? 'active' : ''}`} onClick={() => setUseCard(!useCard)} />
                            </div>
                        )}

                        {useCard && type === 'expense' && (
                            <div className="form-group">
                                <label>Cartão</label>
                                <select value={creditCardId} onChange={e => setCreditCardId(Number(e.target.value))}>
                                    <option value={0}>Selecione</option>
                                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {type !== 'transfer' && (
                            <div className="form-group">
                                <label>Categoria</label>
                                <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}>
                                    <option value={0}>Selecione</option>
                                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="toggle-wrapper">
                            <span style={{ fontSize: '0.85rem' }}>Recorrente</span>
                            <div className={`toggle ${isRecurring ? 'active' : ''}`} onClick={() => setIsRecurring(!isRecurring)} />
                        </div>

                        {isRecurring && (
                            <div className="form-group">
                                <label>Quantidade de repetições</label>
                                <input type="number" min="1" value={recurrenceCount} onChange={e => setRecurrenceCount(e.target.value)} />
                            </div>
                        )}

                        {type === 'expense' && !isRecurring && (
                            <div className="form-group">
                                <label>Parcelas</label>
                                <input type="number" min="1" value={installmentTotal} onChange={e => setInstallmentTotal(e.target.value)} placeholder="1" />
                            </div>
                        )}

                        <div className="toggle-wrapper">
                            <span style={{ fontSize: '0.85rem' }}>{type === 'income' ? 'Receita realizada' : type === 'expense' ? 'Despesa realizada' : 'Transferência realizada'}</span>
                            <div className={`toggle ${isRealized ? 'active' : ''}`} onClick={() => setIsRealized(!isRealized)} />
                        </div>

                        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                            {editing ? 'Salvar' : 'Criar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
