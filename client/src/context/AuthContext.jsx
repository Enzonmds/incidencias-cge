import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem('token');
        } catch (e) {
            console.warn('LocalStorage Access Denied');
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        try {
            const storedUser = localStorage.getItem('user');
            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.warn('LocalStorage Read User Error', e);
        }
        setLoading(false);
    }, []);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (e) {
            console.warn('LocalStorage Logout Error', e);
        }
        setToken(null);
        setUser(null);
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }

            const data = await response.json();
            try {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            } catch (e) {
                console.error('LocalStorage Save Error', e);
            }
            setToken(data.token);
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, []);

    const impersonateRole = useCallback((newRole) => {
        if (!user) return;

        // Store original role if starting impersonation
        if (!user.originalRole) {
            const updatedUser = { ...user, originalRole: user.role, role: newRole };
            setUser(updatedUser);
            // Don't save to localStorage to avoid permanent persistence on refresh
        } else {
            // Updating existing impersonation
            setUser({ ...user, role: newRole });
        }
        console.log(`🎭 Impersonating Role: ${newRole}`);
    }, [user]);

    const stopImpersonation = useCallback(() => {
        if (!user || !user.originalRole) return;

        setUser({ ...user, role: user.originalRole, originalRole: undefined });
        console.log('🎭 Stopped Impersonation');
    }, [user]);

    // Session Timeout Logic (10 mins)
    useEffect(() => {
        if (!user) return; // Only track if logged in

        const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes
        let timeoutId;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('⏳ Session expired due to inactivity');
                logout();
                alert('Su sesión ha expirado por inactividad (10 min).');
            }, INACTIVITY_LIMIT);
        };

        // Listeners for activity
        window.addEventListener('click', resetTimer);
        window.addEventListener('keypress', resetTimer);

        // Start timer initially
        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('keypress', resetTimer);
        };
    }, [user, logout]); // Re-run if user logs in/out

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading, impersonateRole, stopImpersonation }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
