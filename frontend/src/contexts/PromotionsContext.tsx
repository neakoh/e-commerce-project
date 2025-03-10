import React, { createContext, useContext } from 'react';

interface Promotion {
  id: string;
  minSpend: number;
  type: 'freebie' | 'discount';
  value: string | number;
  description: string;
}

interface PromotionsContextType {
  promotions: Promotion[];
  getActivePromotions: (total: number) => Promotion[];
  calculateDiscount: (total: number) => number;
  getFreebies: (total: number) => string[];
}

const promotions: Promotion[] = [
  {
    id: 'magnet10',
    minSpend: 10,
    type: 'freebie',
    value: 'Free Magnet',
    description: 'Spend £10 get a free random magnet'
  },
  {
    id: 'mug20',
    minSpend: 20,
    type: 'freebie',
    value: 'Free Mug',
    description: 'Spend £20 get a free random mug'
  },
  {
    id: 'discount40',
    minSpend: 40,
    type: 'discount',
    value: 20,
    description: 'Spend £40 get 20% off'
  },
  {
    id: 'discount80',
    minSpend: 80,
    type: 'discount',
    value: 30,
    description: 'Spend £80 get 30% off'
  }
];

const PromotionsContext = createContext<PromotionsContextType | undefined>(undefined);

export const PromotionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getActivePromotions = (total: number): Promotion[] => {
    return promotions.filter(promo => total >= promo.minSpend);
  };

  const calculateDiscount = (total: number): number => {
    const discountPromos = promotions
      .filter(promo => promo.type === 'discount' && total >= promo.minSpend)
      .sort((a, b) => b.minSpend - a.minSpend);

    if (discountPromos.length > 0) {
      const highestDiscount = discountPromos[0];
      return total * (Number(highestDiscount.value) / 100);
    }
    return 0;
  };

  const getFreebies = (total: number): string[] => {
    const freebies = promotions
      .filter(promo => promo.type === 'freebie' && total >= promo.minSpend)
      .map(promo => String(promo.value));

    // Get the highest applicable discount
    const discountPromo = promotions
      .filter(promo => promo.type === 'discount' && total >= promo.minSpend)
      .sort((a, b) => b.minSpend - a.minSpend)[0];  // Sort by highest spend threshold first

    if (discountPromo) {
      freebies.push(`${discountPromo.value}% OFF`);
    }

    return freebies;
  };

  return (
    <PromotionsContext.Provider value={{ promotions, getActivePromotions, calculateDiscount, getFreebies }}>
      {children}
    </PromotionsContext.Provider>
  );
};

export const usePromotions = (): PromotionsContextType => {
  const context = useContext(PromotionsContext);
  if (!context) {
    throw new Error('usePromotions must be used within a PromotionsProvider');
  }
  return context;
};
