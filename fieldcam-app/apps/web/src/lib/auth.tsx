"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, companyName: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("fieldcam_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("fieldcam_token");
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("fieldcam_token", res.access_token);
    setUser(res.user);
    router.push("/dashboard");
  };

  const register = async (email: string, password: string, fullName: string, companyName: string) => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/register", {
      email,
      password,
      full_name: fullName,
      company_name: companyName,
    });
    localStorage.setItem("fieldcam_token", res.access_token);
    setUser(res.user);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("fieldcam_token");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
