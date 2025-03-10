import { Button } from "@heroui/button";
import { Card, CardBody, Image, useDisclosure, Spinner, ScrollShadow } from "@heroui/react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { useCart } from "@/contexts/CartContext";
import { toast } from 'sonner';

interface Item {
  id: number;
  name: string;
  brand_name: string;
  brandID: number;
  quantity: number,
  categoryID: number;
  currentPrice: number;
  imgurl: string; // Image URL for the item
  price: number;
  options: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
  }>;
  stock: number;
}

interface ItemsProps {
  items: Item[];
  isLoading: boolean;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  isBasketOpen: boolean;
  setIsBasketOpen: (open: boolean) => void;
  onFilterChange?: (filters: {
    brand: number | null;
    category: number | null;
    sort: string | null;
  }) => void;
}

const image_url = `your_s3_bucket_url`;

export const Items = ({ items, isLoading, onScroll, isBasketOpen }: ItemsProps) => {
  const { addToCart, cart } = useCart();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [modalImageIndex, setModalImageIndex] = useState<number>(0);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: number]: number }>({});

  // Memoize formatNameForURL since it's a pure function
  const formatNameForURL = useCallback((name: string) => {
    return encodeURIComponent(name)
      .trim()
      .replace(/%22/g, "")
      .replace(/%2C/g, ",") // Remove encoded double quotes
      .replace(/%20/g, "+") // Replace spaces with '+'
      .replace(/%26/g, "&") // Replace encoded '&' with '&'
      .replace(/%2F/g, "-") // Replace encoded '/' with '/'
      .replace(/\+-\+/g, "+")
      .replace(/%23/g, "#") // Replace '+-+' with a single '+'
      .replace(/'/g, "");
  }, []);

  // Initialize currentImageIndices
  useEffect(() => {
    const initialIndices = items.reduce((acc, item) => {
      if (item.options?.length) {
        acc[item.id] = 0;
      }
      return acc;
    }, {} as Record<number, number>);
    setCurrentImageIndices(initialIndices);
  }, [items]);

  // Memoize getImageUrl to handle both main and option images
  const getImageUrl = useCallback((item: Item) => {
    if (item.options?.length) {
      const currentIndex = currentImageIndices[item.id] ?? 0;
      if (currentIndex === 0) {
        return `${image_url}${formatNameForURL(item.name)}.webp`;
      } else {
        const option = item.options[currentIndex - 1];
        if (option) {
          return `${image_url}${formatNameForURL(option.name)}.webp`;
        }
      }
    }
    return `${image_url}${formatNameForURL(item.name)}.webp`;
  }, [currentImageIndices, formatNameForURL]);

  // Memoize getModalImageUrl
  const getModalImageUrl = useCallback(() => {
    if (!selectedItem) return '';
    
    if (selectedItem.options?.length && modalImageIndex > 0) {
      const optionIndex = modalImageIndex - 1;
      if (optionIndex >= 0 && optionIndex < selectedItem.options.length) {
        const option = selectedItem.options[optionIndex];
        return `${image_url}${formatNameForURL(option.name)}.webp`;
      }
    }
    return `${image_url}${formatNameForURL(selectedItem.name)}.webp`;
  }, [selectedItem, modalImageIndex, formatNameForURL]);

  const handleCardClick = useCallback((item: Item) => {
    setSelectedItem(item);
    setModalQuantity(1);
    
    if (item.options?.length) {
      setModalImageIndex(1); // Start with first option
      if (item.options[0]) {
        setSelectedOption(item.options[0].name);
        setCurrentPrice(item.options[0].price);
      }
    } else {
      setModalImageIndex(0);
      setSelectedOption('');
      setCurrentPrice(item.price);
    }
    onOpen();
  }, [onOpen]);

  // Modal image navigation
  const handleModalPrevImage = useCallback(() => {
    if (!selectedItem?.options?.length) return;
    
    setModalImageIndex(prev => {
      // When at first option (index 1), cycle to last option
      const newIndex = prev <= 1 ? selectedItem.options.length : prev - 1;
      
      // Update option and price
      const option = selectedItem.options[newIndex - 1];
      if (option) {
        setSelectedOption(option.name);
        setCurrentPrice(option.price);
        setModalQuantity(1);
      }
      return newIndex;
    });
  }, [selectedItem]);

  const handleModalNextImage = useCallback(() => {
    if (!selectedItem?.options?.length) return;
    
    setModalImageIndex(prev => {
      // When at last option, cycle to first option (index 1)
      const newIndex = prev >= selectedItem.options.length ? 1 : prev + 1;
      
      // Update option and price
      const option = selectedItem.options[newIndex - 1];
      if (option) {
        setSelectedOption(option.name);
        setCurrentPrice(option.price);
        setModalQuantity(1);
      }
      return newIndex;
    });
  }, [selectedItem]);

  // Update modal content when image changes or when option is selected
  useEffect(() => {
    if (!selectedItem?.options?.length) return;
    
    if (modalImageIndex === 0) {
      setSelectedOption('');
      setCurrentPrice(selectedItem.price);
    } else {
      const option = selectedItem.options[modalImageIndex - 1];
      if (option) {
        setSelectedOption(option.name);
        setCurrentPrice(option.price);
      }
    }
  }, [modalImageIndex, selectedItem]);

  const handleModalClose = useCallback(() => {
    if (selectedItem) {
      // setCurrentImageIndices(prev => ({
      //   ...prev,
      //   [selectedItem.id]: modalImageIndex
      // }));
    }
    onClose();
  }, [selectedItem, modalImageIndex, onClose]);

  // Reset modal quantity when modal closes
  useEffect(() => {
    if (!isOpen) {
      setModalQuantity(1);
    }
  }, [isOpen]);

  // Add scroll event listener
  useEffect(() => {
    if (isLoading) return;

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 1000) {
        onScroll(event);
      }
    };

    window.addEventListener('scroll', (e) => handleScroll(e as unknown as React.UIEvent<HTMLDivElement>));
    return () => window.removeEventListener('scroll', (e) => handleScroll(e as unknown as React.UIEvent<HTMLDivElement>));
  }, [isLoading, onScroll]);

  useEffect(() => {
    // Update basket drawer state when isBasketOpen changes
    if (isBasketOpen) {
      // If you have a function to open the basket drawer, call it here
      // For example:
      document.getElementById('shopping-cart-drawer')?.setAttribute('data-open', 'true');
    }
  }, [isBasketOpen]);

  useEffect(() => {
    // Don't observe while loading initial items
    if (isLoading && items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoading && items.length > 0) {
          onScroll({ currentTarget: document.querySelector('.items-container') } as React.UIEvent<HTMLDivElement>);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [isLoading, onScroll, items.length]);

  const loaderRef = useRef(null);
  
  return (
    <div className="h-full relative">
      <ScrollShadow size={20} className="h-full overflow-y-auto px-4" onScroll={onScroll} isEnabled={false}>
        {items.length === 0 ? (
          <div className="h-full w-full flex justify-center items-center">
            <Spinner color="primary" size="lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:p-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="w-full hover:opacity-90 transition-opacity bg-transparent"
                  data-brand-id={item.brandID}
                  data-category-id={item.categoryID}
                  shadow="none"
                  isPressable
                  onClick={() => handleCardClick(item)}
                >
                  <CardBody 
                    className="relative overflow-visible p-0"
                  >
                    <div className="relative group">
                      <Image
                        className="z-0 object-cover w-80 h-60 sm:h-70 md:h-80 xl:h-70"
                        radius="md"
                        shadow="sm"
                        src={getImageUrl(item)}
                        alt={item.name}
                        key={`${item.id}-0`}
                      />
                      {/* Stock quantity chip - only show if no options */}
                      {!item.options?.length && (
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          item.quantity === 0 
                            ? "bg-gray-500 text-white" 
                            : item.quantity <= 5 
                              ? "bg-red-500 text-white" 
                              : "bg-green-500 text-white"
                        }`}>
                          {item.quantity === 0 
                            ? "Out of Stock" 
                            : item.quantity <= 5 
                              ? `Only ${item.quantity} left` 
                              : "In Stock"}
                        </div>
                      )}
                      <div className="hidden md:flex absolute inset-0 items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                        <Button
                          className="backdrop-blur-md rounded-none w-full rounded-b-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.options?.length > 0) {
                              handleCardClick(item);
                            } else if (item.quantity > 0) {
                              const itemToAdd = {
                                ...item,
                                cartQuantity: 1,
                                brand: item.brand_name
                              };
                              const success = addToCart(itemToAdd);
                              if (success) {
                                toast.success('Added to Cart', {
                                  description: `1x ${item.name} added to your cart`,
                                  duration: 2500,
                                  style: {
                                    background: '#18181b',
                                    color: '#fff',
                                  },
                                });
                              } else {
                                toast.error('Already in Cart', {
                                  description: `${item.name} is already in your cart`,
                                  duration: 2500,
                                  style: {
                                    background: '#18181b',
                                    color: '#fff',
                                  },
                                });
                              }
                            }
                          }}
                          isDisabled={
                            item.options?.length > 0 
                              ? item.options.every(opt => opt.quantity === 0)  // Disable if all options are out of stock
                              : item.quantity === 0
                          }
                        >
                          {item.options?.length > 0 
                            ? item.options.every(opt => opt.quantity === 0)
                              ? "Out of Stock"
                              : "View Options"
                            : item.quantity === 0 
                              ? "Out of Stock" 
                              : "Add to Cart"}
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <h4 className="text-sm font-semibold line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-default-500">{item.brand_name}</p>
                      {/* Only show price if no options */}
                      {!item.options?.length && (
                        <p className="text-sm font-semibold mt-1">£{item.price}</p>
                      )}
                      {/* Show "Multiple Options" if item has options */}
                      {item.options?.length > 0 && (
                        <p className="text-xs text-default-500 mt-1">Multiple Options Available</p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
            <div ref={loaderRef} className="h-10 opacity-0" />
            {isLoading && (
              <div className="fixed bottom-0 left-0 w-full h-1 bg-gray-200 z-[9999]">
                <div 
                  className="h-full bg-primary"
                  style={{ 
                    width: '100%',
                    animation: 'progressBar 3.5s cubic-bezier(0.45, 0.05, 0.55, 0.95)'
                  }}
                />
              </div>
            )}
          </>
        )}
      </ScrollShadow>
      <Modal
        backdrop="blur"
        isOpen={isOpen}
        onClose={handleModalClose}
        size="lg"
        hideCloseButton={false}
        isDismissable={true}
        isKeyboardDismissDisabled={false}
        className="bg-background/80 backdrop-blur-lg h-[95dvh] md:h-auto"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <p className="">{selectedItem?.name}</p>
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <p className="text-default-500 text-sm">{selectedItem?.brand_name}</p>
                    <span className="text-default-400 text-sm">•</span>
                    <p className="text-default-500 text-sm">{selectedItem?.quantity} left in stock</p>
                  </div>
                  <p className="text-lg font-semibold">£{currentPrice}</p>
                </div>
              </ModalHeader>
              <ScrollShadow>
              <ModalBody className="overflow-y-auto">
                <div className="">
                  {/* Left Side - Image */}
                  <div className="relative">
                    <Image
                      src={getModalImageUrl()}
                      alt={selectedOption || selectedItem?.name || ''}
                      className="w-full object-contain rounded-lg transition-all duration-300 ease-in-out"
                      radius="lg"
                    />
                    {selectedItem && selectedItem.options && selectedItem.options.length > 0 && (
                      <>
                        {/* Left Arrow */}
                        <Button
                          isIconOnly
                          variant="light"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-lg border border-default-200/50 shadow-sm z-10"
                          size="sm"
                          onClick={handleModalPrevImage}
                          aria-label="Previous option"
                        >
                          ←
                        </Button>
                        {/* Right Arrow */}
                        <Button
                          isIconOnly
                          variant="light"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-lg border border-default-200/50 shadow-sm z-10"
                          size="sm"
                          onClick={handleModalNextImage}
                          aria-label="Next option"
                        >
                          →
                        </Button>
                        {/* Option indicator dots */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10" role="tablist">
                          {selectedItem.options.map((_, index) => (
                            <div
                              key={index}
                              role="tab"
                              tabIndex={-1}
                              aria-selected={modalImageIndex === index + 1}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                modalImageIndex === index + 1
                                  ? 'bg-primary'
                                  : 'bg-default-300'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Right Side - Details */}
                  <div className="flex flex-col justify-between">
                    <div className="flex flex-col gap-4">
                    {/* Option Selector - Only show for items with options */}
                    {selectedItem && selectedItem.options && selectedItem.options.length > 0 && (
                      <div className="w-full">
                        <label htmlFor="option-select" className="block text-sm font-medium mb-2">
                          Select Option
                        </label>
                        <select
                          id="option-select"
                          className="w-full p-2 rounded-lg border border-default-200 bg-default-100"
                          value={selectedOption}
                          onChange={(e) => {
                            const option = selectedItem.options.find(opt => opt.name === e.target.value);
                            if (option) {
                              setSelectedOption(option.name);
                              setCurrentPrice(option.price);
                              setModalQuantity(1);
                              // Find the index of the selected option and update modal image
                              const optionIndex = selectedItem.options.findIndex(opt => opt.name === option.name);
                              setModalImageIndex(optionIndex + 1);
                            }
                          }}
                        >
                          <option value="" disabled>Choose an option</option>
                          {selectedItem.options.map((option) => (
                            <option 
                              key={option.name} 
                              value={option.name}
                              disabled={option.quantity === 0}
                            >
                              {option.name}
                            </option>
                          ))}
                        </select>
                        {selectedOption && (
                          <div className="mt-2 text-sm text-default-500">
                            {(() => {
                              const option = selectedItem.options.find(opt => opt.name === selectedOption);
                              if (option) {
                                if (option.quantity === 0) return "Out of Stock";
                                if (option.quantity <= 5) return `Only ${option.quantity} left`;
                                return `${option.quantity} in stock`;
                              }
                              return "";
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                    {/* Quantity Selector and Add to Cart */}
                    <div className="flex flex-col gap-6">
                    
                  </div>
                  </div>
                </div>
              </ModalBody>
              </ScrollShadow>
              <ModalFooter className="bg-default-60 mx-6 p-2 shadow-xl rounded-xl my-2 md:my-4 mb-6">
                {selectedItem && (
                  <div className="flex flex-row justify-between w-full mt-0">
                    <div className="flex items-center gap-2 bg-default-100 rounded-lg px-2 h-10">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        aria-label="Decrease quantity"
                        isDisabled={modalQuantity <= 1 || 
                          (selectedOption ? 
                            selectedItem.options.find(opt => opt.name === selectedOption)?.quantity === 0 : 
                            selectedItem.quantity === 0)
                        }
                        onPress={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                      >
                        -
                      </Button>
                      <span className="text-sm font-medium">Quantity: {modalQuantity}</span>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        aria-label="Increase quantity"
                        isDisabled={
                          selectedOption ?
                            modalQuantity >= (selectedItem.options.find(opt => opt.name === selectedOption)?.quantity || 0) :
                            modalQuantity >= selectedItem.quantity || selectedItem.quantity === 0
                        }
                        onPress={() => {
                          const maxQuantity = selectedOption ?
                            selectedItem.options.find(opt => opt.name === selectedOption)?.quantity || 0 :
                            selectedItem.quantity;
                          setModalQuantity(prev => Math.min(maxQuantity, prev + 1));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      className="p-2 shadow-sm"
                      color="primary"
                      variant="shadow"
                      isDisabled={
                        selectedItem.quantity === 0 || 
                        (selectedItem.options?.length > 0 && 
                          (!selectedOption || 
                            (selectedOption && selectedItem.options.find(opt => opt.name === selectedOption)?.quantity === 0))
                        )
                      }
                      onClick={() => {
                        if (!selectedItem) return;
                        
                        const itemToAdd = selectedItem.options?.length > 0 && selectedOption
                          ? {
                              ...selectedItem,
                              name: selectedOption,
                              price: selectedItem.options.find(opt => opt.name === selectedOption)?.price || selectedItem.price,
                              cartQuantity: modalQuantity,
                              brand: selectedItem.brand_name,
                              isOption: true,
                              optionId: selectedItem.options.find(opt => opt.name === selectedOption)?.id,
                              originalName: selectedItem.name
                            }
                          : {
                              ...selectedItem,
                              cartQuantity: modalQuantity,
                              brand: selectedItem.brand_name
                            };

                        const success = addToCart(itemToAdd);
                        if (success) {
                          toast.success('Added to Cart', {
                            description: `${itemToAdd.cartQuantity}x ${itemToAdd.name} added to your cart`,
                            duration: 2500,
                            style: {
                              background: '#18181b',
                              color: '#fff',
                            },
                          });
                          handleModalClose();
                        } else {
                          toast.error('Already in Cart', {
                            description: `${itemToAdd.name} is already in your cart`,
                            duration: 2500,
                            style: {
                              background: '#18181b',
                              color: '#fff',
                            },
                          });
                        }
                      }}
                    >
                      {selectedItem.quantity === 0 
                        ? 'Out of Stock' 
                        : selectedItem.options?.length > 0 && !selectedOption
                          ? 'Select Option'
                          : selectedItem.options?.length > 0 && selectedOption && 
                            selectedItem.options.find(opt => opt.name === selectedOption)?.quantity === 0
                            ? 'Out of Stock'
                            : 'Add to Cart'}
                    </Button>
                  </div>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};