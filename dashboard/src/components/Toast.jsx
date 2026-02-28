import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const push = useCallback((msg, type = 'success', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
    }, []);

    const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

    const ICONS = { success: CheckCircle, error: XCircle, info: Info };

    return (
        <ToastCtx.Provider value={push}>
            {children}
            <div className="toast-container">
                {toasts.map(t => {
                    const Icon = ICONS[t.type] || Info;
                    return (
                        <div key={t.id} className={`toast toast-${t.type}`}>
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1">{t.msg}</span>
                            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 ml-1">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastCtx.Provider>
    );
}

export function useToast() { return useContext(ToastCtx); }
