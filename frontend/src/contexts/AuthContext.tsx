import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { useAccountDrawer } from '@/contexts/AccountDrawerContext';
import { SessionExpiredModal } from '@/components/modals/SessionExpiredModal';
import { config } from "@/config/config"

const API_URL = config.API_URL

interface AuthContextType {
  isAuthenticated: boolean;
  userFirstname: string | null;
  isAdmin: boolean;
  validateToken: () => Promise<void>;
} 

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userFirstname, setUserFirstname] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expirationTime, setExpirationTime] = useState<string>('');
  const { setView, setIsOpen } = useAccountDrawer();
  const hasShownToast = useRef(false);
  const validationTimeout = useRef<NodeJS.Timeout>();
  const isValidating = useRef(false);
  const periodicValidationInterval = useRef<NodeJS.Timeout>();
  const lastActivity = useRef<number>(Date.now());

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Track user activity
  const updateLastActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  const handleTokenExpiration = () => {
    if (!hasShownToast.current) {
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      setExpirationTime(formatTime(new Date()));
      setShowExpiredModal(true);
      hasShownToast.current = true;

      // Clear periodic validation when token expires
      if (periodicValidationInterval.current) {
        clearInterval(periodicValidationInterval.current);
      }
    }
  };

  const handleModalClose = () => {
    setShowExpiredModal(false);
    setUserFirstname(null);
    setIsAdmin(false);
    setView("login");
    setIsOpen(true); // Ensure account drawer opens
  };

  const validateToken = useCallback(async () => {
    // If already validating, skip this call
    if (isValidating.current) {
      return;
    }

    // Clear any pending validation
    if (validationTimeout.current) {
      clearTimeout(validationTimeout.current);
    }

    // Set a timeout to prevent multiple rapid validations
    validationTimeout.current = setTimeout(async () => {
      isValidating.current = true;
      const token = localStorage.getItem("token");
      
      if (!token) {
        setIsAuthenticated(false);
        setUserFirstname(null);
        setIsAdmin(false);
        isValidating.current = false;
        return;
      }

      try {
        const response = await fetch(`${API_URL}/account/validate-token`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          handleTokenExpiration();
          isValidating.current = false;
          return;
        }

        const data = await response.json();
        if (data.result) {
          setIsAuthenticated(true);
          setUserFirstname(capitalizeFirstLetter(data.result.firstname));
          setIsAdmin(data.result.isAdmin ?? false);
          hasShownToast.current = false;
        } else {
          handleTokenExpiration();
        }
      } catch (error) {
        console.error("Token validation error:", error);
        handleTokenExpiration();
      }

      isValidating.current = false;
    }, 100);
  }, []);

  // Initial token validation and page refresh check
  useEffect(() => {
    validateToken();

    // Check token on page refresh
    window.addEventListener('load', validateToken);

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'mousemove', 'click', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    return () => {
      window.removeEventListener('load', validateToken);
      if (validationTimeout.current) {
        clearTimeout(validationTimeout.current);
      }
      if (periodicValidationInterval.current) {
        clearInterval(periodicValidationInterval.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
    };
  }, [validateToken, updateLastActivity]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, userFirstname, isAdmin, validateToken }}>
      {children}
      <SessionExpiredModal
        isOpen={showExpiredModal}
        onClose={handleModalClose}
        userFirstname={userFirstname}
        expirationTime={expirationTime}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
