import { useState, useEffect, useMemo, useCallback } from 'react'
import { hashPassword } from '../../Backend/Application/Utils/crypto'
import {
    apiGetMe, apiAdminGetUsers, apiAdminCreateUser,
    apiAdminUpdateUser, apiAdminDeleteUser,
    type ApiUser
} from '../../Services/api'
import {
    Users, Shield, Activity, Crown, HardDrive, Pencil, X,
    Save, Trash2, Search, Plus, Server, Globe, Cpu, Zap, ShieldOff,
} from 'lucide-react'

const SYSTEM_METRICS = {
    uptime: '99.98%',
    requests: '45/min',
    errors: '0',
    responseTime: '12ms',
}

interface AdminUser {
    id?: number;
    name: string;
    email: string;
    photo?: string | null;
    isPremium: boolean;
    isAdmin: boolean;
    createdAt?: string;
}

export function AdminPage() {
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const [editingUser, setEditingUser] = useState<Partial<AdminUser> | null>(null)
    const [editForm, setEditForm] = useState({
        name: '', email: '', password: '',
        isPremium: false, isAdmin: false,
    })

    const loadData = useCallback(async () => {
        try {
            const { user } = await apiGetMe()
            setCurrentUser(user)

            if (user.isAdmin) {
                try {
                    const allUsers = await apiAdminGetUsers()
                    setUsers(allUsers)
                } catch (e) {
                    console.error('Erro ao buscar usuários:', e)
                }
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const handleCreateClick = () => {
        setEditingUser({})
        setEditForm({ name: '', email: '', password: '', isPremium: false, isAdmin: false })
    }

    const handleEditClick = (user: AdminUser) => {
        setEditingUser(user)
        setEditForm({
            name: user.name, email: user.email, password: '',
            isPremium: user.isPremium, isAdmin: user.isAdmin || false,
        })
    }

    const handleDeleteClick = async (userId?: number) => {
        if (!userId) return
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            await apiAdminDeleteUser(userId)
            loadData()
        }
    }

    const handleSaveUser = async () => {
        if (!editingUser) return

        if (editingUser.id) {
            const updates: Record<string, unknown> = {
                name: editForm.name, email: editForm.email,
                isPremium: editForm.isPremium, isAdmin: editForm.isAdmin,
            }
            if (editForm.password.trim()) {
                updates.password = await hashPassword(editForm.password)
            }
            await apiAdminUpdateUser(editingUser.id, updates as Parameters<typeof apiAdminUpdateUser>[1])
        } else {
            if (!editForm.password.trim()) return
            await apiAdminCreateUser({
                name: editForm.name, email: editForm.email,
                password: await hashPassword(editForm.password),
                isPremium: editForm.isPremium, isAdmin: editForm.isAdmin,
            })
        }
        setEditingUser(null)
        loadData()
    }

    const processedUsers = useMemo(() =>
        users.filter(u =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        , [users, searchQuery])

    const stats = useMemo(() => {
        const premiumUsers = users.filter(u => u.isPremium).length
        const adminUsers = users.filter(u => u.isAdmin).length
        const estimatedStorageKB = Math.round(JSON.stringify({ users }).length / 1024)
        return { totalUsers: users.length, premiumUsers, adminUsers, estimatedStorageKB }
    }, [users])

    if (!loading && currentUser && !currentUser.isAdmin) {
        return (
            <div className="page">
                <div className="page-header"><h1 className="page-title">⚙ Admin</h1></div>
                <div className="container">
                    <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                        <ShieldOff size={64} color="#ff4757" />
                        <h2 style={{ marginTop: 'var(--space-md)', color: '#ff4757' }}>Acesso Negado</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Você não tem permissão de administrador.</p>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="page">
                <div className="page-header"><h1 className="page-title">⚙ Admin</h1></div>
                <div className="container"><div className="empty-state"><Activity size={48} /><p>Carregando indicadores...</p></div></div>
            </div>
        )
    }

    const webAppKPIs = [
        { label: 'Uptime', value: SYSTEM_METRICS.uptime, icon: Server, color: '#2ed573', sub: 'Servidor Online' },
        { label: 'Response', value: SYSTEM_METRICS.responseTime, icon: Zap, color: '#ffa502', sub: 'Latência média' },
        { label: 'Requests', value: SYSTEM_METRICS.requests, icon: Globe, color: '#00f3ff', sub: 'Tráfego atual' },
        { label: 'Errors', value: SYSTEM_METRICS.errors, icon: Activity, color: '#ff4757', sub: 'Taxa de erro' },
        { label: 'Storage', value: `${stats.estimatedStorageKB} KB`, icon: HardDrive, color: '#64748b', sub: 'Estimado' },
        { label: 'CPU Load', value: '12%', icon: Cpu, color: '#7c3aed', sub: 'Client usage' },
    ]

    const userKPIs = [
        { label: 'Total Usuários', value: stats.totalUsers, icon: Users, color: '#ffffff', sub: 'Cadastrados' },
        { label: 'Premium', value: stats.premiumUsers, icon: Crown, color: '#ffa502', sub: 'Assinantes' },
        { label: 'Admins', value: stats.adminUsers, icon: Shield, color: '#00f3ff', sub: 'Acesso total' },
    ]

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={24} color="#00f3ff" /> Backoffice
                </h1>
                <span style={{
                    padding: '4px 12px', background: 'linear-gradient(135deg, #ff6b6b, #ffa502)',
                    borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700,
                    color: '#000', textTransform: 'uppercase', letterSpacing: '0.5px',
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                    <Crown size={10} /> Admin
                </span>
            </div>

            <div className="container">
                {/* System Health KPIs */}
                <div className="section-header"><h2>Web App Health</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    {webAppKPIs.map(kpi => {
                        const Icon = kpi.icon
                        return (
                            <div key={kpi.label} style={{
                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)',
                                display: 'flex', flexDirection: 'column', gap: 6,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Icon size={14} color={kpi.color} />
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{kpi.label}</span>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{kpi.sub}</div>
                            </div>
                        )
                    })}
                </div>

                {/* User Stats */}
                <div className="section-header"><h2>Indicadores de Usuários</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-2xl)' }}>
                    {userKPIs.map(kpi => {
                        const Icon = kpi.icon
                        return (
                            <div key={kpi.label} style={{
                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)',
                                display: 'flex', flexDirection: 'column', gap: 6,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Icon size={14} color={kpi.color} />
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{kpi.label}</span>
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{kpi.sub}</div>
                            </div>
                        )
                    })}
                </div>

                {/* Users CRUD */}
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Gestão de Usuários</h2>
                    <button className="btn btn-primary" onClick={handleCreateClick} style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={14} /> Novo Usuário
                    </button>
                </div>

                <div style={{ marginBottom: 'var(--space-md)', position: 'relative' }}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder="Buscar por nome ou e-mail..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '12px 12px 12px 40px', background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)',
                            color: 'var(--text-primary)', fontSize: '0.9rem',
                        }}
                    />
                </div>

                {processedUsers.length > 0 ? processedUsers.map(u => (
                    <div key={u.id} className="list-item" onClick={() => handleEditClick(u)}>
                        <div className="list-item-icon" style={{
                            background: u.isAdmin ? 'rgba(0, 243, 255, 0.12)' : 'rgba(124, 58, 237, 0.12)',
                            borderRadius: '50%', overflow: 'hidden',
                        }}>
                            {u.photo ? (
                                <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Users size={20} color={u.isAdmin ? '#00f3ff' : '#7c3aed'} />
                            )}
                        </div>
                        <div className="list-item-content">
                            <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {u.name}
                                {u.isAdmin && (
                                    <span style={{ padding: '1px 6px', background: 'rgba(0, 243, 255, 0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.55rem', color: '#00f3ff', fontWeight: 700, textTransform: 'uppercase' }}>Admin</span>
                                )}
                                {u.isPremium && (
                                    <span style={{ padding: '1px 6px', background: 'linear-gradient(135deg, #ffa502, #ff6b6b)', borderRadius: 'var(--radius-full)', fontSize: '0.55rem', color: '#000', fontWeight: 700, textTransform: 'uppercase' }}>Premium</span>
                                )}
                            </div>
                            <div className="list-item-subtitle">{u.email}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                <div>ID: {u.id}</div>
                                <div>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditClick(u); }}>
                                    <Pencil size={16} color="var(--text-muted)" />
                                </button>
                                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteClick(u.id); }}>
                                    <Trash2 size={16} color="#ff4757" />
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="empty-state"><Users size={32} /><p>Nenhum usuário encontrado</p></div>
                )}

                {/* Server Info */}
                <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}><h2>Informações do Sistema</h2></div>
                <div style={{
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)',
                    marginBottom: 'var(--space-2xl)', fontSize: '0.8rem',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Plataforma</span>
                        <span style={{ fontWeight: 600 }}>{navigator.platform}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>User Agent</span>
                        <span style={{ fontWeight: 600, fontSize: '0.6rem', maxWidth: 200, textAlign: 'right', wordBreak: 'break-all' }}>
                            {navigator.userAgent.substring(0, 80)}...
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Idioma</span>
                        <span style={{ fontWeight: 600 }}>{navigator.language}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Online</span>
                        <span style={{ fontWeight: 600, color: navigator.onLine ? '#2ed573' : '#ff4757' }}>
                            {navigator.onLine ? '● Sim' : '● Não'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Arquitetura</span>
                        <span style={{ fontWeight: 600 }}>LAMP + React</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>API Version</span>
                        <span style={{ fontWeight: 600 }}>FinFlow API v1</span>
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingUser.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button className="btn-icon" onClick={() => setEditingUser(null)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label>Nome</label>
                            <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label>E-mail</label>
                            <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label>Senha</label>
                            <input value={editForm.password} type="password"
                                onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Crown size={18} color="#ffa502" />
                                    <span>Conta Premium</span>
                                </div>
                                <div style={{
                                    width: 40, height: 20, background: editForm.isPremium ? 'var(--color-success)' : 'var(--border-default)',
                                    borderRadius: 10, position: 'relative', transition: '0.3s'
                                }} onClick={() => setEditForm({ ...editForm, isPremium: !editForm.isPremium })}>
                                    <div style={{
                                        width: 16, height: 16, background: '#fff', borderRadius: '50%',
                                        position: 'absolute', top: 2, left: editForm.isPremium ? 22 : 2, transition: '0.3s'
                                    }} />
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Shield size={18} color="#00f3ff" />
                                    <span>Acesso Admin</span>
                                </div>
                                <div style={{
                                    width: 40, height: 20, background: editForm.isAdmin ? 'var(--color-success)' : 'var(--border-default)',
                                    borderRadius: 10, position: 'relative', transition: '0.3s'
                                }} onClick={() => setEditForm({ ...editForm, isAdmin: !editForm.isAdmin })}>
                                    <div style={{
                                        width: 16, height: 16, background: '#fff', borderRadius: '50%',
                                        position: 'absolute', top: 2, left: editForm.isAdmin ? 22 : 2, transition: '0.3s'
                                    }} />
                                </div>
                            </label>
                        </div>

                        <button className="btn btn-primary" onClick={handleSaveUser} style={{ width: '100%', marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'center', gap: 8 }}>
                            <Save size={18} /> Salvar Alterações
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
