import { HeroUIProvider } from "@heroui/react";
import { useNavigate, useHref } from "react-router-dom";
import { Toaster } from 'sonner';
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountDrawerProvider } from "./contexts/AccountDrawerContext";
import { PromotionsProvider } from "./contexts/PromotionsContext";

declare module "@react-types/shared" {
  interface RouterConfig {
    navigate: (to: string) => void;
  }
}

export const Provider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <PromotionsProvider>
            <HeroUIProvider navigate={navigate} useHref={useHref}>
              <AccountDrawerProvider>
                {children}
                <Toaster 
                  position="bottom-center" 
                  richColors 
                  expand={true}
                  closeButton
                  style={{
                    marginBottom: '1rem',
                    zIndex: 9999
                  }}
                />
              </AccountDrawerProvider>
            </HeroUIProvider>
          </PromotionsProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
