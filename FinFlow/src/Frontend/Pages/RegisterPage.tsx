import { useState } from 'react'
import { apiRegister, setToken } from '../../Services/api'
import { hashPassword, validatePasswordStrength } from '../../Backend/Application/Utils/crypto'
import './LoginPage.css'

interface RegisterPageProps {
    onRegister: (userId: number) => void;
    onGoLogin: () => void;
}

export function RegisterPage({ onRegister, onGoLogin }: RegisterPageProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!name.trim()) { setError('Informe seu nome'); return }
        if (!email.trim()) { setError('Informe seu e-mail'); return }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) { setError('E-mail inválido'); return }

        if (password.length < 8) { setError('Senha deve ter ao menos 8 caracteres'); return }
        const strengthError = validatePasswordStrength(password)
        if (strengthError) { setError(strengthError); return }
        if (password !== confirmPassword) { setError('As senhas não coincidem'); return }

        setIsLoading(true)
        try {
            const hashedPwd = await hashPassword(password)
            const { token, user } = await apiRegister(name.trim(), email.trim().toLowerCase(), hashedPwd)

            setToken(token)

            const session = {
                userId: user.id,
                timestamp: Date.now(),
                stayConnected: false,
            }
            localStorage.setItem('finflow_session', JSON.stringify(session))
            localStorage.setItem('finflow_user_name', user.name)
            localStorage.setItem('finflow_member_since', new Date().toISOString().slice(0, 10))

            onRegister(user.id)
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta')
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
                                <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#00f3ff' }} />
                                    <stop offset="100%" style={{ stopColor: '#7c3aed' }} />
                                </linearGradient>
                            </defs>
                            <rect width="100" height="100" rx="20" fill="#0a0a1a" />
                            <text x="50" y="42" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="28" fill="url(#lg2)">FIN</text>
                            <text x="50" y="72" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="300" fontSize="24" fill="#ffffff">FLOW</text>
                            <rect x="10" y="82" width="80" height="2" rx="1" fill="url(#lg2)" opacity="0.5" />
                        </svg>
                    </div>
                    <h1 className="login-title">FinFlow</h1>
                    <p className="login-subtitle">Crie sua conta gratuita</p>
                </div>

                <form className="login-card" onSubmit={handleSubmit}>
                    <h2>Cadastre-se</h2>

                    <div className="form-group">
                        <label>Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Seu nome completo"
                            autoComplete="name"
                        />
                    </div>

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
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirmar Senha</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repita a senha"
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                        {isLoading ? 'Criando...' : 'Criar Conta'}
                    </button>

                    <button type="button" className="login-toggle" onClick={onGoLogin}>
                        Já tem conta? <strong>Entrar</strong>
                    </button>
                </form>
            </div>
        </div>
    )
}
