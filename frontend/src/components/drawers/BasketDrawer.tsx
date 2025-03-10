import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Divider, Image, ScrollShadow, RadioGroup, Card, CardBody, Button } from "@heroui/react";
import { useCart } from "@/contexts/CartContext";
import { usePromotions } from "@/contexts/PromotionsContext";
import { useState, useEffect } from "react";
import { AccountDrawer } from './AccountDrawer';
import { config } from "@/config/config"

const API_URL = config.API_URL

interface BasketDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const image_url = `s3-bucket-image-url`;

const DELIVERY_COST = 3.50;

type DeliveryOption = 'collection' | 'delivery';

export const BasketDrawer = ({ isOpen, onOpenChange }: BasketDrawerProps) => {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const { promotions, getActivePromotions, calculateDiscount, getFreebies } = usePromotions();
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('collection');
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [showDeliveryScreen, setShowDeliveryScreen] = useState(false);
  const [showImageSquares, setShowImageSquares] = useState(true);

  useEffect(() => {
    localStorage.setItem("basket", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const checkHeight = () => {
      setShowImageSquares(window.innerHeight > 667);
    };

    checkHeight();
    window.addEventListener('resize', checkHeight);
    return () => window.removeEventListener('resize', checkHeight);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const activePromotions = getActivePromotions(cartTotal);
  const discount = calculateDiscount(cartTotal);
  const freebies = getFreebies(cartTotal);
  const finalTotal = cartTotal - discount + (deliveryOption === 'delivery' ? DELIVERY_COST : 0);

  // Calculate next promotion threshold
  const getNextPromotionThreshold = () => {
    const nextPromo = promotions
      .filter(promo => cartTotal < promo.minSpend)
      .sort((a, b) => a.minSpend - b.minSpend)[0];
    
    return nextPromo ? {
      amount: nextPromo.minSpend - cartTotal,
      description: nextPromo.type === 'freebie' ? 
        `to get a free ${nextPromo.value}` : 
        `to get ${nextPromo.value}% off`
    } : null;
  };

  const nextPromo = getNextPromotionThreshold();

  const handleCheckout = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowAccountDrawer(true);
      return;
    }

    setIsRedirectingToStripe(true);

    // Format cart items for the server
    const formattedItems = cart.map(item => ({
      id: item.id,
      optionId: item.isOption? item.optionId: null,
      isOption: item.isOption? item.isOption: null,
      name: item.name,
      price: item.price,
      quantity: item.cartQuantity,
      image: getImageUrl(item),
    }));

    const requestBody = {
      items: formattedItems,
      delivery: deliveryOption
    };

    //return
    const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody)
      
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      setIsRedirectingToStripe(false);
      return;
    }

    if (!response.ok) {
      setIsRedirectingToStripe(false);
      return;
    }

    window.location.href = data.url;
  };

  const formatNameForURL = (name: string) => {
    return encodeURIComponent(name)
      .trim()
      .replace(/%22/g, "")
      .replace(/%2C/g, ",")
      .replace(/%20/g, "+")
      .replace(/%26/g, "&")
      .replace(/%2F/g, "-")
      .replace(/\+-\+/g, "+")
      .replace(/%23/g, "#")
      .replace(/'/g, "");
  };

  const getImageUrl = (item: any) => {
    if (!item.id) return '';
    
    const itemName = formatNameForURL(item.name);
    if (item.id && typeof item.id === 'number') {
      return `${image_url}${itemName}.webp`;
    }
    return `${image_url}${itemName}.webp`;
  };

  return (
    <>
    
      <Drawer backdrop="blur" isOpen={isOpen} onOpenChange={onOpenChange} placement="left">
        <DrawerContent className="bg-background/80 backdrop-blur-lg overflow-hidden">
        
          <DrawerHeader className="flex flex-col mb-0 pb-0">
            {showDeliveryScreen && (
              <Button
                variant="light"
                className="self-start p-0"
                onPress={() => setShowDeliveryScreen(false)}
              >
                ← Back to Basket
              </Button>
            )}
          </DrawerHeader>
          <DrawerBody>
            <div className="flex flex-col h-full">
              <div>
                <h2 className="text-2xl font-semibold">{showDeliveryScreen ? 'Delivery Method' : 'Your Basket'}</h2>
                <p className="text-default-500 font-normal text-md">
                  {showDeliveryScreen ? `Select how you'd like to receive your order`: 'Review and manage your items'}
                </p>
              </div>
              <Divider className="my-4"/>

              {cart.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-default-500">Your basket is empty.</p>
                    <p className="text-sm text-default-400">Add items to your basket to see them here.</p>
                  </div>
                </div>
              ) : (
                <>
                  <ScrollShadow hideScrollBar className={`space-y-4 px-1 mb-4 ${showDeliveryScreen ? 'hidden md:block' : 'flex-1'}`}>
                    {cart.map((item) => (
                      <Card 
                        key={item.id}
                        className=" w-full"
                      >
                        <CardBody className="p-4">
                          <div className="flex flex-col gap-4">
                            {/* Item Header */}
                            <div className="flex justify-between items-start">
                              <div className="flex gap-4">
                                <Image
                                  className="object-cover object-center rounded-sm"
                                  radius="sm"
                                  shadow="sm"
                                  width="50px"
                                  height="50px"
                                  src={getImageUrl(item)}
                                  alt={item.name}
                                />
                                <div>
                                  <p className="font-medium line-clamp-1">{item.name}</p>
                                  <p className="text-sm text-default-500">
                                    {new Intl.NumberFormat("en-GB", {
                                      style: "currency",
                                      currency: "GBP",
                                    }).format(item.price)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {new Intl.NumberFormat("en-GB", {
                                    style: "currency",
                                    currency: "GBP",
                                  }).format(item.price * item.cartQuantity)}
                                </p>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-200"></div>

                            {/* Item Actions */}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  color="danger"
                                  size="sm"
                                  onPress={() => removeFromCart(item.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  isDisabled={item.cartQuantity <= 1}
                                  onPress={() => updateQuantity(item.id, item.cartQuantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center">{item.cartQuantity}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  isDisabled={item.cartQuantity >= item.quantity}
                                  onPress={() => updateQuantity(item.id, item.cartQuantity + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </ScrollShadow>
                  {showDeliveryScreen && showImageSquares && (
                    <ScrollShadow orientation="horizontal" hideScrollBar className="hidden overflow-x-auto overflow-y-hidden h-[180px]">
                      <div className="flex gap-3 p-2">
                        {cart.map((item) => (
                          <Card key={item.id} className="relative bg-transparent shadow-none w-[120px]">
                            <Image
                              className="object-cover object-center rounded-lg"
                              width={120}
                              height={120}
                              src={getImageUrl(item)}
                              alt={item.name}
                            />
                            <p className="line-clamp-1 text-sm mt-1">{item.name}</p>
                            <p className="text-default-400 text-sm">Qty: {item.cartQuantity}</p>
                          </Card>
                        ))}
                      </div>
                    </ScrollShadow>
                  )}
                  {showDeliveryScreen ? (
                    <div className="flex flex-col flex-1">
                      <div className="mb-6">
                        <RadioGroup 
                          value={deliveryOption}
                          onValueChange={(value) => setDeliveryOption(value as DeliveryOption)}
                          className="flex flex-col gap-4 z-50"
                        >
                          <label className="flex items-center gap-3 ">
                            <input
                              type="radio"
                              name="deliveryOption"
                              value="collection"
                              checked={deliveryOption === 'collection'}
                              onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)}
                              className="form-radio text-primary"
                            />
                            <div>
                              <div className="font-medium">Collect in Person</div>
                              <div className="text-sm text-gray-500">Free - Pick up from store</div>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 ">
                            <input
                              type="radio"
                              name="deliveryOption"
                              value="delivery"
                              checked={deliveryOption === 'delivery'}
                              onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)}
                              className="form-radio text-primary"
                            />
                            <div>
                              <div className="font-medium">Delivery</div>
                              <div className="text-sm text-gray-500">£3.50 - Delivered to your address</div>
                            </div>
                          </label>
                        </RadioGroup>
                      </div>
                      <div className="mt-auto mb-4">
                        <div className="space-y-3 mb-6 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>
                              {new Intl.NumberFormat("en-GB", {
                                style: "currency",
                                currency: "GBP",
                              }).format(cartTotal)}
                            </span>
                          </div>
                          {freebies.length > 0 && (
                            <div className="flex justify-between text-sm text-success-600">
                              <div>
                                <span>Promotions</span>
                                {freebies.length > 0 && (
                                  <p className="text-success-600 text-sm">
                                    + {freebies.join(' & ')}
                                  </p>
                                )}
                              </div> 
                              {discount > 0 && (
                                <span>
                                  -{new Intl.NumberFormat("en-GB", {
                                    style: "currency",
                                    currency: "GBP",
                                  }).format(discount)}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Delivery</span>
                            <span>{deliveryOption === 'delivery' ? `£${DELIVERY_COST.toFixed(2)}` : 'Free'}</span>
                          </div>
                          <Divider className="my-2"/>
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <div>
                              <span>
                                {new Intl.NumberFormat("en-GB", {
                                  style: "currency",
                                  currency: "GBP",
                                }).format(finalTotal)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="shadow"
                          className="w-full"
                          color="primary"
                          onClick={handleCheckout}
                          disabled={cart.length === 0 || isRedirectingToStripe}
                          isLoading={isRedirectingToStripe}
                        >
                          {isRedirectingToStripe 
                            ? 'Redirecting to Stripe...' 
                            : localStorage.getItem('token') 
                              ? 'Proceed to Payment' 
                              : 'Sign in or Sign up to Continue'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto mb-4">
                      <div className="sm:hidden space-y-3 mb-4 rounded-lg">
                        <Divider className="my-2"/>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: "GBP",
                            }).format(cartTotal)}
                          </span>
                        </div>
                        {freebies.length > 0 && (
                          <div className="flex justify-between text-sm text-success-600">
                            <div>
                              <span>Promotions</span>
                              {freebies.length > 0 && (
                                <p className="text-success-600 text-sm">
                                  + {freebies.join(' & ')}
                                </p>
                              )}
                            </div> 
                            {discount > 0 && (
                              <span>
                                -{new Intl.NumberFormat("en-GB", {
                                  style: "currency",
                                  currency: "GBP",
                                }).format(discount)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <div>
                            <span>
                              {new Intl.NumberFormat("en-GB", {
                                style: "currency",
                                currency: "GBP",
                              }).format(finalTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="shadow"
                        className="w-full md:hidden"
                        color="primary"
                        onClick={() => setShowDeliveryScreen(true)}
                        disabled={cart.length === 0}
                      >
                        Delivery & Checkout
                      </Button>
                      <div className="hidden md:block">
                        <div className="mb-4">
                          <label className="text-sm font-medium mb-2 block">Delivery Options</label>
                          <RadioGroup 
                            value={deliveryOption}
                            onValueChange={(value) => setDeliveryOption(value as DeliveryOption)}
                            className="flex flex-row gap-3"
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="deliveryOption"
                                value="collection"
                                checked={deliveryOption === 'collection'}
                                onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)}
                                className="form-radio text-primary"
                              />
                              <div>
                                <div className="font-medium">Collect in Person</div>
                                <div className="text-sm text-gray-500">Free - Pick up from store</div>
                              </div>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="deliveryOption"
                                value="delivery"
                                checked={deliveryOption === 'delivery'}
                                onChange={(e) => setDeliveryOption(e.target.value as DeliveryOption)}
                                className="form-radio text-primary"
                              />
                              <div>
                                <div className="font-medium">Delivery</div>
                                <div className="text-sm text-gray-500">£3.50 - Delivered to your address</div>
                              </div>
                            </label>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>
                              {new Intl.NumberFormat("en-GB", {
                                style: "currency",
                                currency: "GBP",
                              }).format(cartTotal)}
                            </span>
                          </div>
                          {freebies.length > 0 && (
                            <div className="flex justify-between text-sm text-success-600">
                              <div>
                                <span>Promotions</span>
                                {freebies.length > 0 && (
                                  <p className="text-success-600 text-sm">
                                    + {freebies.join(' & ')}
                                  </p>
                                )}
                              </div> 
                              {discount > 0 && (
                                <span>
                                  -{new Intl.NumberFormat("en-GB", {
                                    style: "currency",
                                    currency: "GBP",
                                  }).format(discount)}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Delivery</span>
                            <span>{deliveryOption === 'delivery' ? `£${DELIVERY_COST.toFixed(2)}` : 'Free'}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <div>
                              <span>
                                {new Intl.NumberFormat("en-GB", {
                                  style: "currency",
                                  currency: "GBP",
                                }).format(finalTotal)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="shadow"
                          className="w-full"
                          color="primary"
                          onClick={handleCheckout}
                          disabled={cart.length === 0 || isRedirectingToStripe}
                          isLoading={isRedirectingToStripe}
                        >
                          {isRedirectingToStripe 
                            ? 'Redirecting to Stripe...' 
                            : localStorage.getItem('token') 
                              ? 'Checkout' 
                              : 'Sign in or Sign up to Checkout'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      {showAccountDrawer && (
        <AccountDrawer 
          isOpen={showAccountDrawer} 
          onOpenChange={(open) => {
            setShowAccountDrawer(open);
            // If drawer is closing and user is logged in, try checkout again
            if (!open && localStorage.getItem('token')) {
              setTimeout(() => handleCheckout(), 100); // Add a small delay to ensure state updates
            }
          }} 
          fromCheckout={true}
          returnToBasket={true}
        />
      )}
    </>
  );
};