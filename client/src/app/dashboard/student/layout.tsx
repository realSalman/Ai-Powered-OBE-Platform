"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["student"]}>
      {children}
    </RoleGuard>
  );
}
