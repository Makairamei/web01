import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ children, content, side = 'right', offset = 8, delay = 150 }) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const timeoutRef = useRef(null);

    const show = () => {
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                let top = 0;
                let left = 0;

                // Simple auto-flip logic (default right, flip to left if too close to edge)
                // For a sidebar tooltip (side='right'), we want it to the right of the trigger.
                if (side === 'right') {
                    left = rect.right + offset;
                    top = rect.top + (rect.height / 2);
                    // If overflows right, flip? (Sidebar is left, so unlikely, but good practice)
                    if (left + 100 > window.innerWidth) { // Assume tooltip width ~100px
                        left = rect.left - offset - 100; // Flip to left
                    }
                }

                setCoords({ top, left });
                setIsVisible(true);
            }
        }, delay);
    };

    const hide = () => {
        clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                className="w-full" // Ensure it takes full width of parent (e.g. sidebar link)
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    style={{
                        top: coords.top,
                        left: coords.left,
                        transform: 'translateY(-50%)',
                    }}
                    className="fixed z-50 px-3 py-1.5 text-[11px] font-medium text-white bg-slate-900/90 dark:bg-white/90 dark:text-slate-900 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 pointer-events-none whitespace-nowrap"
                >
                    {content}
                    {/* Arrow (optional, skipped for minimalism) */}
                </div>,
                document.body
            )}
        </>
    );
}
