'use client';
import { useEffect, useState } from 'react';
import { fmt } from './utils';

/** วันที่ปัจจุบัน อัปเดตเองเมื่อข้ามวัน */
export function useToday() {
  const [t, setT] = useState(() => fmt(new Date()));
  useEffect(() => {
    const i = setInterval(() => setT(fmt(new Date())), 60000);
    return () => clearInterval(i);
  }, []);
  return t;
}