import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setToken, getToken } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const t = getToken();
        const u = localStorage.getItem('cs_user');
        return t && u ? JSON.parse(u) : null;
    });

    const login = useCallback(async (username, password) => {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        setToken(data.token);
        const u = { username: data.username };
        localStorage.setItem('cs_user', JSON.stringify(u));
        setUser(u);
        return u;
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        localStorage.removeItem('cs_user');
        setUser(null);
    }, []);

    return <AuthCtx.Provider value={{ user, login, logout, isAuth: !!user, isLoggedIn: !!user }}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx); }
