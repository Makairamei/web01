import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationProgress() {
    const location = useLocation();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Start progress on route change
        setVisible(true);
        setProgress(30);

        const timer1 = setTimeout(() => setProgress(70), 100);
        const timer2 = setTimeout(() => {
            setProgress(100);
            setTimeout(() => setVisible(false), 200);
        }, 300);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [location.pathname, location.search]);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 w-full h-1 z-[60] pointer-events-none">
            <div
                className="h-full bg-indigo-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
