import { createContext, useContext, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
  useLogin,
  useRegister,
  useLogout,
  useStartImpersonation,
  useStopImpersonation,
  type AuthUser,
  type Impersonator,
  type LoginInput,
  type RegisterInput,
} from "@workspace/api-client-react";

interface AuthContextValue {
  user: AuthUser | null;
  /** Set when the session is an impersonation: the real super administrator. */
  impersonator: Impersonator | null;
  isLoading: boolean;
  login: (body: LoginInput) => Promise<AuthUser>;
  register: (body: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  startImpersonating: (userId: number) => Promise<void>;
  stopImpersonating: () => Promise<void>;
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
  const startImpersonationMut = useStartImpersonation();
  const stopImpersonationMut = useStopImpersonation();

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

  // Impersonation swaps the server session to the target user. The acting
  // identity changes entirely, so drop every cached query and refetch (including
  // /me, which now carries the impersonator). Stopping restores the real session.
  const startImpersonating = async (userId: number) => {
    await startImpersonationMut.mutateAsync({ data: { userId } });
    await queryClient.invalidateQueries();
  };

  const stopImpersonating = async () => {
    await stopImpersonationMut.mutateAsync();
    await queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        impersonator: data?.impersonator ?? null,
        isLoading,
        login,
        register,
        logout,
        startImpersonating,
        stopImpersonating,
      }}
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
    if (data && typeof data === "object") {
      // Prefer a human-readable `message` (for example the plan-tier upgrade
      // prompts), then fall back to the short `error` code/string.
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string" && m.length > 0) return m;
      const e = (data as { error?: unknown }).error;
      if (typeof e === "string") return e;
    }
  }
  return "Something went wrong. Please try again.";
}
