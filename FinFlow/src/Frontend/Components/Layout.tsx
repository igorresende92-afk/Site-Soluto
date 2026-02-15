import { ReactNode, useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiGetMe, type ApiUser } from '../../Services/api'
import {
    LayoutDashboard, Wallet, CreditCard, ArrowLeftRight,
    Tags, Target, User, Shield,
} from 'lucide-react'
import './Layout.css'

interface LayoutProps {
    children: ReactNode;
    onLogout: () => void;
}

const navItems = [
    { path: '/', label: 'Início', icon: LayoutDashboard },
    { path: '/accounts', label: 'Contas', icon: Wallet },
    { path: '/cards', label: 'Cartões', icon: CreditCard },
    { path: '/transactions', label: 'Transações', icon: ArrowLeftRight },
    { path: '/categories', label: 'Categorias', icon: Tags },
    { path: '/budget', label: 'Metas', icon: Target },
]

export function Layout({ children }: LayoutProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)

    const loadUser = useCallback(async () => {
        try {
            const { user } = await apiGetMe()
            setCurrentUser(user)
        } catch { /* not logged in */ }
    }, [])

    useEffect(() => { loadUser() }, [loadUser])

    const isAdmin = currentUser?.isAdmin === true

    const allNavItems = useMemo(() => {
        const items = [...navItems]
        if (isAdmin) {
            items.push({ path: '/admin', label: 'Admin', icon: Shield })
        }
        return items
    }, [isAdmin])

    return (
        <div className="layout">
            <header className="top-bar">
                <button
                    className={`top-bar-profile ${location.pathname === '/profile' ? 'active' : ''}`}
                    onClick={() => navigate('/profile')}
                    aria-label="Meu Perfil"
                >
                    {currentUser?.photo ? (
                        <img src={currentUser.photo} alt="" className="top-bar-avatar" />
                    ) : (
                        <div className="top-bar-avatar-placeholder">
                            <User size={20} />
                        </div>
                    )}
                </button>

                <div className="top-bar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <svg viewBox="0 0 100 100" width="24" height="24">
                        <defs>
                            <linearGradient id="tlg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#00f3ff' }} />
                                <stop offset="100%" style={{ stopColor: '#7c3aed' }} />
                            </linearGradient>
                        </defs>
                        <rect width="100" height="100" rx="20" fill="#0a0a1a" />
                        <text x="50" y="42" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="28" fill="url(#tlg)">FIN</text>
                        <text x="50" y="72" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="300" fontSize="24" fill="#ffffff">FLOW</text>
                    </svg>
                    <span className="top-bar-title">FinFlow</span>
                </div>

                <div style={{ width: 44 }} />
            </header>

            <main className="main-content">
                {children}
            </main>

            <nav className="bottom-nav">
                {allNavItems.map(item => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                        <button
                            key={item.path}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>
        </div>
    )
}
