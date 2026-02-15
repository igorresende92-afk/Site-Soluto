import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault()
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e)
            // Update UI notify the user they can install the PWA
            setIsVisible(true)
        }

        window.addEventListener('beforeinstallprompt', handler)

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        // Show the install prompt
        deferredPrompt.prompt()

        // Wait for the user to respond to the prompt
        await deferredPrompt.userChoice

        // We've used the prompt, and can't use it again, discard it
        setDeferredPrompt(null)
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            maxWidth: '90vw',
            width: 'max-content'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--accent-primary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                }}>
                    <Download size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Instalar FinFlow</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Acesse offline e mais rápido</span>
                </div>
            </div>

            <button
                onClick={handleInstallClick}
                style={{
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginLeft: '8px'
                }}
            >
                Baixar
            </button>

            <button
                onClick={() => setIsVisible(false)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    marginLeft: '4px'
                }}
            >
                <X size={18} />
            </button>
        </div>
    )
}
