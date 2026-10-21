'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DialogOptions {
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isConfirm?: boolean;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (title: string, message: string, options?: DialogOptions) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: DialogOptions
  ) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string, options?: DialogOptions) => {
    setState({
      isOpen: true,
      title,
      message,
      isConfirm: false,
      confirmText: options?.confirmText || 'ตกลง',
      danger: options?.danger || false,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: DialogOptions
  ) => {
    setState({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      confirmText: options?.confirmText || 'ยืนยัน',
      cancelText: options?.cancelText || 'ยกเลิก',
      danger: options?.danger !== undefined ? options.danger : true,
      onConfirm,
    });
  };

  const handleClose = () => {
    setState(s => ({ ...s, isOpen: false }));
  };

  const handleOk = () => {
    if (state.onConfirm) state.onConfirm();
    handleClose();
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {state.isOpen && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'rgba(0, 0, 0, 0.45)',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={handleClose}
        >
          <div
            className="modal-box macos-alert-sheet"
            style={{
              maxWidth: 420,
              width: '92%',
              borderRadius: 20,
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--line)',
              background: 'var(--card)',
              animation: 'quickMenuPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* macOS Alert Content */}
            <div
              style={{
                padding: '24px 24px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: state.danger
                    ? 'rgba(255, 59, 48, 0.12)'
                    : 'rgba(0, 113, 227, 0.12)',
                  color: state.danger ? '#ff3b30' : 'var(--pri)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {state.danger ? '⚠️' : state.isConfirm ? '❓' : 'ℹ️'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--txt)',
                  }}
                >
                  {state.title}
                </h3>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 13,
                    color: 'var(--mut)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {state.message}
                </p>
              </div>
            </div>

            {/* macOS Alert Actions Footer */}
            <div
              style={{
                padding: '12px 20px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                background: 'rgba(120, 120, 128, 0.04)',
                borderTop: '1px solid var(--line)',
              }}
            >
              {state.isConfirm ? (
                <>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={handleClose}
                    style={{
                      borderRadius: 999,
                      padding: '6px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {state.cancelText || 'ยกเลิก'}
                  </button>
                  <button
                    type="button"
                    onClick={handleOk}
                    style={{
                      borderRadius: 999,
                      padding: '6px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: state.danger ? '#dc2626' : 'var(--pri)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: state.danger
                        ? '0 2px 8px rgba(220, 38, 38, 0.35)'
                        : '0 2px 8px rgba(0, 113, 227, 0.35)',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {state.confirmText || 'ยืนยัน'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleClose}
                  style={{
                    borderRadius: 999,
                    padding: '6px 20px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {state.confirmText || 'ตกลง'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
}
