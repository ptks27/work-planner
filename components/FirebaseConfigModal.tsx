'use client';
import { useState } from 'react';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
      // ทดสอบการเชื่อมต่อ
      const { doc, getDoc } = await import('firebase/firestore');
      await getDoc(doc(inst.db, 'work_planner', 'ping')).catch(() => null);
      setTestResult({
        ok: true,
        msg: `เชื่อมต่อกับ Firebase Project "${currentProject}" สำเร็จ! ซิงค์ข้อมูลทีมได้ตามปกติ`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        msg: `เชื่อมต่อไม่สำเร็จ: ${err.message || 'โปรดตรวจสอบสิทธิ์ Firestore หรืออินเทอร์เน็ต'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setSaveMsg(null);
    try {
      if (!customInput.trim()) {
        // ถ้าเว้นว่างให้ใช้ Default
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
    } catch (err: any) {
      setSaveMsg({ ok: false, text: err.message || 'รูปแบบ Config ไม่ถูกต้อง' });
    }
  };

  const handleResetDefault = () => {
    setFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    setCustomInput(DEFAULT_FIREBASE_CONFIG);
    resetFirebaseInstance();
    setSaveMsg({ ok: true, text: 'รีเซ็ตกลับเป็น Cloud กลาง (work-planner-9caf4) สำเร็จ' });
    setTestResult(null);
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(customInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '94%',
          borderRadius: 20,
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-solid)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 113, 227, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pri)',
              }}
            >
              <CloudIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>
                การเชื่อมต่อ Firebase Cloud
              </h3>
              <small style={{ color: 'var(--mut)', fontSize: 12 }}>
                ฐานข้อมูลคลาวด์กลางสำหรับซิงค์ข้อมูลทีมแบบ Real-time
              </small>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onClose}
            style={{ borderRadius: 999, padding: '6px 8px' }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px 22px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Cloud Status Banner */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: 'rgba(52, 199, 89, 0.08)',
              border: '1px solid rgba(52, 199, 89, 0.25)',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#34c759',
                    boxShadow: '0 0 8px #34c759',
                  }}
                />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#34c759' }}>
                  {isDefault ? 'Cloud กลางของระบบเปิดใช้งานอยู่' : 'เชื่อมต่อกับ Custom Firebase'}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  background: 'rgba(52, 199, 89, 0.15)',
                  color: '#34c759',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                Project: {currentProject}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--txt)', lineHeight: 1.5 }}>
              สมาชิกทุกคนในทีมของคุณสามารถสมัครสมาชิกและนำ <b>รหัสทีม 6 หลัก</b> มากรอกเพื่อดึงงานและปฏิทินร่วมกันได้ทันที โดยไม่จำเป็นต้องตั้งค่า Firebase เอง
            </p>
          </div>

          {/* Test & Actions bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              type="button"
              className="btn sm"
              onClick={handleTestConnection}
              disabled={testing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCwIcon size={14} className={testing ? 'spin' : ''} />
              <span>{testing ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
            </button>

            <button
              type="button"
              className="btn ghost sm"
              onClick={handleCopyConfig}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {copied ? <CheckIcon size={14} color="#34c759" /> : <CopyIcon size={14} />}
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก Config JSON'}</span>
            </button>

            {!isDefault && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={handleResetDefault}
                style={{ color: 'var(--pri)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <SparklesIcon size={14} />
                <span>รีเซ็ตกลับเป็น Cloud กลาง</span>
              </button>
            )}
          </div>

          {/* Test connection alert result */}
          {testResult && (
            <div
              className={`auth-alert ${testResult.ok ? 'ok' : 'err'}`}
              style={{ marginBottom: 16, fontSize: 12.5 }}
            >
              {testResult.msg}
            </div>
          )}

          {/* Save message */}
          {saveMsg && (
            <div
              className={`auth-alert ${saveMsg.ok ? 'ok' : 'err'}`}
              style={{ marginBottom: 16, fontSize: 12.5 }}
            >
              {saveMsg.text}
            </div>
          )}

          {/* Accordion Toggle for Custom Config */}
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: 14,
              marginTop: 10,
            }}
          >
            <button
              type="button"
              className="btn ghost sm block"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 10,
                fontSize: 12.5,
              }}
            >
              <span style={{ fontWeight: 600 }}>⚙️ ปรับแต่ง Firebase Config ด้วยตนเอง (ขั้นสูง)</span>
              <span>{showAdvanced ? '▲ ซ่อน' : '▼ ดู/แก้ไข'}</span>
            </button>

            {showAdvanced && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--mut)', margin: '0 0 8px' }}>
                  หากทีมของคุณต้องการแยกฐานข้อมูล Firebase Firestore เป็นของตัวเอง สามารถนำ Config JSON มาวางและบันทึกได้ที่นี่:
                </p>
                <textarea
                  rows={6}
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
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={handleSave}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <CheckIcon size={14} />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--line)',
            background: 'var(--card-solid)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button type="button" className="btn ok sm" onClick={onClose}>
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
