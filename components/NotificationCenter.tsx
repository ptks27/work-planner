'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePlanner } from '@/lib/store';
import { useAuth } from '@/lib/authStore';
import { AvatarIcon } from './Avatars';
import { AppNotification, Task } from '@/lib/types';
import { formatRelativeTime } from '@/lib/notifications';
import {
  BellIcon,
  CloseIcon,
  CheckIcon,
  TrashIcon,
  MessageSquareIcon,
  UserIcon,
  BoltIcon,
} from './Icons';

interface NotificationCenterProps {
  onOpenTask: (task: Task) => void;
}

export default function NotificationCenter({ onOpenTask }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { currentUser } = useAuth();
  const {
    tasks,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = usePlanner();

  // กรองเฉพาะการแจ้งเตือนที่ส่งถึง currentUser
  const myNotifications = (notifications || []).filter(
    n => !currentUser || n.targetUserId === currentUser.id
  );

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const displayList = myNotifications.filter(n => (filter === 'unread' ? !n.read : true));

  // ปิดเมื่อคลิกนอก dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = (n: AppNotification) => {
    markNotificationRead(n.id);
    setIsOpen(false);
    const targetTask = tasks.find(t => t.id === n.taskId);
    if (targetTask) {
      onOpenTask(targetTask);
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'mention':
        return (
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#0071e3',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            💬
          </span>
        );
      case 'assigned':
        return (
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#34c759',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            👤
          </span>
        );
      case 'status_change':
        return (
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ff9500',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            ⚡
          </span>
        );
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button with Unread Badge */}
      <button
        type="button"
        className="nav-icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="กล่องการแจ้งเตือน (Notification Center)"
        aria-label="การแจ้งเตือน"
        style={{
          position: 'relative',
          background: isOpen ? 'rgba(0, 113, 227, 0.12)' : undefined,
          color: isOpen ? 'var(--pri)' : undefined,
        }}
      >
        <BellIcon size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: '#ff3b30',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 6px rgba(255, 59, 48, 0.6)',
              animation: 'applePulse 2s infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel (Apple macOS Style) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 380,
            maxWidth: '92vw',
            background: 'var(--card-solid, #ffffff)',
            borderRadius: 20,
            border: '1px solid var(--line)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.22), 0 0 0 1px var(--line)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'appleScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(120, 120, 128, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>
                การแจ้งเตือน
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: 'rgba(255, 59, 48, 0.12)',
                    color: '#ff3b30',
                  }}
                >
                  {unreadCount} ใหม่
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllNotificationsRead(currentUser?.id)}
                  className="btn ghost sm"
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, color: 'var(--pri)' }}
                  title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                >
                  อ่านทั้งหมด
                </button>
              )}
              {myNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearNotifications(currentUser?.id)}
                  className="btn ghost sm"
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, color: 'var(--mut)' }}
                  title="ล้างการแจ้งเตือนทั้งหมด"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              padding: '8px 14px',
              gap: 6,
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg)',
            }}
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                border: 'none',
                background: filter === 'all' ? 'var(--card-solid)' : 'transparent',
                color: filter === 'all' ? 'var(--txt)' : 'var(--mut)',
                fontWeight: filter === 'all' ? 700 : 500,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                cursor: 'pointer',
                boxShadow: filter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              ทั้งหมด ({myNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              style={{
                border: 'none',
                background: filter === 'unread' ? 'var(--card-solid)' : 'transparent',
                color: filter === 'unread' ? 'var(--txt)' : 'var(--mut)',
                fontWeight: filter === 'unread' ? 700 : 500,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                cursor: 'pointer',
                boxShadow: filter === 'unread' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              ยังไม่อ่าน ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 8px' }}>
            {displayList.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  color: 'var(--mut)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
                <b style={{ color: 'var(--txt)', display: 'block', marginBottom: 2 }}>
                  ไม่มีการแจ้งเตือนใหม่
                </b>
                <span style={{ fontSize: 12 }}>
                  เมื่อมีเพื่อน @Mention หรือมอบหมายงาน จะขึ้นแจ้งเตือนที่นี่
                </span>
              </div>
            ) : (
              displayList.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: item.read ? 'transparent' : 'rgba(0, 113, 227, 0.05)',
                    border: item.read ? '1px solid transparent' : '1px solid rgba(0, 113, 227, 0.15)',
                    marginBottom: 4,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(120, 120, 128, 0.08)')}
                  onMouseLeave={e =>
                    (e.currentTarget.style.background = item.read
                      ? 'transparent'
                      : 'rgba(0, 113, 227, 0.05)')
                  }
                >
                  {/* Actor Avatar with Type Badge */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
                    <AvatarIcon id={item.actorAvatar || 'dev_boy'} size={34} />
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--txt)', lineHeight: 1.4 }}>
                      <b>{item.actorName}</b> {item.text}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--card-solid)',
                        border: '1px solid var(--line)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--pri)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📌 {item.taskTitle}
                    </div>

                    <div style={{ fontSize: 10.5, color: 'var(--mut)', marginTop: 4 }}>
                      {formatRelativeTime(item.createdAt)}
                    </div>
                  </div>

                  {/* Unread blue dot */}
                  {!item.read && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#0071e3',
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
