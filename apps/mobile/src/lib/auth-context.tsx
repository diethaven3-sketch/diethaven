import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export interface AuthUser {
  id: string;
  role: "ADMIN" | "DIETITIAN" | "PATIENT";
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = "diethaven_token";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// No dependency on atob/Buffer, which aren't guaranteed to exist on every RN engine.
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(base64UrlDecode(payload));
    if (!json.sub || !json.role || !json.email) return null;
    return { id: json.sub, role: json.role, email: json.email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        const decoded = decodeToken(stored);
        if (decoded) {
          setToken(stored);
          setUser(decoded);
        } else {
          await SecureStore.deleteItemAsync(STORAGE_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (newToken: string) => {
    const decoded = decodeToken(newToken);
    if (!decoded) return;
    await SecureStore.setItemAsync(STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(decoded);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
