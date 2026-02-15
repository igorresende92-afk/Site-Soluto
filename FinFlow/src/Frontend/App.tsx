import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './Pages/LoginPage'
import { RegisterPage } from './Pages/RegisterPage'
import { DashboardPage } from './Pages/DashboardPage'
import { AccountsPage } from './Pages/AccountsPage'
import { CardsPage } from './Pages/CardsPage'
import { TransactionsPage } from './Pages/TransactionsPage'
import { CategoriesPage } from './Pages/CategoriesPage'
import { BudgetGoalsPage } from './Pages/BudgetGoalsPage'
import { ProfilePage } from './Pages/ProfilePage'
import { AdminPage } from './Pages/AdminPage'
import { Layout } from './Components/Layout'
import { getToken, clearToken, apiGetMe } from '../Services/api'

type AuthView = 'login' | 'register'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [authView, setAuthView] = useState<AuthView>('login')

    useEffect(() => {
        const token = getToken()
        if (token) {
            apiGetMe()
                .then(({ user }) => {
                    localStorage.setItem('finflow_user_name', user.name)
                    localStorage.setItem('finflow_member_since', user.createdAt?.slice(0, 10) || '')
                    setIsAuthenticated(true)
                })
                .catch(() => {
                    clearToken()
                })
                .finally(() => setIsLoading(false))
        } else {
            setIsLoading(false)
        }
    }, [])

    const handleLogin = (_userId: number) => {
        setIsAuthenticated(true)
    }

    const handleLogout = () => {
        clearToken()
        localStorage.removeItem('finflow_session')
        localStorage.removeItem('finflow_user_name')
        setIsAuthenticated(false)
        setAuthView('login')
    }

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--bg-body)'
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid var(--border-default)',
                    borderTopColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
            </div>
        )
    }

    if (!isAuthenticated) {
        if (authView === 'register') {
            return (
                <RegisterPage
                    onRegister={handleLogin}
                    onGoLogin={() => setAuthView('login')}
                />
            )
        }
        return (
            <LoginPage
                onLogin={handleLogin}
                onGoRegister={() => setAuthView('register')}
            />
        )
    }

    return (
        <Layout onLogout={handleLogout}>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/cards" element={<CardsPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/budget" element={<BudgetGoalsPage />} />
                <Route path="/profile" element={<ProfilePage onLogout={handleLogout} />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    )
}

export default App
