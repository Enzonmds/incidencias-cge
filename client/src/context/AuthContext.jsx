import React, { createContext, useState, useContext, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

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
    }, [user]); // Re-run if user logs in/out

    const login = async (email, password) => {
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
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
