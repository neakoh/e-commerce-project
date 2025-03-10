import React, { createContext, useContext, useState, useEffect } from "react";

interface CartItem {
  id: number;
  name: string;
  brand: string;
  categoryID: number;
  imgurl: string;
  price: number;
  quantity: number; // Available quantity from database
  cartQuantity: number; // Quantity in cart
  isOption?: boolean;
  parentId?: number;
  optionId?: number;
  originalName?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => boolean;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, cartQuantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("basket");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("basket");
      setCart(saved ? JSON.parse(saved) : []);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearCart = () => {
    setCart([]);
    localStorage.setItem("basket", JSON.stringify([]));
    window.dispatchEvent(new Event('storage'));
  };

  const addToCart = (item: CartItem): boolean => {
    // For items with options, check both item ID and option ID
    if (item.isOption) {
      if (cart.some(cartItem => 
        cartItem.parentId === item.parentId && 
        cartItem.optionId === item.optionId)) {
        return false;
      }
    } else {
      // For regular items, just check the item ID
      if (cart.some(cartItem => cartItem.id === item.id && !cartItem.isOption)) {
        return false;
      }
    }
    setCart(prevCart => [...prevCart, item]);
    localStorage.setItem("basket", JSON.stringify([...cart, item]));
    window.dispatchEvent(new Event('storage'));
    return true;
  };

  const removeFromCart = (id: number) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item.id !== id);
      localStorage.setItem("basket", JSON.stringify(newCart));
      return newCart;
    });
  };

  const updateQuantity = (id: number, cartQuantity: number) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((item) =>
        item.id === id ? { ...item, cartQuantity } : item
      );
      localStorage.setItem("basket", JSON.stringify(newCart));
      return newCart;
    });
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};