import { useState, useRef } from 'react'
import { apiLogin, setToken } from '../../Services/api'
import { hashPassword } from '../../Backend/Application/Utils/crypto'
import './LoginPage.css'

interface LoginPageProps {
    onLogin: (userId: number) => void;
    onGoRegister: () => void;
}

export function LoginPage({ onLogin, onGoRegister }: LoginPageProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [stayConnected, setStayConnected] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const attemptsRef = useRef<{ count: number; lockedUntil: number }>({ count: 0, lockedUntil: 0 })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!email.trim()) { setError('Informe seu e-mail'); return }
        if (!password) { setError('Informe sua senha'); return }

        const now = Date.now()
        if (attemptsRef.current.lockedUntil > now) {
            const remainSec = Math.ceil((attemptsRef.current.lockedUntil - now) / 1000)
            setError(`Muitas tentativas. Aguarde ${remainSec}s.`)
            return
        }

        setIsLoading(true)
        try {
            const hashedInput = await hashPassword(password)
            const { token, user } = await apiLogin(email.trim().toLowerCase(), hashedInput)

            setToken(token)

            const session = {
                userId: user.id,
                timestamp: Date.now(),
                stayConnected,
            }
            localStorage.setItem('finflow_session', JSON.stringify(session))
            localStorage.setItem('finflow_user_name', user.name)
            localStorage.setItem('finflow_member_since', user.createdAt?.slice(0, 10) || '')

            attemptsRef.current.count = 0
            onLogin(user.id)
        } catch (err: any) {
            attemptsRef.current.count++
            if (attemptsRef.current.count >= 5) {
                attemptsRef.current.lockedUntil = Date.now() + 5 * 60 * 1000
                attemptsRef.current.count = 0
            }
            setError(err.message || 'Erro ao fazer login')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="login-bg-orb orb-1" />
                <div className="login-bg-orb orb-2" />
                <div className="login-bg-grid" />
            </div>

            <div className="login-container">
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <svg viewBox="0 0 100 100" width="80" height="80">
                            <defs>
                                <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#00f3ff' }} />
                                    <stop offset="100%" style={{ stopColor: '#7c3aed' }} />
                                </linearGradient>
                            </defs>
                            <rect width="100" height="100" rx="20" fill="#0a0a1a" />
                            <text x="50" y="42" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="28" fill="url(#lg)">FIN</text>
                            <text x="50" y="72" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="300" fontSize="24" fill="#ffffff">FLOW</text>
                            <rect x="10" y="82" width="80" height="2" rx="1" fill="url(#lg)" opacity="0.5" />
                        </svg>
                    </div>
                    <h1 className="login-title">FinFlow</h1>
                    <p className="login-subtitle">Controle financeiro inteligente</p>
                </div>

                <form className="login-card" onSubmit={handleSubmit}>
                    <h2>Entrar</h2>

                    <div className="form-group">
                        <label>E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="toggle-wrapper" style={{ padding: '4px 0', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manter conectado</span>
                        <div className={`toggle ${stayConnected ? 'active' : ''} `} onClick={() => setStayConnected(!stayConnected)} />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>

                    <button type="button" className="login-toggle" onClick={onGoRegister}>
                        Não tem conta? <strong>Cadastre-se</strong>
                    </button>
                </form>
            </div>
        </div>
    )
}
