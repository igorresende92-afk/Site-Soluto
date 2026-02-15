import { useState, useEffect, useCallback } from 'react'
import {
    apiGetCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory,
    type ApiCategory
} from '../../Services/api'
import { Plus, X, Pencil, Trash2, Tags } from 'lucide-react'

const defaultColors = ['#00f3ff', '#7c3aed', '#2ed573', '#ff4757', '#ffa502', '#ff6b6b', '#1e90ff', '#f472b6', '#64748b']
const iconOptions = [
    'Banknote', 'Laptop', 'TrendingUp', 'UtensilsCrossed', 'Car', 'Home',
    'Heart', 'GraduationCap', 'Gamepad2', 'CreditCard', 'ShoppingBag',
    'Plane', 'Gift', 'Coffee', 'Music', 'Wifi', 'Smartphone', 'MoreHorizontal'
]

export function CategoriesPage() {
    const [categories, setCategories] = useState<ApiCategory[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<ApiCategory | null>(null)
    const [name, setName] = useState('')
    const [type, setType] = useState<'income' | 'expense'>('expense')
    const [color, setColor] = useState(defaultColors[0])
    const [icon, setIcon] = useState(iconOptions[0])

    const loadCategories = useCallback(async () => {
        try { setCategories(await apiGetCategories()) } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadCategories() }, [loadCategories])

    const incomeCategories = categories.filter(c => c.type === 'income')
    const expenseCategories = categories.filter(c => c.type === 'expense')

    const openNew = () => {
        setEditing(null)
        setName('')
        setType('expense')
        setColor(defaultColors[Math.floor(Math.random() * defaultColors.length)])
        setIcon(iconOptions[0])
        setShowModal(true)
    }

    const openEdit = (cat: ApiCategory) => {
        setEditing(cat)
        setName(cat.name)
        setType(cat.type)
        setColor(cat.color)
        setIcon(cat.icon)
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!name.trim()) return
        const data = { name: name.trim(), type, color, icon }
        if (editing?.id) {
            await apiUpdateCategory(editing.id, data)
        } else {
            await apiCreateCategory(data)
        }
        setShowModal(false)
        loadCategories()
    }

    const handleDelete = async (id: number) => {
        if (confirm('Excluir esta categoria?')) {
            await apiDeleteCategory(id)
            loadCategories()
        }
    }

    const renderList = (list: ApiCategory[], label: string) => (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="section-header">
                <h2>{label}</h2>
            </div>
            {list.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: 'var(--space-md)' }}>Nenhuma categoria</p>
            ) : (
                list.map((cat, i) => (
                    <div key={cat.id} className="list-item animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="list-item-icon" style={{ background: `${cat.color}15` }}>
                            <span style={{ color: cat.color, fontSize: '0.75rem', fontWeight: 600 }}>{cat.icon.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="list-item-content">
                            <div className="list-item-title">{cat.name}</div>
                            <div className="list-item-subtitle">{cat.icon}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => openEdit(cat)} style={{ width: 32, height: 32 }}>
                                <Pencil size={14} />
                            </button>
                            <button className="btn-icon" onClick={() => handleDelete(cat.id)} style={{ width: 32, height: 32, color: 'var(--color-expense)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    )

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Categorias</h1>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> Nova
                </button>
            </div>

            <div className="container">
                {categories.length === 0 ? (
                    <div className="empty-state">
                        <Tags size={48} />
                        <p>Nenhuma categoria</p>
                    </div>
                ) : (
                    <>
                        {renderList(incomeCategories, '💰 Receitas')}
                        {renderList(expenseCategories, '💸 Despesas')}
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label>Nome</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Alimentação" />
                        </div>

                        <div className="form-group">
                            <label>Tipo</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setType('income')} style={{ flex: 1 }}>Receita</button>
                                <button className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setType('expense')} style={{ flex: 1 }}>Despesa</button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Ícone</label>
                            <select value={icon} onChange={e => setIcon(e.target.value)}>
                                {iconOptions.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Cor</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {defaultColors.map(c => (
                                    <button key={c} onClick={() => setColor(c)}
                                        style={{
                                            width: 32, height: 32, borderRadius: '50%', background: c,
                                            border: color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer'
                                        }} />
                                ))}
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%', padding: 'var(--space-md)' }}>
                            {editing ? 'Salvar' : 'Criar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
