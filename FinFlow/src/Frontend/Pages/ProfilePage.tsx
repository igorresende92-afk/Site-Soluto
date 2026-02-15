import { useState, useEffect, useRef, useCallback } from 'react'
import { hashPassword, validatePasswordStrength } from '../../Backend/Application/Utils/crypto'
import {
    apiGetMe, apiUpdateName, apiUpdatePhoto, apiChangePassword, apiExportData,
    apiGetAccounts, apiGetTransactions, apiGetCategories,
    type ApiUser
} from '../../Services/api'
import {
    Download, Lock, Shield, Info, ChevronRight, Crown, X,
    User, Pencil, Check, Camera, LogOut, Mail, KeyRound,
    Eye, EyeOff,
} from 'lucide-react'

interface ProfilePageProps {
    onLogout: () => void;
}

export function ProfilePage({ onLogout }: ProfilePageProps) {
    const [showPremiumModal, setShowPremiumModal] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
    const [accountsCount, setAccountsCount] = useState(0)
    const [transactionsCount, setTransactionsCount] = useState(0)
    const [categoriesCount, setCategoriesCount] = useState(0)

    const [isEditingName, setIsEditingName] = useState(false)
    const [editName, setEditName] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)

    const loadProfile = useCallback(async () => {
        try {
            const { user } = await apiGetMe()
            setCurrentUser(user)
            const [a, t, c] = await Promise.all([
                apiGetAccounts(), apiGetTransactions(), apiGetCategories()
            ])
            setAccountsCount(a.length)
            setTransactionsCount(t.length)
            setCategoriesCount(c.length)
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => { loadProfile() }, [loadProfile])

    const handleSaveName = async () => {
        const n = editName.trim()
        if (n) {
            await apiUpdateName(n)
            setCurrentUser(prev => prev ? { ...prev, name: n } : prev)
        }
        setIsEditingName(false)
    }

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (ev) => {
            const img = new Image()
            img.onload = async () => {
                const canvas = document.createElement('canvas')
                const size = 200
                canvas.width = size
                canvas.height = size
                const ctx = canvas.getContext('2d')!
                const min = Math.min(img.width, img.height)
                const sx = (img.width - min) / 2
                const sy = (img.height - min) / 2
                ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
                const dataUrl = canvas.toDataURL('image/webp', 0.8)
                await apiUpdatePhoto(dataUrl)
                setCurrentUser(prev => prev ? { ...prev, photo: dataUrl } : prev)
            }
            img.src = ev.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    const handleChangePassword = async () => {
        setPasswordError('')
        setPasswordSuccess('')

        if (!currentPassword) { setPasswordError('Informe a senha atual'); return }

        const strengthError = validatePasswordStrength(newPassword)
        if (strengthError) { setPasswordError(strengthError); return }
        if (newPassword !== confirmNewPassword) { setPasswordError('As senhas não coincidem'); return }

        try {
            const hashedCurrent = await hashPassword(currentPassword)
            const hashedNew = await hashPassword(newPassword)
            await apiChangePassword(hashedCurrent, hashedNew)
            setPasswordSuccess('Senha alterada com sucesso!')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmNewPassword('')
            setTimeout(() => {
                setShowPasswordModal(false)
                setPasswordSuccess('')
            }, 1500)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao alterar senha'
            setPasswordError(message)
        }
    }

    const handleExport = async () => {
        setShowPremiumModal(true)
    }

    const doExport = async () => {
        setIsExporting(true)
        try {
            const data = await apiExportData()
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `finflow-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setIsExporting(false)
            setShowPremiumModal(false)
        }
    }

    const memberSince = currentUser?.createdAt
        ? new Date(currentUser.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        : 'recentemente'

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Meu Perfil</h1>
            </div>

            <div className="container">
                {/* User Profile Card */}
                <div style={{
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)',
                    marginBottom: 'var(--space-xl)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 'var(--space-md)', position: 'relative',
                }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%',
                            background: currentUser?.photo ? 'none' : 'var(--accent-gradient)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', border: '3px solid rgba(0, 243, 255, 0.3)',
                        }}>
                            {currentUser?.photo ? (
                                <img src={currentUser.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User size={36} color="#000" />
                            )}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} style={{
                            position: 'absolute', bottom: -2, right: -2, width: 28, height: 28,
                            borderRadius: '50%', background: 'var(--accent-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--bg-surface)', cursor: 'pointer',
                        }}>
                            <Camera size={12} color="#000" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    </div>

                    {isEditingName ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 260 }}>
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                                autoFocus style={{ padding: '6px 12px', fontSize: '1rem', fontWeight: 700, textAlign: 'center', flex: 1 }}
                                placeholder="Seu nome" />
                            <button className="btn-icon" onClick={handleSaveName} style={{ width: 32, height: 32, color: 'var(--color-success)' }}>
                                <Check size={16} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{currentUser?.name || 'Usuário'}</span>
                            <button className="btn-icon"
                                onClick={() => { setEditName(currentUser?.name || ''); setIsEditingName(true) }}
                                style={{ width: 28, height: 28 }}>
                                <Pencil size={12} />
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <Mail size={14} />
                        <span>{currentUser?.email || '—'}</span>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Membro desde {memberSince}
                    </div>
                </div>

                {/* Account Actions */}
                <div className="section-header"><h2>Conta</h2></div>

                <button className="list-item"
                    onClick={() => { setPasswordError(''); setPasswordSuccess(''); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); setShowPasswordModal(true) }}
                    style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <div className="list-item-icon" style={{ background: 'rgba(124, 58, 237, 0.12)' }}>
                        <KeyRound size={20} color="#7c3aed" />
                    </div>
                    <div className="list-item-content">
                        <div className="list-item-title">Alterar Senha</div>
                        <div className="list-item-subtitle">Mude sua senha de acesso</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                </button>

                <div className="list-item" style={{ cursor: 'default' }}>
                    <div className="list-item-icon" style={{ background: 'rgba(124, 58, 237, 0.12)' }}>
                        <Shield size={20} color="#7c3aed" />
                    </div>
                    <div className="list-item-content">
                        <div className="list-item-title">Segurança</div>
                        <div className="list-item-subtitle">Autenticação por e-mail e senha</div>
                    </div>
                    <Lock size={16} color="var(--text-muted)" />
                </div>

                {/* Settings / Data */}
                <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}><h2>Configurações</h2></div>

                <button className="list-item" onClick={handleExport} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <div className="list-item-icon" style={{ background: 'rgba(0, 243, 255, 0.12)' }}>
                        <Download size={20} color="#00f3ff" />
                    </div>
                    <div className="list-item-content">
                        <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Exportar Dados
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px',
                                background: 'linear-gradient(135deg, #ffa502, #ff6b6b)', borderRadius: 'var(--radius-full)',
                                fontSize: '0.6rem', color: '#000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                                <Crown size={10} /> Premium
                            </span>
                        </div>
                        <div className="list-item-subtitle">Backup completo dos seus dados</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                </button>

                {/* About */}
                <div className="section-header" style={{ marginTop: 'var(--space-xl)' }}><h2>Sobre</h2></div>
                <div className="list-item" style={{ cursor: 'default' }}>
                    <div className="list-item-icon" style={{ background: 'rgba(100, 116, 139, 0.12)' }}>
                        <Info size={20} color="#64748b" />
                    </div>
                    <div className="list-item-content">
                        <div className="list-item-title">FinFlow</div>
                        <div className="list-item-subtitle">Versão 1.0.0 · Gestão Financeira Pessoal</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)', padding: 'var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    <p>Seus dados são armazenados com segurança no servidor.</p>
                    <p>Acesse de qualquer dispositivo com sua conta.</p>
                </div>

                {/* Logout */}
                <button onClick={onLogout} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'rgba(255, 71, 87, 0.1)',
                    border: '1px solid rgba(255, 71, 87, 0.2)', color: 'var(--color-expense)', fontWeight: 700,
                    fontSize: '0.95rem', cursor: 'pointer', marginBottom: 'var(--space-xl)',
                }}>
                    <LogOut size={18} /> Sair da Conta
                </button>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Alterar Senha</h2>
                            <button className="btn-icon" onClick={() => setShowPasswordModal(false)}><X size={18} /></button>
                        </div>

                        <div className="form-group">
                            <label>Senha Atual</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                                <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                }}>
                                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Nova Senha</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showNew ? 'text' : 'password'} value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)} placeholder="Mín. 8 chars (A-z, 0-9, !@#)" />
                                <button type="button" onClick={() => setShowNew(!showNew)} style={{
                                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                                }}>
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Confirmar Nova Senha</label>
                            <input type="password" value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Repita a nova senha" />
                        </div>

                        {passwordError && <div className="login-error" style={{ marginBottom: 'var(--space-md)' }}>{passwordError}</div>}
                        {passwordSuccess && (
                            <div style={{
                                color: 'var(--color-success)', fontSize: '0.85rem', textAlign: 'center',
                                padding: 'var(--space-sm)', background: 'rgba(46, 213, 115, 0.1)',
                                borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)',
                            }}>{passwordSuccess}</div>
                        )}

                        <button className="btn btn-primary" onClick={handleChangePassword} style={{ width: '100%', padding: 'var(--space-md)', fontWeight: 700 }}>
                            Salvar Nova Senha
                        </button>
                    </div>
                </div>
            )}

            {/* Export/Premium Modal */}
            {showPremiumModal && (
                <div className="modal-overlay" onClick={() => setShowPremiumModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Crown size={20} color="#ffa502" /> Premium
                            </h2>
                            <button className="btn-icon" onClick={() => setShowPremiumModal(false)}><X size={18} /></button>
                        </div>

                        <div style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 'var(--radius-lg)',
                                background: 'linear-gradient(135deg, #ffa502, #ff6b6b)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-lg)',
                            }}>
                                <Download size={28} color="#000" />
                            </div>
                            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Exportar seus dados</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                                Faça backup completo das suas contas, transações e categorias em formato JSON.
                            </p>

                            <div style={{
                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-md)', padding: 'var(--space-md)',
                                marginBottom: 'var(--space-lg)', textAlign: 'left',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Contas</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{accountsCount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Transações</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{transactionsCount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Categorias</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{categoriesCount}</span>
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={doExport} disabled={isExporting}
                                style={{ width: '100%', padding: 'var(--space-md)', fontWeight: 700 }}>
                                {isExporting ? 'Exportando...' : '⬇ Baixar Backup (Grátis - Beta)'}
                            </button>
                            <p style={{ marginTop: 'var(--space-md)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                🎁 Grátis durante o período Beta
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
