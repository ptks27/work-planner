'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string) => {
    setState({ isOpen: true, title, message, isConfirm: false });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setState({ isOpen: true, title, message, isConfirm: true, onConfirm });
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
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{state.title}</h3>
              <button className="icon-btn" onClick={handleClose}>✕</button>
            </div>
            <div className="modal-body">
              <p>{state.message}</p>
            </div>
            <div className="modal-footer">
              {state.isConfirm ? (
                <>
                  <button className="btn ghost" onClick={handleClose}>ยกเลิก</button>
                  <button className="btn red" onClick={handleOk}>ยืนยัน</button>
                </>
              ) : (
                <button className="btn" onClick={handleClose}>ตกลง</button>
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