"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';

export default function HODLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["HOD", "hod"]}>
      {children}
    </RoleGuard>
  );
}
