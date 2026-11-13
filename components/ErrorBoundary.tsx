'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled workspace error:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="card"
          style={{
            maxWidth: 520,
            margin: '48px auto',
            padding: '28px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'rgba(255, 59, 48, 0.12)',
              color: 'var(--red)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 26,
            }}
          >
            ⚠️
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--txt)' }}>
            {this.props.fallbackTitle || 'หน้าจอนี้พบข้อผิดพลาดชั่วคราว'}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--mut)', lineHeight: 1.5 }}>
            ข้อมูลของคุณยังคงถูกบันทึกไว้อย่างปลอดภัย คุณสามารถลองโหลดส่วนนี้อีกครั้งหรือรีเฟรชหน้าจอได้
          </p>
          {this.state.errorMessage && (
            <div
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 10,
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                fontSize: 11.5,
                color: 'var(--mut)',
                wordBreak: 'break-word',
              }}
            >
              {this.state.errorMessage}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn" onClick={this.handleRetry}>
              ลองโหลดใหม่อีกครั้ง
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => typeof window !== 'undefined' && window.location.reload()}
            >
              รีเฟรชหน้าเว็บ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
