import { useState, useEffect, useCallback } from "react";
import { FilterNav } from "@/components/filter-nav";
import { Items } from "@/components/items";
import DefaultLayout from "@/layouts/default";
import { useCart } from "@/contexts/CartContext";
import { SuccessDrawer } from "@/components/drawers/SuccessDrawer";
import { AdminView } from "@/components/AdminView";
import { useAuth } from "@/contexts/AuthContext";
import { config } from "@/config/config"

const API_URL = config.API_URL

interface Item {
  id: number;
  name: string;
  brand_name: string;
  brandID: number;
  categoryID: number;
  currentPrice: number;
  stock: number;
  imgurl: string;
  price: number;
  quantity: number;
  options: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
  }>;
}

const ITEMS_PER_PAGE = 36;

export default function IndexPage() {
  const { isAdmin } = useAuth();
  const { clearCart } = useCart();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
    brand: string | null;
    category: number | null;
    sort: string | null;
  }>({
    brand: null,
    category: null,
    sort: null
  });

  // Fetch items from the API
  const fetchItems = async (currentOffset: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: currentOffset.toString(),
      });

      // Add filters to params if they exist
      if (activeFilters.brand) {
        params.append('brand', activeFilters.brand);
      }
      if (activeFilters.category) {
        params.append('category', activeFilters.category.toString());
      }
      if (activeFilters.sort) {
        params.append('sort', activeFilters.sort);
      }

      const response = await fetch(`${API_URL}/items?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      const data = await response.json();
      
      if (data.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      // Use a single state update to prevent race conditions
      if (currentOffset === 0) {
        setItems(data);
        setFilteredItems(data);
      } else {
        setItems(prevItems => {
          // Filter out any duplicates by ID
          const newItems = [...prevItems];
          data.forEach((item: Item) => {
            if (!newItems.some(existing => existing.id === item.id)) {
              newItems.push(item);
            }
          });
          return newItems;
        });
        setFilteredItems(prevItems => {
          // Filter out any duplicates by ID
          const newItems = [...prevItems];
          data.forEach((item: Item) => {
            if (!newItems.some(existing => existing.id === item.id)) {
              newItems.push(item);
            }
          });
          return newItems;
        });
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check URL parameters when component mounts
    const searchParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setSessionId(sessionId);
      setIsSuccessOpen(true);
      clearCart();
    }
  }, []);

  // Reset everything when filters change
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    fetchItems(0);
  }, [activeFilters.brand, activeFilters.category, activeFilters.sort]); // Include sort in dependencies

  // Load initial items
  useEffect(() => {
    fetchItems(0);
  }, []);

  // Infinite scroll handler with proper dependencies
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    
    if (
      !loading &&
      hasMore &&
      scrollHeight - scrollTop <= clientHeight + 100
    ) {
      const newOffset = offset + ITEMS_PER_PAGE;
      setOffset(newOffset);
      fetchItems(newOffset);
    }
  }, [loading, hasMore, offset, fetchItems, ITEMS_PER_PAGE, activeFilters]); // Added missing dependencies

  // Reset items when filters change
  const handleFilterChange = (filters: {
    brand: string | null;
    category: number | null;
    sort: string | null;
  }) => {
    setOffset(0);
    setHasMore(true);
    setItems([]);
    setFilteredItems([]);
    setActiveFilters(filters);
    
    // Sort is still handled client-side
    if (filters.sort) {
      let updatedItems = [...items];
      if (filters.sort === "Price (Ascending)") {
        updatedItems.sort((a, b) => a.price - b.price);
      } else if (filters.sort === "Price (Descending)") {
        updatedItems.sort((a, b) => b.price - a.price);
      }
      setFilteredItems(updatedItems);
    }
  };

  return (
    <DefaultLayout>
      <div className="h-full flex flex-col w-full">
        {isAdmin ? (
          <div className="flex-grow overflow-hidden w-full">
            <AdminView />
          </div>
        ) : (
          <>

            <div className="flex-grow overflow-hidden w-full relative">
              <Items
                items={filteredItems}
                isLoading={loading}
                onScroll={handleScroll}
                isBasketOpen={isBasketOpen}
                setIsBasketOpen={setIsBasketOpen}
                onFilterChange={handleFilterChange}
                brand={activeFilters.brand}
                category={activeFilters.category}
                sort={activeFilters.sort}
              />
              <FilterNav
                onFilterChange={handleFilterChange}
                activeFilters={activeFilters}
              />
            </div>
          </>
        )}
      </div>
      <SuccessDrawer
        isOpen={isSuccessOpen}
        setIsOpen={setIsSuccessOpen}
        sessionId={sessionId}
      />
    </DefaultLayout>
  );
}