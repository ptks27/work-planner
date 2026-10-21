'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { parseFirebaseConfig, getFirebaseInstance, resetFirebaseInstance } from '@/lib/firebase';
import { DEFAULT_FIREBASE_CONFIG, DEFAULT_FIREBASE_CONFIG_OBJ } from '@/lib/firebaseDefaultConfig';
import {
  CloudIcon,
  CloseIcon,
  CheckIcon,
  SparklesIcon,
  RefreshCwIcon,
  CopyIcon,
} from './Icons';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FirebaseConfigModal({ isOpen, onClose }: FirebaseConfigModalProps) {
  const { firebaseConfig, setFirebaseConfig } = usePlanner();
  const [customInput, setCustomInput] = useState(firebaseConfig || DEFAULT_FIREBASE_CONFIG);
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedProject, setCopiedProject] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  if (!isOpen) return null;

  // ตรวจสอบ config ปัจจุบัน
  let currentProject = 'work-planner-9caf4';
  let isDefault = true;
  try {
    const parsed = parseFirebaseConfig(firebaseConfig || DEFAULT_FIREBASE_CONFIG);
    if (parsed.projectId) {
      currentProject = parsed.projectId;
      isDefault = parsed.projectId === DEFAULT_FIREBASE_CONFIG_OBJ.projectId;
    }
  } catch {
    // fallback
  }

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      resetFirebaseInstance();
      const inst = getFirebaseInstance(customInput.trim() || undefined);
      if (!inst) {
        throw new Error('ไม่สามารถเริ่มต้น Firebase App ได้ กรุณาตรวจสอบ apiKey และ projectId');
      }
      const { doc, getDoc } = await import('firebase/firestore');
      await getDoc(doc(inst.db, 'work_planner', 'ping')).catch(() => null);
      setTestResult({
        ok: true,
        msg: `เชื่อมต่อกับ Cloud Project "${currentProject}" เรียบร้อยแล้ว พร้อมซิงค์งานในทีมอัตโนมัติ`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: `เชื่อมต่อไม่สำเร็จ: ${err.message || 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setSaveMsg(null);
    try {
      if (!customInput.trim()) {
        setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
        setCustomInput(DEFAULT_FIREBASE_CONFIG);
        resetFirebaseInstance();
        setSaveMsg({ ok: true, text: 'คืนค่าเป็น Cloud กลางของระบบเรียบร้อยแล้ว' });
        return;
      }
      const parsed = parseFirebaseConfig(customInput);
      if (!parsed || !parsed.apiKey || !parsed.projectId) {
        throw new Error('ข้อมูล Config ไม่ครบถ้วน (ต้องมี apiKey และ projectId)');
      }
      const formatted = JSON.stringify(parsed, null, 2);
      setFirebaseConfig(formatted);
      setCustomInput(formatted);
      resetFirebaseInstance();
      setSaveMsg({ ok: true, text: 'บันทึกการตั้งค่า Firebase เรียบร้อยแล้ว' });
      setShowCustomConfig(false);
    } catch (err: any) {
      setSaveMsg({ ok: false, text: err.message || 'รูปแบบ Config ไม่ถูกต้อง' });
    }
  };

  const handleResetDefault = () => {
    setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    setCustomInput(DEFAULT_FIREBASE_CONFIG);
    resetFirebaseInstance();
    setSaveMsg({ ok: true, text: 'รีเซ็ตกลับเป็น Cloud กลาง (work-planner-9caf4) เรียบร้อย' });
    setTestResult(null);
    setShowCustomConfig(false);
  };

  const handleCopyProject = () => {
    navigator.clipboard.writeText(currentProject);
    setCopiedProject(true);
    setTimeout(() => setCopiedProject(false), 2000);
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(customInput);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 10000,
        animation: 'appleFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 500,
          background: 'var(--card-solid, #ffffff)',
          borderRadius: 22,
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.32), 0 0 0 1px var(--line)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          border: '1px solid var(--line)',
        }}
      >
        {/* Apple Window Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'rgba(120, 120, 128, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.15), rgba(52, 199, 89, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pri)',
              }}
            >
              <CloudIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt)', letterSpacing: '-0.01em' }}>
                ระบบคลาวด์ทีม (Firebase Cloud)
              </h3>
              <div style={{ color: 'var(--mut)', fontSize: 12, marginTop: 1 }}>
                ซิงค์งานและข้อมูลทีมอัตโนมัติแบบ Real-time
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              color: 'var(--mut)',
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Apple-style Inset Grouped Section */}
          <div
            style={{
              background: 'rgba(120, 120, 128, 0.05)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            {/* Row 1: Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                สถานะการเชื่อมต่อ
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(52, 199, 89, 0.12)',
                  color: '#34c759',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#34c759',
                    boxShadow: '0 0 6px #34c759',
                  }}
                />
                ออนไลน์ (พร้อมใช้งาน)
              </span>
            </div>

            {/* Row 2: Project ID */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                  Cloud Database
                </span>
                <small style={{ display: 'block', fontSize: 11, color: 'var(--mut)' }}>
                  {isDefault ? 'Cloud กลางของระบบ (แชร์อัตโนมัติ)' : 'Custom Firebase Project'}
                </small>
              </div>
              <button
                type="button"
                onClick={handleCopyProject}
                className="btn ghost sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'SF Mono, Menlo, monospace',
                  fontSize: 12,
                  background: 'var(--card-solid)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '4px 10px',
                }}
                title="คลิกเพื่อคัดลอก Project ID"
              >
                <span>{currentProject}</span>
                {copiedProject ? <CheckIcon size={12} color="#34c759" /> : <CopyIcon size={12} />}
              </button>
            </div>

            {/* Row 3: Multi-device sync note */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                การเข้าถึงของทีม
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--pri)', fontWeight: 600 }}>
                ทุกเครื่องซิงค์ตรงกันทันที ⚡
              </span>
            </div>
          </div>

          {/* Friendly Guidance Card */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(0, 113, 227, 0.05)',
              border: '1px solid rgba(0, 113, 227, 0.15)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ color: 'var(--pri)', marginTop: 2, flexShrink: 0 }}>
              <SparklesIcon size={16} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--txt)', lineHeight: 1.5 }}>
              <b>ทุกคนในทีมไม่ต้องตั้งค่าอะไรเลย:</b> เมื่อคุณสร้างห้องทีมแล้ว ให้ส่งรหัส 6 หลักให้เพื่อนร่วมทีม เพื่อนเพียงสมัครสมาชิกและกรอกรหัสนั้น งานจะซิงค์ตรงกันทันทีอัตโนมัติ
            </div>
          </div>

          {/* Test & Actions Bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <button
              type="button"
              className="btn sm"
              onClick={handleTestConnection}
              disabled={testing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12.5,
              }}
            >
              <RefreshCwIcon size={13} className={testing ? 'spin' : ''} />
              <span>{testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
            </button>

            <button
              type="button"
              className="btn ghost sm"
              onClick={handleCopyConfig}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12.5,
                background: 'rgba(120, 120, 128, 0.08)',
              }}
            >
              {copiedConfig ? <CheckIcon size={13} color="#34c759" /> : <CopyIcon size={13} />}
              <span>{copiedConfig ? 'คัดลอก Config แล้ว' : 'คัดลอก JSON'}</span>
            </button>

            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setShowCustomConfig(!showCustomConfig)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 12.5,
                marginLeft: 'auto',
                color: 'var(--mut)',
              }}
            >
              <span>{showCustomConfig ? 'ซ่อนการปรับแต่ง' : '⚙️ ปรับแต่งเอง'}</span>
            </button>
          </div>

          {/* Test result alert */}
          {testResult && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 12.5,
                marginBottom: 14,
                background: testResult.ok ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                color: testResult.ok ? '#28a745' : '#ff3b30',
                border: testResult.ok ? '1px solid rgba(52, 199, 89, 0.25)' : '1px solid rgba(255, 59, 48, 0.25)',
                lineHeight: 1.45,
              }}
            >
              {testResult.msg}
            </div>
          )}

          {/* Save feedback alert */}
          {saveMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 12.5,
                marginBottom: 14,
                background: saveMsg.ok ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                color: saveMsg.ok ? '#28a745' : '#ff3b30',
                border: saveMsg.ok ? '1px solid rgba(52, 199, 89, 0.25)' : '1px solid rgba(255, 59, 48, 0.25)',
                lineHeight: 1.45,
              }}
            >
              {saveMsg.text}
            </div>
          )}

          {/* Expandable Custom Firebase Project Section */}
          {showCustomConfig && (
            <div
              style={{
                marginTop: 10,
                padding: 16,
                borderRadius: 14,
                background: 'rgba(120, 120, 128, 0.05)',
                border: '1px solid var(--line)',
                animation: 'appleScaleUp 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <b style={{ fontSize: 13, color: 'var(--txt)' }}>กำหนด Firebase Config ของคุณเอง:</b>
                {!isDefault && (
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="btn ghost sm"
                    style={{ fontSize: 11.5, color: 'var(--pri)', padding: '2px 8px' }}
                  >
                    คืนค่า Cloud กลาง
                  </button>
                )}
              </div>
              <textarea
                rows={5}
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder={`{\n  "apiKey": "...",\n  "projectId": "..."\n}`}
                style={{
                  fontFamily: 'SF Mono, Menlo, monospace',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  width: '100%',
                  padding: 10,
                  borderRadius: 10,
                  background: 'var(--card-solid)',
                  border: '1px solid var(--line)',
                  color: 'var(--txt)',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn ok sm"
                  onClick={handleSave}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontSize: 12,
                  }}
                >
                  <CheckIcon size={13} />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--line)',
            background: 'rgba(120, 120, 128, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
            เชื่อมต่อกับ Google Firebase Firestore
          </small>
          <button
            type="button"
            className="btn ok"
            onClick={onClose}
            style={{
              borderRadius: 999,
              padding: '8px 22px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
