"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, isMock } from '../lib/firebase';
import axios from 'axios';

interface UserData {
  _id: string;
  email: string;
  name: string;
  roles: string[];
  department?: string;
  studentId?: string;
  batch?: string;
  teacherInitial?: string;
}

interface AuthContextType {
  user: UserData | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isMock: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  isMock: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMock || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        try {
          const token = await fUser.getIdToken();
          await login(token);
        } catch (error) {
          console.error("Failed to authenticate with backend", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (token: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${apiUrl}/auth/login`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(response.data.user);
      
      // Force refresh the token so that any newly injected custom claims (by the backend) are retrieved
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const logout = async () => {
    if (auth) {
      await auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isMock, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
