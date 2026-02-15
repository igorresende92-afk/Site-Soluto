import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    apiGetAccounts, apiGetTransactions, apiGetCategories,
    type ApiAccount, type ApiTransaction, type ApiCategory
} from '../../Services/api'
import {
    TrendingUp, TrendingDown, Wallet, PiggyBank,
    ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
    Calendar, Plus,
} from 'lucide-react'
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts'
import './DashboardPage.css'

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function DashboardPage() {
    const now = new Date()
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
    const navigate = useNavigate()

    const [accounts, setAccounts] = useState<ApiAccount[]>([])
    const [transactions, setTransactions] = useState<ApiTransaction[]>([])
    const [categories, setCategories] = useState<ApiCategory[]>([])

    const loadData = useCallback(async () => {
        try {
            const [a, t, c] = await Promise.all([
                apiGetAccounts(),
                apiGetTransactions(),
                apiGetCategories(),
            ])
            setAccounts(a)
            setTransactions(t)
            setCategories(c)
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const selectedKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`

    const goMonth = (dir: number) => {
        let m = selectedMonth + dir
        let y = selectedYear
        if (m < 0) { m = 11; y-- }
        if (m > 11) { m = 0; y++ }
        setSelectedMonth(m)
        setSelectedYear(y)
    }

    const goToday = () => {
        setSelectedMonth(now.getMonth())
        setSelectedYear(now.getFullYear())
    }

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

    const monthTransactions = useMemo(() =>
        transactions.filter(t => {
            const d = new Date(t.date)
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            return m === selectedKey
        })
        , [transactions, selectedKey])

    const realizedTransactions = monthTransactions.filter(t => t.isRealized)

    const totalIncome = realizedTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = realizedTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

    const savedPercent = totalIncome > 0
        ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
        : 0

    const formatCurrency = (val: number) =>
        val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const expensesByCategory = useMemo(() => {
        const map = new Map<number, number>()
        realizedTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount))

        return Array.from(map.entries())
            .map(([catId, amount]) => {
                const cat = categories.find(c => c.id === catId)
                return { name: cat?.name || 'Outros', value: amount, color: cat?.color || '#64748b' }
            })
            .sort((a, b) => b.value - a.value)
    }, [realizedTransactions, categories])

    const monthlyComparison = useMemo(() => {
        const data = []
        for (let i = 5; i >= 0; i--) {
            let m = selectedMonth - i
            let y = selectedYear
            while (m < 0) { m += 12; y-- }
            const key = `${y}-${String(m + 1).padStart(2, '0')}`
            const label = `${MONTH_NAMES[m].slice(0, 3)}`

            const mTx = transactions.filter(t => {
                const d = new Date(t.date)
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key && t.isRealized
            })

            data.push({
                name: label,
                Receitas: mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                Despesas: mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            })
        }
        return data
    }, [transactions, selectedMonth, selectedYear])

    const pendingIncome = monthTransactions
        .filter(t => t.type === 'income' && !t.isRealized)
        .reduce((sum, t) => sum + t.amount, 0)

    const pendingExpense = monthTransactions
        .filter(t => t.type === 'expense' && !t.isRealized)
        .reduce((sum, t) => sum + t.amount, 0)

    const projectedBalance = totalBalance + pendingIncome - pendingExpense

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <p className="dash-greeting">Bom dia 👋</p>
                    <h1 className="page-title">Dashboard</h1>
                </div>
            </div>

            <div className="container">
                <div className="month-selector">
                    <button className="btn-icon" onClick={() => goMonth(-1)} style={{ width: 36, height: 36 }}>
                        <ChevronLeft size={20} />
                    </button>
                    <button className="month-selector-label" onClick={goToday}>
                        <Calendar size={14} />
                        <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                    </button>
                    <button className="btn-icon" onClick={() => goMonth(1)} style={{ width: 36, height: 36 }}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="balance-hero card-neon">
                    <div className="balance-hero-label">
                        <Wallet size={16} /> Saldo Disponível
                    </div>
                    <div className="balance-hero-value">{formatCurrency(totalBalance)}</div>
                    <div className="balance-hero-sub">
                        {savedPercent >= 0 ? (
                            <span className="amount-positive">
                                <PiggyBank size={14} /> {savedPercent}% poupado
                            </span>
                        ) : (
                            <span className="amount-negative">
                                Gastos excedendo a receita
                            </span>
                        )}
                    </div>
                    {(pendingIncome > 0 || pendingExpense > 0) && (
                        <div className="projected-balance">
                            Projetado: <strong>{formatCurrency(projectedBalance)}</strong>
                        </div>
                    )}
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ background: 'rgba(46, 213, 115, 0.12)' }}>
                            <ArrowUpRight size={20} color="#2ed573" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">Receitas</span>
                            <span className="kpi-value amount-positive">{formatCurrency(totalIncome)}</span>
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon" style={{ background: 'rgba(255, 71, 87, 0.12)' }}>
                            <ArrowDownRight size={20} color="#ff4757" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">Despesas</span>
                            <span className="kpi-value amount-negative">{formatCurrency(totalExpense)}</span>
                        </div>
                    </div>
                </div>

                <div className="section-header">
                    <h2>Consumo do Mês</h2>
                </div>
                <div className="stats-bar">
                    <div className="stats-bar-fill" style={{
                        width: totalIncome > 0 ? `${Math.min((totalExpense / totalIncome) * 100, 100)}%` : '0%',
                        background: totalExpense / totalIncome > 0.8 ? 'var(--color-danger)' : 'var(--accent-gradient)',
                    }} />
                </div>
                <div className="stats-bar-labels">
                    <span>Gasto: {totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}%</span>
                    <span>Disponível: {formatCurrency(totalIncome - totalExpense)}</span>
                </div>

                {monthlyComparison.length > 0 && (
                    <>
                        <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
                            <h2>Receita x Despesa (6 meses)</h2>
                        </div>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={monthlyComparison} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" tick={{ fill: '#8899ac', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#8899ac', fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        labelStyle={{ color: '#fff' }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, color: '#8899ac' }} />
                                    <Bar dataKey="Receitas" fill="#2ed573" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Despesas" fill="#ff4757" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}

                {expensesByCategory.length > 0 && (
                    <>
                        <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
                            <h2>Gastos por Categoria</h2>
                        </div>
                        <div className="chart-container" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <ResponsiveContainer width="50%" height={180}>
                                <PieChart>
                                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                                        {expensesByCategory.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="category-legend">
                                {expensesByCategory.slice(0, 5).map((item, i) => (
                                    <div key={i} className="category-legend-item">
                                        <div className="category-legend-dot" style={{ background: item.color }} />
                                        <span className="category-legend-name">{item.name}</span>
                                        <span className="category-legend-value">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}>
                    <h2>Transações do Mês</h2>
                </div>

                {monthTransactions.length === 0 ? (
                    <div className="empty-state">
                        <TrendingUp size={48} />
                        <p>Nenhuma transação neste mês</p>
                        <p style={{ fontSize: '0.8rem' }}>Comece adicionando suas contas e transações</p>
                    </div>
                ) : (
                    <div className="recent-list">
                        {monthTransactions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 8)
                            .map(t => (
                                <div key={t.id} className="list-item animate-in">
                                    <div className="list-item-icon" style={{
                                        background: t.type === 'income'
                                            ? 'rgba(46, 213, 115, 0.12)'
                                            : t.type === 'expense'
                                                ? 'rgba(255, 71, 87, 0.12)'
                                                : 'rgba(255, 165, 2, 0.12)'
                                    }}>
                                        {t.type === 'income' ? <TrendingUp size={20} color="#2ed573" /> : <TrendingDown size={20} color="#ff4757" />}
                                    </div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{t.description}</div>
                                        <div className="list-item-subtitle">
                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                            {!t.isRealized && ' · Pendente'}
                                        </div>
                                    </div>
                                    <div className={`list-item-value ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`}
                                        style={{ opacity: t.isRealized ? 1 : 0.5 }}>
                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            <button className="fab" onClick={() => navigate('/transactions?new=1')} title="Nova Transação">
                <Plus size={24} />
            </button>
        </div>
    )
}
