import { createContext, useContext, ReactNode, useState } from 'react';

type AccountDrawerView = "login" | "signup" | "deleteAccount" | "account" | "changePassword" | "viewOrders";

interface AccountDrawerContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  view: AccountDrawerView;
  setView: (view: AccountDrawerView) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (orderId: string | null) => void;
  onOpenChange: (isOpen: boolean) => void;
}

const AccountDrawerContext = createContext<AccountDrawerContextType>({
  isOpen: false,
  setIsOpen: () => {},
  view: 'login',
  setView: () => {},
  selectedOrderId: null,
  setSelectedOrderId: () => {},
  onOpenChange: () => {},
});

export function AccountDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AccountDrawerView>("login");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const onOpenChange = (isOpen: boolean) => {
    setIsOpen(isOpen);
    if (isOpen && localStorage.getItem("token")) {
      setView("account");
    }
  };

  return (
    <AccountDrawerContext.Provider value={{ 
      isOpen, 
      setIsOpen, 
      view, 
      setView,
      selectedOrderId,
      setSelectedOrderId,
      onOpenChange
    }}>
      {children}
    </AccountDrawerContext.Provider>
  );
}

export function useAccountDrawer() {
  const context = useContext(AccountDrawerContext);
  if (context === undefined) {
    throw new Error('useAccountDrawer must be used within an AccountDrawerProvider');
  }
  return context;
}
