"use client";

import React from 'react';
import RoleGuard from '@/components/RoleGuard';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["faculty"]}>
      {children}
    </RoleGuard>
  );
}
