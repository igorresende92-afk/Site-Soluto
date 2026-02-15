import { useState, useEffect, useCallback } from 'react'
import { apiGetMe, type ApiUser } from '../../../Services/api'

/**
 * Returns the currently logged-in user via API token.
 * Returns `undefined` while loading or if not authenticated.
 */
export function useCurrentUser(): ApiUser | undefined {
    const [user, setUser] = useState<ApiUser | undefined>(undefined)

    const load = useCallback(async () => {
        try {
            const { user } = await apiGetMe()
            setUser(user)
        } catch {
            setUser(undefined)
        }
    }, [])

    useEffect(() => { load() }, [load])

    return user
}
