import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { ThemeSwitch } from "@/hooks/theme-switch";
import { BasketIcon, AccountIcon } from "@/config/icons";
import { useCart } from "@/contexts/CartContext";
import { AccountDrawer } from "@/components/drawers/AccountDrawer";
import { BasketDrawer } from "@/components/drawers/BasketDrawer";
import { InfoDrawer } from "@/components/drawers/InfoDrawer";
import { Drawer, DrawerContent, DrawerBody, Divider, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { useDisclosure } from "@heroui/react";
import { useAccountDrawer } from "@/contexts/AccountDrawerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";

export const VerticalNav = () => {
  const { isOpen, onOpenChange } = useDisclosure();
  const { isOpen: isAccountDrawerOpen, setIsOpen: handleAccountDrawerOpenChange } = useAccountDrawer();
  const { isOpen: isBasketDrawerOpen, onOpen: onBasketDrawerOpen, onOpenChange: onBasketDrawerOpenChange } = useDisclosure();
  const { isOpen: isInfoDrawerOpen, onOpen: onInfoDrawerOpen, onOpenChange: onInfoDrawerOpenChange } = useDisclosure();
  const { cart } = useCart();

  const { isDark } = useTheme();

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      onInfoDrawerOpen();
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  return (
    <>
      {/* Mobile and Desktop Nav */}
      <div className='fixed md:relative md:h-full border-b sm:border-r border-default-100/50 transition-all duration-300 w-full md:w-20 pt-2 md:p-4 md:shadow-lg'>
        <div className="flex flex-row md:flex-col gap-4 items-center justify-between px-2 h-full md:pb-4">
          <div className="flex flex-row md:flex-col justify-between h-full">
            <div className="flex md:flex-col">
              <div className="hidden md:flex md:flex-col items-center gap-2">
                <img 
                  src="/icon.png" 
                  alt="Logo" 
                  className="h-12 w-auto object-contain m-2 p-2" 
                />
                <Divider className="mb-2"></Divider>
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:flex md:flex-col gap-2">
                <Button
                  isIconOnly
                  variant="light"
                  className="w-14 h-14 rounded-lg hover:bg-opacity-0 transition-colors"
                  onClick={() => handleAccountDrawerOpenChange(true)}
                  aria-label="Open account"
                >
                  <AccountIcon className="text-default-500 w-7 h-7" />
                </Button>
                <div className="relative">
                  <Button
                    isIconOnly
                    variant="light"
                    className="w-14 h-14 rounded-lg hover:bg-opacity-0 transition-colors"
                    onClick={onBasketDrawerOpen}
                    aria-label="Open basket"
                  >
                    <BasketIcon className="text-default-500 w-7 h-7" />
                  </Button>
                  {cart.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {cart.length}
                    </div>
                  )}
                </div>
                <Button
                  isIconOnly
                  variant="light"
                  className="w-14 h-14 rounded-lg hover:bg-opacity-0 transition-colors"
                  onClick={onInfoDrawerOpen}
                  aria-label="Information"
                >
                  <svg 
                    className="text-default-500 w-7 h-7" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </Button>
              </div>

              {/* Mobile View - Dropdown */}
              <div className="md:hidden">
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      variant="light"
                      className="w-14 h-14 rounded-lg hover:bg-opacity-0 transition-colors"
                      aria-label="Menu"
                    >
                      <svg 
                        className="text-default-500 w-7 h-7" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M4 6h16M4 12h16m-7 6h7"
                        />
                      </svg>
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Navigation menu">
                  <DropdownItem
                      key="info"
                      startContent={
                        <svg 
                          className="text-default-500 w-5 h-10" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      }
                      onClick={onInfoDrawerOpen}
                    >
                      Information
                    </DropdownItem>
                    <DropdownItem
                      key="account"
                      startContent={<AccountIcon className="text-default-500 w-5 h-10" />}
                      onClick={() => handleAccountDrawerOpenChange(true)}
                    >
                      Account
                    </DropdownItem>
                    <DropdownItem
                      key="basket"
                      startContent={
                        <div className="relative">
                          <BasketIcon className="text-default-500 w-5 h-10" />
                          {cart.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                              {cart.length}
                            </div>
                          )}
                        </div>
                      }
                      onClick={onBasketDrawerOpen}
                    >
                      Basket
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center justify-center">
              <ThemeSwitch/>
            </div>
          </div>

          {/* Center - Logo */}
          <div className="md:hidden flex items-center justify-center">
            <img 
              src="/icon.png" 
              className="h-12 w-auto object-contain m-0 p-0" 
            />
          </div>

          <div className="md:hidden pr-4 sm:pr-0">
            <ThemeSwitch />
          </div>
        </div>
      </div>

      {/* Desktop Drawer */}
      <Drawer 
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="left"
        backdrop="blur"
        size="xs"
      >
        <DrawerContent className="bg-background/70 backdrop-blur-lg">
          <DrawerBody className="p-4">
            <div className="flex flex-col h-full">
              {/* Navigation Items */}
              <div className="flex flex-col gap-4 mt-12">
                <Button
                  as={Link}
                  size="sm"
                  variant="light"
                  className="text-sm font-medium text-left rounded-sm hover:bg-opacity-0 transition-colors"
                  onClick={onBasketDrawerOpen}
                >
                  <div className="flex items-center gap-2">
                    <BasketIcon className="text-default-500" />
                    <span>Basket</span>
                    {cart.length > 0 && (
                      <div className="bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                        {cart.length}
                      </div>
                    )}
                  </div>
                </Button>

                <Button
                  as={Link}
                  size="sm"
                  variant="light"
                  className="text-sm font-medium rounded-sm hover:bg-opacity-0 transition-colors"
                  onClick={() => handleAccountDrawerOpenChange(true)}
                >
                  <div className="flex items-center gap-2">
                    <AccountIcon className="text-default-500" />
                    <span>Account</span>
                  </div>
                </Button>
              </div>

              {/* Theme Switch */}
              <div className="mt-auto">
                <ThemeSwitch />
              </div>
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <AccountDrawer 
        isOpen={isAccountDrawerOpen} 
        onOpenChange={handleAccountDrawerOpenChange} 
      />
      
      <BasketDrawer 
        isOpen={isBasketDrawerOpen} 
        onOpenChange={onBasketDrawerOpenChange}
      />
      <InfoDrawer 
        isOpen={isInfoDrawerOpen} 
        onOpenChange={onInfoDrawerOpenChange}
      />
    </>
  );
};
