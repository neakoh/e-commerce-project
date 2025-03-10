import { Select, SelectItem } from "@heroui/select";
import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarItem,
} from "@heroui/navbar";
import { Chip } from "@heroui/chip";
import { useState, useEffect } from "react";
import { usePromotions } from "@/contexts/PromotionsContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@heroui/button";
import { config } from "@/config/config"

const API_URL = config.API_URL

export const FilterNav = ({
  onFilterChange,
  activeFilters,
}: {
  onFilterChange: (filters: any) => void;
  activeFilters: {
    brand: string | null;
    category: number | null;
    sort: string | null;
  };
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSort, setSelectedSort] = useState<string | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const { promotions } = usePromotions();
  const { cart } = useCart();

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  // Get active freebies and highest discount
  const activeFreebies = promotions
    .filter(promo => promo.type === 'freebie' && cartTotal >= promo.minSpend)
    .sort((a, b) => a.minSpend - b.minSpend);

  const activeDiscount = promotions
    .filter(promo => promo.type === 'discount' && cartTotal >= promo.minSpend)
    .sort((a, b) => b.minSpend - a.minSpend)[0];  // Get highest discount only

  // Combine freebies and highest discount
  const activePromotions = [...activeFreebies];
  if (activeDiscount) {
    activePromotions.push(activeDiscount);
  }

  const nextPromo = promotions
    .filter(promo => cartTotal < promo.minSpend)
    .sort((a, b) => a.minSpend - b.minSpend)[0];

  const sortOptions = [
    { label: "Price (Ascending)", value: "price_asc" },
    { label: "Price (Descending)", value: "price_desc" },
  ];

  // Fetch brands and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_URL}/brands`),
          fetch(`${API_URL}/categories`),
        ]);

        if (!brandsResponse.ok || !categoriesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [brandsData, categoriesData] = await Promise.all([
          brandsResponse.json(),
          categoriesResponse.json(),
        ]);

        setBrands(brandsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Update local state when active filters change
  useEffect(() => {
    setSelectedBrand(activeFilters.brand);
    setSelectedCategory(activeFilters.category);
    if (activeFilters.sort) {
      const sortOption = sortOptions.find(option => option.value === activeFilters.sort);
      setSelectedSort(sortOption?.label || null);
    } else {
      setSelectedSort(null);
    }
  }, [activeFilters]);

  // Handle brand selection
  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    const currentSortValue = selectedSort ? sortOptions.find(option => option.label === selectedSort)?.value : null;
    onFilterChange({ brand, category: selectedCategory, sort: currentSortValue });
  };

  // Handle category selection
  const handleCategorySelect = (categoryID: number) => {
    setSelectedCategory(categoryID);
    const currentSortValue = selectedSort ? sortOptions.find(option => option.label === selectedSort)?.value : null;
    onFilterChange({ brand: selectedBrand, category: categoryID, sort: currentSortValue });
  };

  // Handle sort selection
  const handleSortSelect = (sortLabel: string) => {
    const sortOption = sortOptions.find(option => option.label === sortLabel);
    const sortValue = sortOption ? sortOption.value : null;
    setSelectedSort(sortLabel); 
    onFilterChange({ brand: selectedBrand, category: selectedCategory, sort: sortValue });
  };

  // Handle removing a filter
  const handleRemoveFilter = (filterType: "brand" | "category" | "sort") => {
    if (filterType === "brand") {
      setSelectedBrand(null);
    } else if (filterType === "category") {
      setSelectedCategory(null);
    } else if (filterType === "sort") {
      setSelectedSort(null);
    }

    // Convert the sort label to backend value if sort is present
    const currentSortValue = filterType === "sort" ? null : 
      (selectedSort ? sortOptions.find(option => option.label === selectedSort)?.value : null);

    onFilterChange({
      brand: filterType === "brand" ? null : selectedBrand,
      category: filterType === "category" ? null : selectedCategory,
      sort: currentSortValue,
    });
  };

  const renderFilterChips = () => (
    <div className="flex gap-2 overflow-x-auto mb-2 px-1">
      {activeFilters.brand && (
        <Chip
          size="lg"
          variant="flat"
          className="bg-default/60 backdrop-blur-lg border border-default-200/50 shadow-sm"
          radius="sm"
        >
          <span className="text-default-700">{activeFilters.brand}</span>
          <button
            className="ml-2 text-default-400 hover:text-default-500 transition-colors"
            onClick={() => handleRemoveFilter("brand")}
            aria-label={`Remove ${activeFilters.brand} filter`}
          >
            ✕
          </button>
        </Chip>
      )}
      {activeFilters.category && (
        <Chip
          size="lg"
          variant="flat"
          className="bg-default/60 backdrop-blur-lg border border-default-200/50 shadow-sm"
          radius="sm"
        >
          <span className="text-default-700">
            {categories.find((category) => category.id === activeFilters.category)?.name}
          </span>
          <button
            className="ml-2 text-default-400 hover:text-default-500 transition-colors"
            onClick={() => handleRemoveFilter("category")}
            aria-label={`Remove ${categories.find((category) => category.id === activeFilters.category)?.name} filter`}
          >
            ✕
          </button>
        </Chip>
      )}
      {activeFilters.sort && (
        <Chip
          size="lg"
          variant="flat"
          className="bg-default/60 backdrop-blur-lg border border-default-200/50 shadow-sm"
          radius="sm"
        >
          <span className="text-default-700">{selectedSort}</span>
          <button
            className="ml-2 text-default-400 hover:text-default-500 transition-colors"
            onClick={() => handleRemoveFilter("sort")}
            aria-label={`Remove ${selectedSort} filter`}
          >
            ✕
          </button>
        </Chip>
      )}
    </div>
  );

  return (
    <div className="absolute bottom-3 md:top-6 flex flex-col w-full items-end gap-2 px-6 h-16">
      {/* Promotions Section */}
      <div className="hidden md:flex items-center gap-8 bg-default/80 backdrop-blur-lg py-2 px-6 rounded-lg shadow-md h-full order-last">
        <div className="flex flex-col">
          <div className="flex items-center gap-6">
            {activePromotions.map((promo) => (
              <div key={promo.id} className="flex items-center gap-2">
                {promo.type === 'freebie' && typeof promo.value === 'string' && promo.value.includes('Mug') && (
                  <svg className="text-success-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.083 5h10.834A1.08 1.08 0 0 1 16 6.077v8.615C16 17.072 14.06 19 11.667 19H7.333C4.94 19 3 17.071 3 14.692V6.077A1.08 1.08 0 0 1 4.083 5M16 8h2.5c1.38 0 2.5 1.045 2.5 2.333v2.334C21 13.955 19.88 15 18.5 15H16"/></svg>
                )}
                {promo.type === 'freebie' && typeof promo.value === 'string' && promo.value.includes('Magnet') && (
                  <svg className="text-success-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 20v-9q-.825 0-1.412-.587T2 9V7q0-.825.588-1.412T4 5h3.2q-.125-.225-.162-.475T7 4q0-1.25.875-2.125T10 1q.575 0 1.075.213T12 1.8q.425-.4.925-.6T14 1q1.25 0 2.125.875T17 4q0 .275-.05.513T16.8 5H20q.825 0 1.413.588T22 7v2q0 .825-.587 1.413T20 11v9q0 .825-.587 1.413T18 22H6q-.825 0-1.412-.587T4 20M14 3q-.425 0-.712.288T13 4t.288.713T14 5t.713-.288T15 4t-.288-.712T14 3M9 4q0 .425.288.713T10 5t.713-.288T11 4t-.288-.712T10 3t-.712.288T9 4M4 7v2h7V7zm7 13v-9H6v9zm2 0h5v-9h-5zm7-11V7h-7v2z"/></svg>
                )}
                {promo.type === 'discount' && (
                  <span className="font-semibold text-success-500">{promo.value}% OFF</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {nextPromo && (
          <>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <div>
                <span className="text-sm text-primary-600">
                  Spend £{(nextPromo.minSpend - cartTotal).toFixed(2)} more 
                  {nextPromo.type === 'freebie' 
                    ? ` for a ${nextPromo.value}.`
                    : ` for ${nextPromo.value}% off.`}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col ">
        {/* Desktop Filter Chips */}
        <div className="flex flex-col">
          {/* Desktop Filter Controls */}
          <div className="hidden md:flex w-full md:w-auto flex-row overflow-hidden rounded-lg justify-between items-end shadow-md">
            <NextUINavbar
              maxWidth="full"
              position="static"
              className="overflow-hidden rounded-lg bg-default/60"
            >
              <NavbarContent className="rounded-md" justify="end">  
                <div className="hidden md:flex gap-4 justify-end items-center">
                  <NavbarItem>
                    <Select
                      variant="underlined"
                      placeholder="Brand"
                      className="w-[150px] lg:w-[200px]"
                      classNames={{
                        trigger: "text-default-800",
                        value: "text-default-800",
                        base: "text-default-600"
                      }}
                      selectedKeys={activeFilters.brand ? [activeFilters.brand] : []}
                      onSelectionChange={(keys) => handleBrandSelect(Array.from(keys)[0] as string)}
                      aria-label="Select brand filter"
                    >
                      {brands.map((brand) => (
                        <SelectItem key={brand.name} value={brand.name}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </NavbarItem>
                  <NavbarItem>
                    <Select
                      variant="underlined"
                      placeholder="Category"
                      className="w-[150px] lg:w-[200px]"
                      classNames={{
                        trigger: "text-default-800",
                        value: "text-default-800",
                        base: "text-default-600"
                      }}
                      selectedKeys={activeFilters.category ? [activeFilters.category.toString()] : []}
                      onSelectionChange={(keys) => handleCategorySelect(Number(Array.from(keys)[0]))}
                      aria-label="Select category filter"
                    >
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </NavbarItem>
                  <NavbarItem>
                    <Select
                      variant="underlined"
                      placeholder="Sort"
                      className="w-[150px] lg:w-[200px]"
                      classNames={{
                        trigger: "text-default-800",
                        value: "text-default-800",
                        base: "text-default-600"
                      }}
                      selectedKeys={activeFilters.sort ? [activeFilters.sort] : []}
                      onSelectionChange={(keys) => handleSortSelect(Array.from(keys)[0] as string)}
                      aria-label="Sort products"
                    >
                      {sortOptions.map((option) => (
                        <SelectItem key={option.label} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </NavbarItem>
                  {(activeFilters.brand || activeFilters.category || activeFilters.sort) && (
                    <NavbarItem>
                      <Button
                        size="sm"
                        variant="shadow"
                        color="danger"
                        startContent={
                          <svg className="w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        }
                        onPress={() => {
                          onFilterChange({
                            brand: null,
                            category: null,
                            sort: null
                          });
                        }}
                      >
                        Clear All
                      </Button>
                    </NavbarItem>
                  )}
                </div>
              </NavbarContent>
            </NextUINavbar>
          </div>
        </div>
        {/* Mobile Filter Controls */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
          {/* Mobile Filter Chips */}
          {(activeFilters.brand || activeFilters.category || activeFilters.sort) && (
            <div className="flex gap-2 overflow-x-auto mb-2 px-1">
              {renderFilterChips()}
            </div>
          )}

          {/* Mobile Filter Selects */}
          <div className="bg-default/60 backdrop-blur-lg rounded-xl shadow-lg">
            <div className="p-2 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                <Select
                  size="md"
                  variant="underlined"
                  placeholder="Sort"
                  selectedKeys={activeFilters.sort ? [activeFilters.sort] : []}
                  onSelectionChange={(keys) => handleSortSelect(Array.from(keys)[0] as string)}
                  aria-label="Sort products"
                  classNames={{
                    trigger: "text-default-800",
                    value: "text-default-800",
                    base: "text-default-600"
                  }}
                >
                  {sortOptions.map((option) => (
                    <SelectItem key={option.label} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  size="md"
                  variant="underlined"
                  placeholder="Brand"
                  selectedKeys={activeFilters.brand ? [activeFilters.brand] : []}
                  onSelectionChange={(keys) => handleBrandSelect(Array.from(keys)[0] as string)}
                  aria-label="Filter by brand"
                  classNames={{
                    trigger: "text-default-800",
                    value: "text-default-800",
                    base: "text-default-600"
                  }}
                >
                  {brands.map((brand) => (
                    <SelectItem key={brand.name} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  size="md"
                  variant="underlined"
                  placeholder="Category"
                  selectedKeys={activeFilters.category ? [activeFilters.category.toString()] : []}
                  onSelectionChange={(keys) => handleCategorySelect(Number(Array.from(keys)[0]))}
                  aria-label="Filter by category"
                  classNames={{
                    trigger: "text-default-800",
                    value: "text-default-800",
                    base: "text-default-600"
                  }}
                >
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
