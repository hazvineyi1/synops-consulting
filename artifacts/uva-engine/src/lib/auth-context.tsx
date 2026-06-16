import { createContext, useContext, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
  useLogin,
  useRegister,
  useLogout,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from "@workspace/api-client-react";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (body: LoginInput) => Promise<AuthUser>;
  register: (body: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const meQueryKey = getGetCurrentUserQueryKey();

  const { data, isLoading } = useGetCurrentUser({
    query: {
      queryKey: meQueryKey,
      retry: false,
      staleTime: 60_000,
    },
  });

  const loginMut = useLogin();
  const registerMut = useRegister();
  const logoutMut = useLogout();

  const login = async (body: LoginInput) => {
    const user = await loginMut.mutateAsync({ data: body });
    queryClient.setQueryData(meQueryKey, user);
    return user;
  };

  const register = async (body: RegisterInput) => {
    const user = await registerMut.mutateAsync({ data: body });
    queryClient.setQueryData(meQueryKey, user);
    return user;
  };

  const logout = async () => {
    await logoutMut.mutateAsync();
    queryClient.setQueryData(meQueryKey, null);
    await queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{ user: data ?? null, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function authErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const e = (data as { error?: unknown }).error;
      if (typeof e === "string") return e;
    }
  }
  return "Something went wrong. Please try again.";
}
