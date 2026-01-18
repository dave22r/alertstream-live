import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (email: string, password: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials for MVP
const POLICE_CREDENTIALS = {
    email: 'officer@police.gov',
    password: 'SafeStream2024!'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Check localStorage on mount
    useEffect(() => {
        const authStatus = localStorage.getItem('policeAuth');
        if (authStatus === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const login = (email: string, password: string): boolean => {
        if (email === POLICE_CREDENTIALS.email && password === POLICE_CREDENTIALS.password) {
            setIsAuthenticated(true);
            localStorage.setItem('policeAuth', 'true');
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('policeAuth');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
