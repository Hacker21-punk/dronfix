import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: any;
  profile: any;
}

async function loginRequest(data: LoginData): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Login failed" }));
    throw new Error(err.message || "Login failed");
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();

  const token = localStorage.getItem("token");
  const profileStr = localStorage.getItem("profile");
  let profile: any = null;
  try {
    if (profileStr && profileStr !== "undefined" && profileStr !== "null") {
      profile = JSON.parse(profileStr);
    }
  } catch {
    // Clear corrupted profile data
    localStorage.removeItem("profile");
  }

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("profile", JSON.stringify(data.user));
      queryClient.clear();
      window.location.href = "/";
    },
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("profile");
    queryClient.clear();
    window.location.href = "/auth";
  };

  return {
    user: profile,
    isLoading: false,
    isAuthenticated: !!token,
    login: loginMutation.mutate,
    loginError: loginMutation.error?.message,
    isLoggingIn: loginMutation.isPending,
    logout,
    isLoggingOut: false,
  };
}
