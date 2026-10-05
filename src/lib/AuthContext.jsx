import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";

const AuthContext = createContext();

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const TOKEN_KEY = "klassic_token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] =
    useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
  };

  const checkAppState = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const token = getToken();

      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      await checkUserAuth();
    } catch (error) {
      console.error("App state check failed:", error);

      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      setAuthError({
        type: "unknown",
        message:
          error.message || "Failed to check authentication",
      });
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const token = getToken();

      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return null;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Authentication failed"
        );
      }

      setUser(data.user);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      return data.user;
    } catch (error) {
      console.error("User auth check failed:", error);

      localStorage.removeItem(TOKEN_KEY);

      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      setAuthError({
        type: "auth_required",
        message: "Authentication required",
      });

      return null;
    }
  };

  const login = async (email, password) => {
    try {
      setAuthError(null);
      setIsLoadingAuth(true);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      if (!data.token) {
        throw new Error("Login token was not received");
      }

      localStorage.setItem(TOKEN_KEY, data.token);

      setUser(data.user);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      return data;
    } catch (error) {
      console.error("Login failed:", error);

      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      setAuthError({
        type: "login_failed",
        message: error.message || "Login failed",
      });

      throw error;
    }
  };

  const logout = (shouldRedirect = true) => {
    localStorage.removeItem(TOKEN_KEY);

    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(true);

    if (shouldRedirect) {
      window.location.href = "/login";
    }
  };

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        login,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};