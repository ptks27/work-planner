'use client';
import React from 'react';
import type { AvatarId } from '@/lib/types';

export type { AvatarId };

export interface AvatarMeta {
  id: AvatarId;
  name: string;
  desc: string;
  gender: 'male' | 'female' | 'bot';
  bgColor: string;
}

export const AVATAR_LIST: AvatarMeta[] = [
  {
    id: 'dev_boy',
    name: 'หนุ่มไอทีใส่แว่น',
    desc: 'สายเดฟ มุ่งมั่น โค้ดทั้งวัน',
    gender: 'male',
    bgColor: '#e0e7ff',
  },
  {
    id: 'office_girl',
    name: 'สาวออฟฟิศมั่นใจ',
    desc: 'ผู้นำทีม จัดการงานเฉียบขาด',
    gender: 'female',
    bgColor: '#fce7f3',
  },
  {
    id: 'creative_guy',
    name: 'หนุ่มดีไซเนอร์หมวกแก๊ป',
    desc: 'ครีเอทีฟ หูฟังคู่ใจ ไอเดียพุ่ง',
    gender: 'male',
    bgColor: '#dcfce7',
  },
  {
    id: 'active_girl',
    name: 'สาวสดใสพลังบวก',
    desc: 'พลังงานเต็มเปี่ยม ยิ้มรับทุกงาน',
    gender: 'female',
    bgColor: '#fef3c7',
  },
  {
    id: 'bot_mascot',
    name: 'บ็อตผู้ช่วยอัจฉริยะ',
    desc: 'AI มาสคอต ทำงานไม่มีเหนื่อย',
    gender: 'bot',
    bgColor: '#cffafe',
  },
  {
    id: 'manager_suit',
    name: 'ผู้จัดการมาดเท่',
    desc: 'เนี๊ยบ ทรงพลัง บริหารเป้าหมาย',
    gender: 'male',
    bgColor: '#dbeafe',
  },
  {
    id: 'coffee_coder',
    name: 'สาวคาเฟ่สายลุย',
    desc: 'กาแฟคู่ใจ พร้อมลุยทุกงาน',
    gender: 'female',
    bgColor: '#fef3c7',
  },
  {
    id: 'cyber_hacker',
    name: 'หนุ่มไซเบอร์ฮู้ดดี้',
    desc: 'สายเทค แก้บั๊กทะลุมิติ',
    gender: 'male',
    bgColor: '#ede9fe',
  },
  {
    id: 'cat_lover',
    name: 'สาวหวานทาสแมว',
    desc: 'ใจฟูทุกครั้งเมื่อได้ทำงาน',
    gender: 'female',
    bgColor: '#ffe4e6',
  },
  {
    id: 'data_analyst',
    name: 'นักวิเคราะห์สุขุม',
    desc: 'วางแผนแม่นยำ ทุกตัวเลขมีคำตอบ',
    gender: 'male',
    bgColor: '#ccfbf1',
  },
  {
    id: 'music_producer',
    name: 'โปรดิวเซอร์สุดคูล',
    desc: 'จังหวะการทำงานไม่มีสะดุด',
    gender: 'male',
    bgColor: '#f3e8ff',
  },
  {
    id: 'gamer_streamer',
    name: 'สตรีมเมอร์ไฟนีออน',
    desc: 'โฟกัสเป้าหมาย ปราบทุกอุปสรรค',
    gender: 'female',
    bgColor: '#e0e7ff',
  },
  {
    id: 'plant_doctor',
    name: 'คุณหมอต้นไม้ใจดี',
    desc: 'สายชิลล์ เติบโตอย่างมั่นคง',
    gender: 'male',
    bgColor: '#dcfce7',
  },
  {
    id: 'astro_explorer',
    name: 'นักบินอวกาศตะลุยงาน',
    desc: 'ทะยานสู่ความสำเร็จไร้ขอบเขต',
    gender: 'male',
    bgColor: '#e0f2fe',
  },
  {
    id: 'pixel_ninja',
    name: 'นินจาสายสปีด',
    desc: 'งานเสร็จไว ว่องไวไร้ร่องรอย',
    gender: 'bot',
    bgColor: '#fee2e2',
  },
];

export function AvatarIcon({
  id,
  size = 40,
  animated = false,
  className = '',
}: {
  id?: AvatarId | string;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const avatarId: AvatarId = (id as AvatarId) || 'dev_boy';
  const animStyle = animated ? { transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' } : undefined;

  switch (avatarId) {
    case 'dev_boy':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#6366f1" />
          <circle cx="50" cy="50" r="46" fill="#e0e7ff" />
          <path d="M22 45 C22 20, 78 20, 78 45 Z" fill="#1e293b" />
          <path d="M20 96 C20 74 35 70 50 70 C65 70 80 74 80 96 Z" fill="#4f46e5" />
          <path d="M42 70 L50 82 L58 70 Z" fill="#e0e7ff" />
          <rect x="30" y="32" width="40" height="42" rx="18" fill="#fed7aa" />
          <path d="M26 36 C35 24 65 24 74 36 C68 32 58 34 50 32 C42 34 32 32 26 36 Z" fill="#1e293b" />
          <rect x="33" y="44" width="14" height="12" rx="3" stroke="#0f172a" strokeWidth="2.5" fill="#bae6fd" fillOpacity="0.4" />
          <rect x="53" y="44" width="14" height="12" rx="3" stroke="#0f172a" strokeWidth="2.5" fill="#bae6fd" fillOpacity="0.4" />
          <line x1="47" y1="50" x2="53" y2="50" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="40" cy="50" r="2" fill="#0f172a" />
          <circle cx="60" cy="50" r="2" fill="#0f172a" />
          <path d="M44 63 Q50 68 56 63" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="34" cy="58" r="3" fill="#fb7185" opacity="0.5" />
          <circle cx="66" cy="58" r="3" fill="#fb7185" opacity="0.5" />
        </svg>
      );

    case 'office_girl':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#ec4899" />
          <circle cx="50" cy="50" r="46" fill="#fce7f3" />
          <path d="M22 45 C20 75 24 85 30 92 C32 60 68 60 70 92 C76 85 80 75 78 45 Z" fill="#78350f" />
          <path d="M18 96 C18 76 34 72 50 72 C66 72 82 76 82 96 Z" fill="#be185d" />
          <path d="M40 72 L50 86 L60 72 Z" fill="#fdf2f8" />
          <path d="M46 72 L50 78 L54 72 Z" fill="#fbcfe8" />
          <rect x="32" y="32" width="36" height="42" rx="18" fill="#ffedd5" />
          <path d="M26 36 C36 20 64 20 74 36 C66 28 56 30 50 34 C44 28 32 30 26 36 Z" fill="#78350f" />
          <ellipse cx="41" cy="48" rx="2.5" ry="3" fill="#451a03" />
          <ellipse cx="59" cy="48" rx="2.5" ry="3" fill="#451a03" />
          <path d="M38 44 Q41 42 44 44" stroke="#451a03" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M56 44 Q59 42 62 44" stroke="#451a03" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="29" cy="54" r="2.5" fill="#eab308" />
          <circle cx="71" cy="54" r="2.5" fill="#eab308" />
          <path d="M44 63 Q50 67 56 63" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="37" cy="56" r="3.5" fill="#f43f5e" opacity="0.4" />
          <circle cx="63" cy="56" r="3.5" fill="#f43f5e" opacity="0.4" />
        </svg>
      );

    case 'creative_guy':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#10b981" />
          <circle cx="50" cy="50" r="46" fill="#dcfce7" />
          <path d="M20 96 C20 74 35 70 50 70 C65 70 80 74 80 96 Z" fill="#047857" />
          <path d="M30 68 C30 82 70 82 70 68" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" fill="none" />
          <rect x="25" y="66" width="10" height="12" rx="4" fill="#0f172a" />
          <rect x="65" y="66" width="10" height="12" rx="4" fill="#0f172a" />
          <rect x="31" y="34" width="38" height="40" rx="17" fill="#fed7aa" />
          <path d="M43 65 Q50 68 57 65" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M28 36 C28 22 72 22 72 36 Z" fill="#065f46" />
          <path d="M36 24 C40 20 60 20 64 24 Z" fill="#047857" />
          <rect x="24" y="34" width="52" height="7" rx="3.5" fill="#047857" />
          <circle cx="41" cy="49" r="2.5" fill="#1c1917" />
          <circle cx="59" cy="49" r="2.5" fill="#1c1917" />
          <path d="M38 44 L45 43" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M55 43 L62 44" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M45 58 Q50 62 55 58" stroke="#c2410c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'active_girl':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#f59e0b" />
          <circle cx="50" cy="50" r="46" fill="#fef3c7" />
          <circle cx="70" cy="28" r="14" fill="#92400e" />
          <circle cx="68" cy="32" r="5" fill="#ea580c" />
          <path d="M20 96 C20 74 35 70 50 70 C65 70 80 74 80 96 Z" fill="#ea580c" />
          <path d="M44 70 L50 79 L56 70 Z" fill="#fef08a" />
          <rect x="31" y="32" width="38" height="42" rx="18" fill="#fde68a" />
          <path d="M28 34 C36 24 64 24 72 34 C64 30 54 32 48 30 C42 32 34 30 28 34 Z" fill="#92400e" />
          <path d="M28 35 C38 27 62 27 72 35" stroke="#0284c7" strokeWidth="5" strokeLinecap="round" fill="none" />
          <ellipse cx="41" cy="48" rx="3.5" ry="4" fill="#1c1917" />
          <ellipse cx="59" cy="48" rx="3.5" ry="4" fill="#1c1917" />
          <circle cx="42.5" cy="46.5" r="1.3" fill="#ffffff" />
          <circle cx="60.5" cy="46.5" r="1.3" fill="#ffffff" />
          <path d="M43 58 Q50 67 57 58 Z" fill="#e11d48" />
          <path d="M46 58 Q50 61 54 58 Z" fill="#ffffff" />
          <circle cx="34" cy="55" r="4" fill="#fb7185" opacity="0.6" />
          <circle cx="66" cy="55" r="4" fill="#fb7185" opacity="0.6" />
        </svg>
      );

    case 'bot_mascot':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#06b6d4" />
          <circle cx="50" cy="50" r="46" fill="#cffafe" />
          <path d="M24 96 C24 76 36 72 50 72 C64 72 76 76 76 96 Z" fill="#0891b2" />
          <circle cx="50" cy="85" r="5" fill="#67e8f9" />
          <line x1="50" y1="26" x2="50" y2="15" stroke="#0e7490" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="14" r="5" fill="#f43f5e" />
          <rect x="22" y="42" width="6" height="14" rx="3" fill="#0e7490" />
          <rect x="72" y="42" width="6" height="14" rx="3" fill="#0e7490" />
          <rect x="26" y="26" width="48" height="44" rx="14" fill="#f8fafc" stroke="#0e7490" strokeWidth="3" />
          <rect x="32" y="34" width="36" height="24" rx="8" fill="#0f172a" />
          <circle cx="42" cy="45" r="4" fill="#22d3ee" />
          <circle cx="58" cy="45" r="4" fill="#22d3ee" />
          <circle cx="43" cy="44" r="1.5" fill="#ffffff" />
          <circle cx="59" cy="44" r="1.5" fill="#ffffff" />
          <path d="M46 52 Q50 54 54 52" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'manager_suit':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#3b82f6" />
          <circle cx="50" cy="50" r="46" fill="#dbeafe" />
          {/* Suit Jacket */}
          <path d="M18 96 C18 72 32 68 50 68 C68 68 82 72 82 96 Z" fill="#1e3a8a" />
          {/* Shirt & Red Tie */}
          <polygon points="44,68 50,84 56,68" fill="#ffffff" />
          <polygon points="48,72 52,72 53,88 50,92 47,88" fill="#dc2626" />
          {/* Head & Face */}
          <rect x="31" y="30" width="38" height="40" rx="17" fill="#fed7aa" />
          {/* Slick Dark Hair */}
          <path d="M26 34 C26 18 74 18 74 34 C68 25 58 24 50 24 C40 24 32 26 26 34 Z" fill="#0f172a" />
          <path d="M28 32 C34 26 44 26 48 30 Z" fill="#1e293b" />
          {/* Confident Eyes */}
          <circle cx="41" cy="47" r="2.5" fill="#0f172a" />
          <circle cx="59" cy="47" r="2.5" fill="#0f172a" />
          {/* Sharp Brows */}
          <path d="M37 42 L45 41" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M55 41 L63 42" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          {/* Calm Smile */}
          <path d="M44 58 Q50 62 56 58" stroke="#9a3412" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'coffee_coder':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#d97706" />
          <circle cx="50" cy="50" r="46" fill="#fef3c7" />
          {/* Bob Hair Back */}
          <rect x="24" y="32" width="52" height="42" rx="16" fill="#78350f" />
          {/* Warm Sweater */}
          <path d="M20 96 C20 74 35 70 50 70 C65 70 80 74 80 96 Z" fill="#b45309" />
          <path d="M40 70 Q50 76 60 70" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Face */}
          <rect x="32" y="32" width="36" height="38" rx="17" fill="#ffedd5" />
          {/* Cute Bangs */}
          <path d="M28 32 C36 24 64 24 72 32 C65 34 58 35 50 35 C42 35 35 34 28 32 Z" fill="#78350f" />
          {/* Eyes with glasses */}
          <circle cx="41" cy="46" r="6" stroke="#92400e" strokeWidth="2" fill="#fff" fillOpacity="0.3" />
          <circle cx="59" cy="46" r="6" stroke="#92400e" strokeWidth="2" fill="#fff" fillOpacity="0.3" />
          <line x1="47" y1="46" x2="53" y2="46" stroke="#92400e" strokeWidth="2" />
          <circle cx="41" cy="46" r="2" fill="#451a03" />
          <circle cx="59" cy="46" r="2" fill="#451a03" />
          {/* Cheerful Smile */}
          <path d="M45 56 Q50 60 55 56" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="36" cy="52" r="3" fill="#f87171" opacity="0.5" />
          <circle cx="64" cy="52" r="3" fill="#f87171" opacity="0.5" />
          {/* Coffee Mug in Front */}
          <rect x="44" y="80" width="12" height="15" rx="3" fill="#ffffff" stroke="#78350f" strokeWidth="1.5" />
          <path d="M56 83 C59 83 59 89 56 89" stroke="#78350f" strokeWidth="1.5" fill="none" />
          <path d="M48 76 Q49 74 48 72" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M52 76 Q53 74 52 72" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'cyber_hacker':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#7c3aed" />
          <circle cx="50" cy="50" r="46" fill="#ede9fe" />
          {/* Dark Tech Hoodie Body */}
          <path d="M18 96 C18 72 32 66 50 66 C68 66 82 72 82 96 Z" fill="#1e1b4b" />
          {/* Big Hoodie Curve */}
          <path d="M24 50 C22 20 78 20 76 50 C74 72 68 76 50 76 C32 76 26 72 24 50 Z" fill="#312e81" />
          {/* Inner Shadow / Head Cavity */}
          <ellipse cx="50" cy="48" rx="20" ry="22" fill="#0f172a" />
          {/* Neon Visor / Glowing Specs */}
          <rect x="34" y="42" width="32" height="10" rx="4" fill="#22c55e" opacity="0.2" />
          <rect x="35" y="43" width="30" height="8" rx="3" stroke="#22c55e" strokeWidth="2" fill="none" />
          <circle cx="43" cy="47" r="2.5" fill="#4ade80" />
          <circle cx="57" cy="47" r="2.5" fill="#4ade80" />
          {/* Neon Smirk */}
          <path d="M46 58 Q52 61 56 57" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Hoodie drawstrings */}
          <line x1="44" y1="74" x2="44" y2="86" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
          <line x1="56" y1="74" x2="56" y2="86" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'cat_lover':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#f43f5e" />
          <circle cx="50" cy="50" r="46" fill="#ffe4e6" />
          {/* Cat Ears */}
          <polygon points="26,38 32,16 44,28" fill="#fda4af" stroke="#f43f5e" strokeWidth="2" />
          <polygon points="30,34 34,22 40,29" fill="#f43f5e" />
          <polygon points="74,38 68,16 56,28" fill="#fda4af" stroke="#f43f5e" strokeWidth="2" />
          <polygon points="70,34 66,22 60,29" fill="#f43f5e" />
          {/* Hair Back */}
          <circle cx="50" cy="46" r="26" fill="#fb7185" />
          {/* Dress */}
          <path d="M20 96 C20 74 34 70 50 70 C66 70 80 74 80 96 Z" fill="#e11d48" />
          <circle cx="50" cy="80" r="4" fill="#ffe4e6" />
          {/* Face */}
          <rect x="32" y="32" width="36" height="40" rx="18" fill="#fff1f2" />
          {/* Wavy Fringe */}
          <path d="M28 34 C36 26 64 26 72 34 C66 30 56 32 50 30 C44 32 34 30 28 34 Z" fill="#fb7185" />
          {/* Cat Whiskers */}
          <line x1="28" y1="52" x2="35" y2="52" stroke="#fda4af" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="28" y1="55" x2="35" y2="56" stroke="#fda4af" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="72" y1="52" x2="65" y2="52" stroke="#fda4af" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="72" y1="55" x2="65" y2="56" stroke="#fda4af" strokeWidth="1.5" strokeLinecap="round" />
          {/* Sparkly Eyes */}
          <ellipse cx="41" cy="47" rx="3" ry="3.5" fill="#4c0519" />
          <ellipse cx="59" cy="47" rx="3" ry="3.5" fill="#4c0519" />
          <circle cx="42" cy="45.5" r="1.2" fill="#fff" />
          <circle cx="60" cy="45.5" r="1.2" fill="#fff" />
          {/* Cat Nose and Mouth */}
          <polygon points="49,54 51,54 50,56" fill="#f43f5e" />
          <path d="M46 58 Q48 60 50 58 Q52 60 54 58" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'data_analyst':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#0d9488" />
          <circle cx="50" cy="50" r="46" fill="#ccfbf1" />
          {/* Neat Dark Hair */}
          <path d="M26 40 C26 20 74 20 74 40 Z" fill="#134e4a" />
          {/* Collared Shirt */}
          <path d="M20 96 C20 74 34 70 50 70 C66 70 80 74 80 96 Z" fill="#0f766e" />
          <path d="M44 70 L50 82 L56 70 Z" fill="#ffffff" />
          {/* Face */}
          <rect x="31" y="32" width="38" height="40" rx="18" fill="#fef3c7" />
          {/* Hair part */}
          <path d="M28 34 C36 24 64 22 72 34 C64 30 52 32 46 28 C38 32 32 30 28 34 Z" fill="#134e4a" />
          {/* Gold Wire Glasses */}
          <circle cx="41" cy="47" r="6.5" stroke="#ca8a04" strokeWidth="2" fill="#fff" fillOpacity="0.3" />
          <circle cx="59" cy="47" r="6.5" stroke="#ca8a04" strokeWidth="2" fill="#fff" fillOpacity="0.3" />
          <line x1="47.5" y1="47" x2="52.5" y2="47" stroke="#ca8a04" strokeWidth="2" />
          <circle cx="41" cy="47" r="2" fill="#042f2e" />
          <circle cx="59" cy="47" r="2" fill="#042f2e" />
          {/* Yellow Pencil over Ear */}
          <rect x="68" y="30" width="16" height="4" rx="2" transform="rotate(-30 68 30)" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
          {/* Calm Smile */}
          <path d="M45 58 Q50 62 55 58" stroke="#042f2e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'music_producer':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#9333ea" />
          <circle cx="50" cy="50" r="46" fill="#f3e8ff" />
          {/* Afro / Curly Hair Background */}
          <circle cx="50" cy="38" r="25" fill="#3b0764" />
          <circle cx="34" cy="40" r="12" fill="#3b0764" />
          <circle cx="66" cy="40" r="12" fill="#3b0764" />
          {/* Clothes */}
          <path d="M20 96 C20 74 34 70 50 70 C66 70 80 74 80 96 Z" fill="#6b21a8" />
          <path d="M42 70 L50 80 L58 70 Z" fill="#facc15" />
          {/* Face */}
          <rect x="33" y="34" width="34" height="38" rx="16" fill="#fed7aa" />
          {/* Gold Studio Headphones */}
          <path d="M24 44 C24 24 76 24 76 44" stroke="#eab308" strokeWidth="6" strokeLinecap="round" fill="none" />
          <rect x="22" y="40" width="8" height="16" rx="4" fill="#ca8a04" />
          <rect x="70" y="40" width="8" height="16" rx="4" fill="#ca8a04" />
          {/* Sunglasses on Face */}
          <rect x="35" y="42" width="13" height="9" rx="3" fill="#1e1b4b" />
          <rect x="52" y="42" width="13" height="9" rx="3" fill="#1e1b4b" />
          <line x1="48" y1="46" x2="52" y2="46" stroke="#1e1b4b" strokeWidth="2" />
          <line x1="37" y1="44" x2="44" y2="49" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" />
          <line x1="54" y1="44" x2="61" y2="49" stroke="#c084fc" strokeWidth="1" strokeLinecap="round" />
          {/* Cool Beard / Smile */}
          <path d="M44 58 Q50 63 56 58" stroke="#3b0764" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'gamer_streamer':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#4f46e5" />
          <circle cx="50" cy="50" r="46" fill="#e0e7ff" />
          {/* RGB Cat Ears on Headset */}
          <polygon points="28,34 33,18 42,28" fill="#ec4899" />
          <polygon points="72,34 67,18 58,28" fill="#06b6d4" />
          {/* Hair */}
          <circle cx="50" cy="44" r="24" fill="#312e81" />
          <rect x="24" y="40" width="10" height="30" rx="5" fill="#312e81" />
          <rect x="66" y="40" width="10" height="30" rx="5" fill="#312e81" />
          {/* Jacket */}
          <path d="M20 96 C20 74 34 70 50 70 C66 70 80 74 80 96 Z" fill="#4338ca" />
          <path d="M48 70 L48 96" stroke="#06b6d4" strokeWidth="2" />
          {/* Face */}
          <rect x="32" y="32" width="36" height="40" rx="17" fill="#fde68a" />
          {/* Headband arch */}
          <path d="M28 38 C28 20 72 20 72 38" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" fill="none" />
          <rect x="24" y="38" width="7" height="15" rx="3" fill="#ec4899" />
          <rect x="69" y="38" width="7" height="15" rx="3" fill="#06b6d4" />
          {/* Microphone Boom */}
          <path d="M30 50 Q36 62 45 60" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="46" cy="60" r="2.5" fill="#06b6d4" />
          {/* Anime Eyes */}
          <ellipse cx="41" cy="46" rx="3" ry="4" fill="#1e1b4b" />
          <ellipse cx="59" cy="46" rx="3" ry="4" fill="#1e1b4b" />
          <circle cx="42" cy="44.5" r="1.3" fill="#ffffff" />
          <circle cx="60" cy="44.5" r="1.3" fill="#ffffff" />
          {/* Open Smile */}
          <path d="M45 54 Q50 58 55 54" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'plant_doctor':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#16a34a" />
          <circle cx="50" cy="50" r="46" fill="#dcfce7" />
          {/* Little Sprout on Head */}
          <path d="M50 24 C50 16 42 16 44 22" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <ellipse cx="43" cy="18" rx="4" ry="2.5" transform="rotate(-30 43 18)" fill="#4ade80" />
          <ellipse cx="53" cy="19" rx="4" ry="2.5" transform="rotate(30 53 19)" fill="#4ade80" />
          {/* Hair */}
          <path d="M26 38 C26 22 74 22 74 38 Z" fill="#3f2c1d" />
          {/* Apron Body */}
          <path d="M20 96 C20 74 34 70 50 70 C66 70 80 74 80 96 Z" fill="#15803d" />
          <rect x="42" y="78" width="16" height="14" rx="3" fill="#166534" />
          {/* Face */}
          <rect x="31" y="32" width="38" height="40" rx="18" fill="#fed7aa" />
          {/* Hair fringe */}
          <path d="M28 34 C36 26 64 26 72 34 C64 30 54 32 48 30 C42 32 34 30 28 34 Z" fill="#3f2c1d" />
          {/* Gentle Eyes */}
          <path d="M37 47 Q41 44 45 47" stroke="#3f2c1d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M55 47 Q59 44 63 47" stroke="#3f2c1d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Warm Rosy Smile */}
          <path d="M44 57 Q50 62 56 57" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="35" cy="54" r="3.5" fill="#f87171" opacity="0.5" />
          <circle cx="65" cy="54" r="3.5" fill="#f87171" opacity="0.5" />
        </svg>
      );

    case 'astro_explorer':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#0284c7" />
          <circle cx="50" cy="50" r="46" fill="#e0f2fe" />
          {/* Stars in Space */}
          <circle cx="20" cy="25" r="1.5" fill="#facc15" />
          <circle cx="82" cy="30" r="2" fill="#facc15" />
          <circle cx="76" cy="18" r="1" fill="#facc15" />
          {/* Spacesuit Body */}
          <path d="M18 96 C18 74 34 70 50 70 C66 70 82 74 82 96 Z" fill="#f8fafc" />
          <rect x="44" y="76" width="12" height="10" rx="3" fill="#0284c7" />
          <circle cx="50" cy="81" r="2" fill="#f43f5e" />
          {/* Helmet Dome */}
          <circle cx="50" cy="46" r="26" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          {/* Visor */}
          <rect x="30" y="32" width="40" height="28" rx="12" fill="#0f172a" />
          <ellipse cx="42" cy="40" rx="10" ry="4" transform="rotate(-15 42 40)" fill="#38bdf8" opacity="0.6" />
          {/* Smiley Face Inside Visor */}
          <circle cx="43" cy="47" r="2.5" fill="#38bdf8" />
          <circle cx="57" cy="47" r="2.5" fill="#38bdf8" />
          <path d="M46 53 Q50 56 54 53" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'pixel_ninja':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={`avatar-svg ${className}`}
          style={animStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="50" fill="#dc2626" />
          <circle cx="50" cy="50" r="46" fill="#fee2e2" />
          {/* Flowing Headband Ribbons */}
          <path d="M72 38 Q86 42 84 56 Q80 48 74 44" fill="#b91c1c" />
          {/* Ninja Outfit */}
          <path d="M20 96 C20 74 34 70 50 70 C66 70 80 74 80 96 Z" fill="#18181b" />
          <path d="M45 70 L50 82 L55 70 Z" fill="#b91c1c" />
          {/* Ninja Cowl Head */}
          <rect x="28" y="28" width="44" height="44" rx="18" fill="#27272a" />
          {/* Red Headband */}
          <rect x="26" y="32" width="48" height="10" rx="3" fill="#dc2626" />
          <circle cx="50" cy="37" r="3" fill="#ffffff" />
          {/* Eye Opening */}
          <rect x="34" y="44" width="32" height="12" rx="4" fill="#fed7aa" />
          {/* Sharp Determined Eyes */}
          <polygon points="38,48 44,48 43,51 39,51" fill="#09090b" />
          <polygon points="56,48 62,48 61,51 57,51" fill="#09090b" />
          <circle cx="41" cy="49" r="0.8" fill="#ffffff" />
          <circle cx="59" cy="49" r="0.8" fill="#ffffff" />
        </svg>
      );

    default:
      return null;
  }
}
