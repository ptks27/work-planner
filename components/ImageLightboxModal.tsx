'use client';

import React, { useEffect } from 'react';
import { CloseIcon, DownloadIcon } from './Icons';
import { formatFileSize } from '@/lib/attachments';
import { TaskAttachment } from '@/lib/types';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  imageName?: string;
  imageSize?: number;
  attachment?: TaskAttachment | null;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  imageSize,
  attachment,
}: ImageLightboxModalProps) {
  const actualUrl = attachment ? attachment.url : imageUrl;
  const actualName = attachment ? attachment.name : imageName;
  const actualSize = attachment ? attachment.size : imageSize;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !actualUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = actualUrl;
    a.download = actualName || `attachment-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'appleFadeIn 0.2s ease',
      }}
    >
      {/* Top Floating Controls */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleDownload}
          className="btn ghost sm"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: 999,
            padding: '8px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          title="ดาวน์โหลดรูปภาพนี้"
        >
          <DownloadIcon size={15} />
          <span>ดาวน์โหลด</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="btn ghost sm"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: 999,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          title="ปิด (Esc)"
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {/* Main Image */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={actualUrl}
          alt={actualName || 'Attachment preview'}
          style={{
            maxWidth: '100%',
            maxHeight: '82vh',
            objectFit: 'contain',
            borderRadius: 14,
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.6)',
            animation: 'appleScaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* Bottom Info Bar */}
      {actualName && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 14,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            fontSize: 12.5,
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <span>{actualName}</span>
          {actualSize && <span style={{ opacity: 0.7, marginLeft: 8 }}>({formatFileSize(actualSize)})</span>}
        </div>
      )}
    </div>
  );
}
