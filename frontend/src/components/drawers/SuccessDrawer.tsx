import { Drawer, DrawerContent, ScrollShadow, DrawerBody, DrawerHeader, DrawerFooter, Button, Spinner, Divider, Image } from "@heroui/react";
import { useState, useEffect } from "react";
import { useAccountDrawer } from "@/contexts/AccountDrawerContext";
import { config } from "@/config/config"

const API_URL = config.API_URL

interface OrderDetails {
  delivery_option: 'delivery' | 'collection';
  original_total: string;
  final_total: string;
  discount_value: string;
  contact_details: {
    email: string;
    name: string;
    phone: string;
  };
  free_mug: boolean;
  free_magnet: boolean;
  shipping?: {
      address: {
        city: string;
        country: string;
        line1: string;
        line2?: string;
        postal_code: string;
      };
      name: string;
    shipping_cost: number;
  };
  payment: {
    amount: number;
    currency: string;
    status: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    display_name: string;
    image_url: string;
    item_name: string;
    brand_name: string;
  }>;
}

interface SuccessDrawerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sessionId: string | null;
}

export const SuccessDrawer = ({ isOpen, setIsOpen, sessionId }: SuccessDrawerProps) => {
  const { setIsOpen: setAccountDrawerOpen, setView, setSelectedOrderId } = useAccountDrawer();

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) return;

      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');

        // First get the order ID from the session
        const sessionResponse = await fetch(`${API_URL}/stripe/session/${sessionId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!sessionResponse.ok) {
          throw new Error('Failed to fetch session details');
        }

        const { orderID } = await sessionResponse.json();
        if (!orderID) {
          throw new Error('No order ID found');
        }

        // Then get the order details using the order ID
        const orderResponse = await fetch(`${API_URL}/orders/${orderID}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order details');
        }

        const order = await orderResponse.json();
        setOrderDetails({
          ...order,
          contact_details: {
            name: `${order.firstname} ${order.lastname}`,
            email: order.email,
            phone: order.phone_number
          },
          shipping: order.delivery_option === 'delivery' ? {
            name: `${order.firstname} ${order.lastname}`,
            address: {
              line1: order.address_line1,
              line2: order.address_line2,
              city: order.city,
              postal_code: order.postcode
            }
          } : undefined
        });
       
      } catch (err) {
        setError('Could not load order details');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && sessionId) {
      fetchOrderDetails();
    }
  }, [isOpen, sessionId]);

  const handleViewOrder = () => {
    if (sessionId) {
      setIsOpen(false);
      setView('account');
      setSelectedOrderId(sessionId);
      setAccountDrawerOpen(true); 
      setTimeout(() => {
        // Wait for orders to be fetched before opening modal
        const openOrderModal = document.querySelector('[data-open-order-modal]') as HTMLButtonElement;
        if (openOrderModal) {
          openOrderModal.click();
        }
      }, 500);
    }
  };

  const handleDrawerClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Clear the URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  return (
    <Drawer backdrop="blur" placement="left" isOpen={isOpen} onOpenChange={handleDrawerClose}>
      <DrawerContent className="h-[100dvh] bg-background/70 backdrop-blur-lg">
        <DrawerHeader className="flex justify-center mb-0">
          <div className="flex flex-col justify-center items-center text-center py-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <div className="text-green-500 text-3xl">✓</div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Thank you for your order!</h3>
              <p className="text-gray-600">Your order has been placed successfully.</p>
              <p className="text-sm text-default-500 font-normal my-2">A confirmation email has been sent to: {orderDetails?.contact_details.email}</p>
            </div>
          </div>
        </DrawerHeader>
        <DrawerBody className="overflow-y-auto">
          <div className="h-full flex flex-col overflow-y-auto">
            {loading ? (
              <div className="flex-1 flex justify-center items-center">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="flex-1 flex justify-center items-center text-red-500 overflow-y-auto">{error}</div>
            ) : orderDetails && (
              <ScrollShadow className="h-full overflow-y-auto" hideScrollBar>
                {/* Desktop View - Full Item Details */}
                <div className="space-y-4">
                  {orderDetails.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 rounded-md">
                      <Image
                        src={item.image_url}
                        height={60}
                        width={60}
                        alt={item.display_name}
                        className="object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-default-900 truncate">{item.display_name}</h4>
                        <p className="text-default-500 text-sm">{item.brand_name}</p>
                        <p className="text-default-500 text-sm">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">£{(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              <div className="md:hidden">
                <Divider className="my-4"/>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>£{orderDetails?.original_total}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span>Shipping:</span>
                    <span>{orderDetails?.delivery_option === 'delivery' ? '£3.50' : 'Free'}</span>
                  </div>
                  {orderDetails.free_magnet || orderDetails.free_mug ? (
                    <div className="flex justify-between text-sm mt-2">
                      <div className="flex flex-col">
                        <span className="text-green-600">Promotions:</span>
                        <span className="text-green-600">{orderDetails.free_magnet? '+ Free Magnet' : ''}</span>
                        <span className="text-green-600">{orderDetails.free_mug? '+ Free Mug' : ''}</span>
                      </div>
                      {parseFloat(orderDetails.discount_value) > 0 ? (
                        <span className="text-green-600">-£{parseFloat(orderDetails.discount_value).toFixed(2)}</span>
                      ) : null }
                    </div>
                  ) : null}
                  <div className="flex justify-between font-medium mt-2">
                    <span>Total Paid:</span>
                    <span>£{parseFloat(orderDetails?.final_total).toFixed(2)}</span>
                  </div>
                </div>
                <Divider className=""/>
                <div className="flex gap-4 my-4">            
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Shipping Details</h4>
                    {orderDetails?.delivery_option === 'delivery' ? (
                      <div className="text-sm space-y-1 text-gray-600">
                        <p>{orderDetails?.shipping.name}</p>
                        <p>{orderDetails?.shipping.address.line1}</p>
                        <p>{orderDetails?.shipping.address.line2}</p>
                        <p>{orderDetails?.shipping.address.city}</p>
                        <p>{orderDetails?.shipping.address.postal_code}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Collection in store</p>
                    )}
                  </div>

                  <Divider orientation="vertical" />
                  
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">Contact Details</h4>
                    <div className="text-sm space-y-1 text-gray-600">
                      <p>{orderDetails?.contact_details.name}</p>
                      <p>{orderDetails?.contact_details.email}</p>
                      <p>{orderDetails?.contact_details.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
              </ScrollShadow>
            )}
          </div>
        </DrawerBody>

        <DrawerFooter className="mb-2 flex flex-col">
          {loading ? (
            ''
          ) : orderDetails && (
            <>
            <div className="hidden md:block">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>£{orderDetails?.original_total}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Shipping:</span>
                  <span>{orderDetails?.delivery_option === 'delivery' ? '£3.50' : 'Free'}</span>
                </div>
                {orderDetails.free_magnet || orderDetails.free_mug ? (
                  <div className="flex justify-between text-sm mt-2">
                    <div className="flex flex-col">
                      <span className="text-green-600">Promotions:</span>
                      <span className="text-green-600">{orderDetails.free_magnet? '+ Free Magnet' : ''}</span>
                      <span className="text-green-600">{orderDetails.free_mug? '+ Free Mug' : ''}</span>
                    </div>
                    {parseFloat(orderDetails.discount_value) > 0 ? (
                      <span className="text-green-600">-£{parseFloat(orderDetails.discount_value).toFixed(2)}</span>
                    ) : null }
                  </div>
                ) : null}
                <div className="flex justify-between font-medium mt-2">
                  <span>Total Paid:</span>
                  <span>£{parseFloat(orderDetails?.final_total).toFixed(2)}</span>
                </div>
              </div>
              <Divider className="mt-4"/>
              <div className="flex gap-4 my-4">            
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Shipping Details</h4>
                  {orderDetails?.delivery_option === 'delivery' ? (
                    <div className="text-sm space-y-1 text-gray-600">
                      <p>{orderDetails?.shipping.name}</p>
                      <p>{orderDetails?.shipping.address.line1}</p>
                      <p>{orderDetails?.shipping.address.line2}</p>
                      <p>{orderDetails?.shipping.address.city}</p>
                      <p>{orderDetails?.shipping.address.postal_code}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Collection in store</p>
                  )}
                </div>

                <Divider orientation="vertical" />
                
                <div className="flex-1">
                  <h4 className="font-medium mb-2">Contact Details</h4>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p>{orderDetails?.contact_details.name}</p>
                    <p>{orderDetails?.contact_details.email}</p>
                    <p>{orderDetails?.contact_details.phone}</p>
                  </div>
                </div>
              </div>
            </div>
              <div className="flex flex-row gap-2">
                <Button onClick={handleViewOrder} className="w-full" color="primary" variant="shadow">
                  View Order
                </Button>
                <Button onClick={() => setIsOpen(false)} variant="ghost" className="w-full">
                  Continue Shopping
                </Button>
              </div>

            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};