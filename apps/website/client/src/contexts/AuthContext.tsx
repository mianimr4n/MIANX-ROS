import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  clearStoredUser,
  loadStoredUser,
  loginStoredUser,
  registerStoredUser,
  type StoredUser,
} from "@/lib/customer-store";

interface AuthContextType {
  user: StoredUser | null;
  isAuthenticated: boolean;
  register: (input: { name: string; phone: string; email?: string }) => StoredUser;
  login: (phone: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  const register = (input: { name: string; phone: string; email?: string }) => {
    const nextUser = registerStoredUser(input);
    setUser(nextUser);
    return nextUser;
  };

  const login = (phone: string) => {
    const nextUser = loginStoredUser(phone);
    if (!nextUser) return false;
    setUser(nextUser);
    return true;
  };

  const logout = () => {
    clearStoredUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
