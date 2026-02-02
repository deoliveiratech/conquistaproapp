// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen for Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Online login successful
        setUser(currentUser);
        // Persist minimal user info
        const localUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          emailVerified: currentUser.emailVerified
        };
        localStorage.setItem('auth_user', JSON.stringify(localUser));
      } else {
        // Logout or no session
        setUser(null);
        localStorage.removeItem('auth_user');
      }
      setLoading(false);
    });

    // 2. Hydrate from local storage if offline or initial load
    const stored = localStorage.getItem('auth_user');
    if (stored && !user) {
      // We found a local user. If firebase hasn't fired yet or we are offline, use this.
      // Note: onAuthStateChanged fires relatively quickly with null if not logged in.
      // But if offline, it might take long or fail.
      // We'll set it initially. If onAuthStateChanged returns null (explicit logout), it will clear it.
      // To distinguish between "Offline" and "Logged Out", we rely on the fact that if we have a stored user, we intend to be logged in.
      const localUser = JSON.parse(stored);
      // Cast to User (incomplete implementation but sufficient for UI)
      setUser(localUser as User);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
