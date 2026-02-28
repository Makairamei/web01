import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Premium confirmation modal — gradient accent bar, spring animation, lazy mount
 * Props: open, title, message, confirmLabel, danger, onConfirm, onClose
 */
export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { if (open) setMounted(true); }, [open]);
    if (!mounted || !open) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box max-w-[420px]" onClick={e => e.stopPropagation()}>
                <div className="modal-content">
                    {/* Icon + Content */}
                    <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${danger
                                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20'
                                : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/20'
                            }`}>
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-[-0.01em] mb-1.5">{title}</h2>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-150 mt-0.5"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Divider + Actions */}
                    <div className="form-divider" />
                    <div className="flex items-center justify-end gap-3">
                        <button onClick={onClose} className="btn-ghost">Cancel</button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all duration-150 ${danger
                                    ? 'bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 hover:shadow-red-500/35 hover:-translate-y-px active:translate-y-0 active:scale-[0.985]'
                                    : 'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-px active:translate-y-0 active:scale-[0.985]'
                                }`}
                        >
                            {danger && <Trash2 className="w-3.5 h-3.5" />}
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
