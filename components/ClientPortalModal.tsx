'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { ClientPortalSettings } from '@/lib/types';
import {
  CloseIcon,
  CheckIcon,
  Share2Icon,
  ExternalLinkIcon,
  LockIcon,
  CopyIcon,
  EyeIcon,
} from './Icons';

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreview: () => void;
}

export default function ClientPortalModal({
  isOpen,
  onClose,
  onOpenPreview,
}: ClientPortalModalProps) {
  const { clientPortal, updateClientPortalSettings } = usePlanner();
  const { currentTeam } = useAuth();

  const settings: ClientPortalSettings = clientPortal || {
    enabled: false,
    shareKey: `portal-${Math.random().toString(36).substring(2, 9)}`,
    title: currentTeam ? `โครงการ ${currentTeam.name}` : 'ความคืบหน้าโครงการและแผนงาน',
    clientName: 'ลูกค้าคนสำคัญ / ผู้บริหาร',
    welcomeMessage: 'ยินดีต้อนรับสู่แดชบอร์ดติดตามความคืบหน้าโครงการแบบเรียลไทม์',
    password: '',
    hideInternalComments: true,
    showOnlyDone: false,
    updatedAt: Date.now(),
  };

  const [enabled, setEnabled] = useState(settings.enabled);
  const [title, setTitle] = useState(settings.title);
  const [clientName, setClientName] = useState(settings.clientName || '');
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage || '');
  const [password, setPassword] = useState(settings.password || '');
  const [hideInternalComments, setHideInternalComments] = useState(settings.hideInternalComments ?? true);
  const [showOnlyDone, setShowOnlyDone] = useState(settings.showOnlyDone ?? false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate public share link
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/?portal=${settings.shareKey}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    updateClientPortalSettings({
      enabled,
      title: title.trim(),
      clientName: clientName.trim(),
      welcomeMessage: welcomeMessage.trim(),
      password: password.trim(),
      hideInternalComments,
      showOnlyDone,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{
          maxWidth: 540,
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(0, 113, 227, 0.12)',
                color: 'var(--pri)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2Icon size={18} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5 }}>พอร์ทัลแชร์งานให้ลูกค้า (Client Portal)</h3>
              <small style={{ color: 'var(--mut)', fontSize: 11.5 }}>
                สร้างลิงก์สำหรับลูกค้าหรือผู้บริหารดูความคืบหน้าแบบ Read-only โดยไม่ต้องสมัครสมาชิก
              </small>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {/* Enable / Disable Switch Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: enabled ? 'rgba(52, 199, 89, 0.1)' : 'rgba(120, 120, 128, 0.06)',
              border: `1.5px solid ${enabled ? 'rgba(52, 199, 89, 0.3)' : 'var(--line)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: enabled ? '#15803d' : 'var(--txt)' }}>
                {enabled ? '🟢 เปิดใช้งานพอร์ทัลลูกค้าอยู่' : '⚪ ปิดใช้งานพอร์ทัลลูกค้า'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mut)', marginTop: 2 }}>
                {enabled
                  ? 'บุคคลภายนอกที่มีลิงก์ (และรหัสผ่าน) จะสามารถดูความคืบหน้าได้'
                  : 'ลิงก์นี้จะไม่สามารถเข้าชมได้จนกว่าจะเปิดใช้งาน'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(prev => !prev)}
              style={{
                border: 'none',
                background: enabled ? '#34c759' : '#cbd5e1',
                color: '#fff',
                borderRadius: 999,
                padding: '6px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {enabled ? 'เปิดอยู่' : 'ปิดอยู่'}
            </button>
          </div>

          {/* Share Link Box */}
          {enabled && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--card-solid)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
                  🔗 ลิงก์สำหรับส่งให้ลูกค้า
                </span>
                <span style={{ fontSize: 11, color: 'var(--mut)' }}>
                  อัปเดตสถานะงานอัตโนมัติแบบเรียลไทม์
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  style={{
                    margin: 0,
                    fontSize: 11.5,
                    fontFamily: 'monospace',
                    background: 'rgba(120, 120, 128, 0.05)',
                  }}
                />
                <button
                  type="button"
                  className="btn sm"
                  onClick={handleCopy}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {copied ? <CheckIcon size={13} color="var(--ok)" /> : <CopyIcon size={13} />}
                  <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Portal Customization Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>ชื่อโครงการที่แสดงให้ลูกค้าเห็น *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="เช่น โครงการพัฒนาโมบายแอปพลิเคชันเวอร์ชัน 2.0"
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>ชื่อลูกค้า / บริษัท</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="เช่น บริษัท สยามนวัตกรรม จำกัด (มหาชน)"
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>ข้อความต้อนรับหัวหน้าเว็บ</label>
              <input
                type="text"
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                placeholder="ข้อความทักทายหรือสรุปภาพรวมสั้นๆ..."
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <LockIcon size={13} color="var(--pri)" />
                <span>รหัสผ่านเข้าชม (Client PIN / Password)</span>
                <small style={{ color: 'var(--mut)', fontWeight: 400 }}>(เว้นว่างได้ถ้าไม่ต้องล็อก)</small>
              </label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="เช่น 1234 หรือรหัสลับเฉพาะลูกค้า"
              />
            </div>

            {/* Privacy Toggles */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(120, 120, 128, 0.04)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>ความปลอดภัยและความเป็นส่วนตัว</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={hideInternalComments}
                  onChange={e => setHideInternalComments(e.target.checked)}
                />
                <span>ซ่อนคอมเมนต์และโน้ตภายในทีม (ลูกค้าจะเห็นเฉพาะชื่องานและสถานะส่งมอบ)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={showOnlyDone}
                  onChange={e => setShowOnlyDone(e.target.checked)}
                />
                <span>แสดงเฉพาะงานที่เสร็จสิ้นแล้ว (Done) เท่านั้น</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn ghost sm"
            onClick={onOpenPreview}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <EyeIcon size={14} />
            <span>👁️ พรีวิวในมุมมองลูกค้า</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>
              ยกเลิก
            </button>
            <button
              className="btn primary"
              onClick={handleSave}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckIcon size={14} />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
