import { useState, useEffect, useRef, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from "@heroui/react";
import { Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, ScrollShadow, Divider } from "@heroui/react";
import { Card, CardBody, Image } from "@heroui/react";
import { toast } from 'sonner';
import { useAccountDrawer } from "@/contexts/AccountDrawerContext";
import { useAuth } from "@/contexts/AuthContext";
import { config } from "@/config/config"

const API_URL = config.API_URL

interface Order {
  order_id: string;
  order_status: 'pending' | 'processed' | 'cancelled';
  items: any[];
  total_price: number;
  final_total: number;
  original_total: number;
  discount_value: string;
  order_date: Date;
  free_mug: boolean;
  free_magnet: boolean;
  created_at: string;
  status:string;
  delivery_option: string;
  delivery_date?: string;
  contact_details: {
    name: string;
    email: string;
    phone: string;
  };
  shipping_address?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
  };
}

interface AccountDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  fromCheckout?: boolean;
  returnToBasket?: boolean;
}

export const AccountDrawer = ({ isOpen, onOpenChange, fromCheckout = false, returnToBasket = false }: AccountDrawerProps) => {
  const { view, setView, selectedOrderId } = useAccountDrawer();
  const { validateToken } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { isOpen: isOrderModalOpen, onOpen: openOrderModal, onClose: closeOrderModal } = useDisclosure();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);

  const [email, setEmail] = useState(""); // Track email input
  const [firstname, setFirstName] = useState(""); // Track first name input for signup
  const [lastname, setLastName] = useState(""); // Track last name input for signup
  const [password, setPassword] = useState(""); // Track the password input
  const [currentPassword, setCurrentPassword] = useState(""); // Track the password input
  const [confirmPassword, setConfirmPassword] = useState(""); // Track the confirm password input
  const [newPassword, setNewPassword] = useState(""); // Track the new password input for "Change Password"
  const [confirmNewPassword, setConfirmNewPassword] = useState(""); // Track the confirm new password input for "Change Password"
  const [orders, setOrders] = useState<Order[]>([]); // Track fetched orders
  const [userFirstname, setUserFirstname] = useState(""); // Track the user's first name
  const [isAccountActionsMenuOpen, setIsAccountActionsMenuOpen] = useState(false);

  // Password validation rules for "Sign Up"
  const passwordRules = {
    minLength: password.length >= 8 && password !== "",
    hasNumber: /\d/.test(password) && password !== "",
    hasUpperCase: /[A-Z]/.test(password) && password !== "",
    passwordsMatch: password === confirmPassword && password !== "" && confirmPassword !== "",
  };

  // Password validation rules for "Change Password"
  const newPasswordRules = {
    minLength: newPassword.length >= 8 && newPassword !== "",
    hasNumber: /\d/.test(newPassword) && newPassword !== "",
    hasUpperCase: /[A-Z]/.test(newPassword) && newPassword !== "",
    passwordsMatch: newPassword === confirmNewPassword && newPassword !== "" && confirmNewPassword !== "",
  };

  // Function to capitalize first letter
  const capitalizeFirstLetter = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Fetch function for login
  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/account/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message;
        } catch {
          errorMessage = text;
        }
        throw new Error(errorMessage || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      const capitalizedFirstname = capitalizeFirstLetter(data.user.firstname);
      localStorage.setItem("firstname", capitalizedFirstname);
      setUserFirstname(capitalizedFirstname);
      handleLoginSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Fetch function for signup
  const handleSignup = async () => {
    try {
      const response = await fetch(`${API_URL}/account/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstname,
          lastname,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message;
        } catch {
          errorMessage = text;
        }
        throw new Error(errorMessage || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      const capitalizedFirstname = capitalizeFirstLetter(data.user.firstname);
      localStorage.setItem("firstname", capitalizedFirstname);
      setUserFirstname(capitalizedFirstname);
      handleRegistrationSuccess();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Fetch function for changing password
  const handleChangePassword = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/account`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }

      await response.json();
      toast.success('Password changed successfully');
      setView("account");
      // Reset form fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password. Please check your current password and try again.');
    }
  };

  // Fetch function for getting orders
  const handleGetOrders = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch orders. Please try again.");
      }

      const data = await response.json();
      // Restructure the orders with organized details
      const ordersObject = data.reduce((acc: any, order: any) => {
        const formattedName = `${(order.firstname?.charAt(0).toUpperCase() + order.firstname?.slice(1) || '')} ${(order.lastname?.charAt(0).toUpperCase() + order.lastname?.slice(1) || '')}`.trim();
        
        acc[order.order_id] = {
          order_id: order.order_id,
          order_date: order.order_date,
          original_total: order.original_total,
          final_total: order.final_total,
          free_mug: order.free_mug,
          free_magnet: order.free_magnet,
          discount_value: order.discount_value,
          delivery_option: order.delivery_option,
          status: order.status,
          contact_details: {
            name: formattedName,
            email: order.email,
            phone: order.phone_number
          },
          shipping_address: order.delivery_option === 'delivery' ? {
            name: formattedName,
            line1: order.address_line1,
            line2: order.address_line2,
            city: order.city,
            county: order.county,
            postcode: order.postcode
          } : null,
          items: order.items.map((item: any) => ({
            ...item,
            name: item.display_name || item.item_name,
            brand: item.brand_name,
            image_url: item.image_url
          }))
        };
        return acc;
      }, {});

      setOrders(ordersObject);
    } catch (error) {
      console.error("Get orders error:", error);
    }
  };

  // Fetch function for deleting account
  const handleDeleteAccount = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` // Fixed: Removed backticks around the key
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete account. Please check your password.");
      }
      toast.success(`Account deleted successfully.`);
      localStorage.removeItem("token");
      localStorage.removeItem("firstname");
      setView("login"); // Redirect to login view after account deletion
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("firstname");
    setUserFirstname("");
    validateToken(); // This will reset isAdmin to false
    setView("login");
    toast.success('Logged out successfully', {
      duration: 2500,
      style: {
        background: '#18181b',
        color: '#fff',
      },
    });
  };

  const handleLoginSuccess = () => {
    validateToken();
    setView("account");
    setEmail("");
    setPassword("");
    toast.success(`Login Successful. Weclome, ${capitalizeFirstLetter(localStorage.getItem("firstname") || "")}!`);
    if (fromCheckout) {
      setTimeout(() => onOpenChange(false), 0);
    }
  };

  const handleRegistrationSuccess = () => {
    validateToken();
    setView("account");
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    toast.success(`Registration Successful. Weclome, ${capitalizeFirstLetter(localStorage.getItem("firstname") || "")}!`);
    if (fromCheckout) {
      setTimeout(() => onOpenChange(false), 0);
    }
  };

  // Fetch function for cancelling order
  const handleCancelOrder = async (orderId: string) => {
    setIsCancelling(true);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel order");
      }

      // Show success message and refresh orders
      setShowCancelConfirm(false);
      setShowCancelSuccess(true);
      
      // Update the order status in the local state immediately
      setOrders(prevOrders => {
        const updatedOrders = { ...prevOrders };
        if (updatedOrders[orderId]) {
          updatedOrders[orderId] = {
            ...updatedOrders[orderId],
            status: 'cancelled'
          };
        }
        return updatedOrders;
      });

      // Fetch fresh data from the server
      await handleGetOrders();
      
      // Auto close success message after 5 seconds
      setTimeout(() => {
        setShowCancelSuccess(false);
        setSelectedOrder(null);
      }, 5000);
    } catch (error) {
      toast.error('Failed to cancel order');
    } finally {
      setIsCancelling(false);
      setCancelOrderId(null);
    }
  };

  const openCancelConfirm = (orderId: string) => {
    setCancelOrderId(orderId);
    setShowCancelConfirm(true);
  };

  // UseEffect to validate token on component mount
  useEffect(() => {
    validateToken();
  }, [validateToken]);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      setView("account");
      const storedFirstname = localStorage.getItem("firstname");
      if (storedFirstname) {
        setUserFirstname(storedFirstname);
      }
    } else {
      setView("login");
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      setView("account");
      const storedFirstname = localStorage.getItem("firstname");
      if (storedFirstname) {
        setUserFirstname(storedFirstname);
      }
    } else {
      setView("login");
    }
  }, [localStorage.getItem("token")]);

  useEffect(() => {
    if (view === 'account' && localStorage.getItem("token")) {
      handleGetOrders();
    }
  }, [view]);

  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const order = Object.values(orders).find(order => order.order_id === selectedOrderId);
      if (order) {
        setSelectedOrder(order);
        openOrderModal();
      }
    }
  }, [selectedOrderId, orders]);

  // Reset view when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setView("account");
    }
  }, [isOpen]);

  // Reset all input fields when view changes or drawer opens/closes
  useEffect(() => {
    // Reset all form fields
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setConfirmNewPassword("");
  }, [view, isOpen]);

  // Check authentication status when drawer opens
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem("token");
      const firstname = localStorage.getItem("firstname");
      if (token && firstname) {
        setUserFirstname(firstname);
        setView("account");
      } else {
        setUserFirstname("");
        setView("login");
      }
    }
  }, [isOpen]);

  // Initial auth check
  useEffect(() => {
    const token = localStorage.getItem("token");
    const firstname = localStorage.getItem("firstname");
    if (token && firstname) {
      setUserFirstname(firstname);
      if (view === "login") {
        setView("account");
      }
    } else {
      setUserFirstname("");
      if (view === "account") {
        setView("login");
      }
    }
  }, []);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    }
  }, []);

  return (
    <Drawer backdrop="blur" isOpen={isOpen} placement="left" onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background/80 backdrop-blur-lg">
        {() => (
          <>
            {/* Header */}
            <DrawerHeader className="flex flex-col mb-0 pb-0">
              {view === "login"}
              {view === "signup"}
              {view === "account"}
              {view === "changePassword"}
              {view === "viewOrders"}
            </DrawerHeader>

            {/* Body */}
            <DrawerBody className="scrollbar-hide">
              {view === "login" && (
                <>
                  <div className="">
                    <h2 className="text-2xl font-semibold">Log In</h2>
                    <p className="text-default-500">Sign in to your account.</p>
                  </div>
                  <Divider className="my-1"/>
                  <form 
                    className="flex flex-col gap-4 p-2 py-3 h-auto"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleLogin();
                    }}
                  >
                    <Input
                      label="Email"
                      placeholder="Enter your email"
                      variant="bordered"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                    />
                    <Input
                      label="Password"
                      placeholder="Enter your password"
                      type="password"
                      variant="bordered"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Divider className="my-1"/>
                    <Button
                      color="primary"
                      variant="shadow"
                      type="submit"
                    >
                      Log In
                    </Button>
                    <Button
                      color="default"
                      variant="ghost"
                      type="button"
                      onPress={() => setView(view === "login" ? "signup" : "login")}
                    >
                      Don't have an account? Sign Up
                    </Button>
                  </form>
                </>
              )}
              {view === "signup" && (
                <>
                  <div className="">
                    <h2 className="text-2xl font-semibold">Sign Up</h2>
                    <p className="text-default-500">Create an account to create & view orders.</p>
                  </div>
                  <Divider className="my-1"/>
                  <form 
                    className="flex flex-col gap-4 p-2 py-3 overscroll-none top-0 "
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSignup();
                    }}
                  >
                    <div className="flex flex-row gap-2">
                      <Input
                        ref={firstNameRef}
                        label="First Name"
                        placeholder="John"
                        variant="bordered"
                        value={firstname}
                        onChange={(e) => setFirstName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, lastNameRef)}
                        autoComplete="given-name"
                      />
                      <Input
                        ref={lastNameRef}
                        label="Last Name"
                        placeholder="Doe"
                        variant="bordered"
                        value={lastname}
                        onChange={(e) => setLastName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, emailRef)}
                        autoComplete="family-name"
                      />
                    </div>
                    <Input
                      ref={emailRef}
                      type="email"
                      label="Email"
                      placeholder="you@example.com"
                      variant="bordered"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                      autoComplete="email"
                    />
                    <Input
                      ref={passwordRef}
                      type="password"
                      label="Password"
                      placeholder="Enter your password"
                      variant="bordered"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, confirmPasswordRef)}
                      autoComplete="new-password"
                    />
                    <Input
                      ref={confirmPasswordRef}
                      type="password"
                      label="Confirm Password"
                      placeholder="Confirm your password"
                      variant="bordered"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSignup();
                        }
                      }}
                      autoComplete="new-password"
                    />
                    <div>
                      <p>Password must contain:</p>
                      <p className={`text-sm ${passwordRules.minLength ? "text-green-500" : "text-red-500"}`}>
                        At least 8 characters
                      </p>
                      <p className={`text-sm ${passwordRules.hasNumber ? "text-green-500" : "text-red-500"}`}>
                        At least one number
                      </p>
                      <p className={`text-sm ${passwordRules.hasUpperCase ? "text-green-500" : "text-red-500"}`}>
                        At least one uppercase letter
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${passwordRules.passwordsMatch ? "text-green-500" : "text-red-500"}`}>
                        Passwords must match
                      </p>
                    </div>
                    <Button
                      color="primary"
                      variant="shadow"
                      type="submit"
                      isDisabled={
                        !passwordRules.minLength ||
                        !passwordRules.hasNumber ||
                        !passwordRules.hasUpperCase ||
                        !passwordRules.passwordsMatch
                      }
                    >
                      Sign Up
                    </Button>
                    <Button
                      color="default"
                      variant="ghost"
                      type="button"
                      onPress={() => setView("login")}
                    >
                      Already have an account? Log In
                    </Button>
                  </form>
                </>
              )}
              {view === "changePassword" && (
                <>
                  <div className="">
                    <h2 className="text-2xl font-semibold">Change Password</h2>
                    <p className="text-default-500">Update your account password.</p>
                  </div>
                  <Divider className="my-1"/>
                  <form 
                    className="flex flex-col gap-4 p-2 py-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleChangePassword();
                    }}
                  >
                    <Input
                      className="w-full"
                      label="Current Password"
                      placeholder="Enter your current password"
                      type="password"
                      variant="bordered"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <Input
                      className="w-full"
                      label="New Password"
                      placeholder="Enter your new password"
                      type="password"
                      variant="bordered"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <div className="w-full">
                      <p>New password must contain:</p>
                      <p className={`text-sm ${newPasswordRules.minLength ? "text-green-500" : "text-red-500"}`}>
                        At least 8 characters
                      </p>
                      <p className={`text-sm ${newPasswordRules.hasNumber ? "text-green-500" : "text-red-500"}`}>
                        At least one number
                      </p>
                      <p className={`text-sm ${newPasswordRules.hasUpperCase ? "text-green-500" : "text-red-500"}`}>
                        At least one uppercase letter
                      </p>
                    </div>
                    <Input
                      className="w-full"
                      label="Confirm New Password"
                      placeholder="Confirm your new password"
                      type="password"
                      variant="bordered"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                    <div className="w-full">
                      <p className={`text-sm ${newPasswordRules.passwordsMatch ? "text-green-500" : "text-red-500"}`}>
                        Passwords must match
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-4 w-full">
                      <Button
                        className="w-full"
                        color="primary"
                        variant="shadow"
                        type="submit"
                        isDisabled={
                          !newPasswordRules.minLength ||
                          !newPasswordRules.hasNumber ||
                          !newPasswordRules.hasUpperCase ||
                          !newPasswordRules.passwordsMatch
                        }
                      >
                        Save New Password
                      </Button>
                      <Button
                        className="w-full"
                        color="default"
                        variant="ghost"
                        type="button"
                        onPress={() => setView("account")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </>
              )}
              {view === "deleteAccount" && (
                <>
                  <div className="">
                    <h2 className="text-2xl font-semibold">Delete Account</h2>
                    <p className="text-default-500">This action cannot be undone.</p>
                  </div>
                  <form 
                    className="flex flex-col gap-4 p-2 py-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleDeleteAccount();
                    }}
                  >
                    <Divider className="my-1"/>
                    <Input
                      label="Password"
                      placeholder="Enter your password"
                      type="password"
                      variant="bordered"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div className="flex flex-col items-center gap-4 w-full">
                      <Button
                        className="w-full"
                        color="danger"
                        variant="shadow"
                        type="submit"
                        isDisabled={!password || password.length < 1}
                      >
                        Delete Account
                      </Button>
                      <Button
                        className="w-full"
                        variant="ghost"
                        type="button"
                        onPress={() => setView("account")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </>
              )}
              {view === "account" && (
                <>
                  <div className="">
                    <h2 className="text-2xl font-semibold">Your Account</h2>
                    <p className="text-default-500">Welcome, {userFirstname}!</p> {/* Display the user's firstname */}
                  </div>
                  <Divider className="my-1"/>
                  <div 
                    className="cursor-pointer md:cursor-default flex justify-between items-center"
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setIsAccountActionsMenuOpen(!isAccountActionsMenuOpen);
                      }
                    }}
                  >
                    <div>
                      <h3 className="text-lg font-semibold">Account Actions</h3>
                      <p className="text-default-500">View and manage your account</p>
                    </div>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 md:hidden transition-transform duration-200" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                      style={{ transform: isAccountActionsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div id="account-actions-menu" className={`md:flex flex-col items-center gap-4 p-2 py-3 ${isAccountActionsMenuOpen ? 'flex' : 'hidden'}`}>
                    <Button
                      className="w-full"
                      color="primary"
                      variant="shadow"
                      onPress={() => setView("changePassword")}
                    >
                      Change Password
                    </Button>
                    <Button
                      className="w-full"
                      color="danger"
                      variant="ghost"
                      onPress={() => setView("deleteAccount")}
                    >
                      Delete Account
                    </Button>
                    <Divider className="w-80"/>
                    <Button
                      className="w-full"
                      color="danger"
                      variant="ghost"
                      onPress={handleLogout}
                    >
                      Log out
                    </Button>
                  </div>
                  <Divider className="my-1"/>
                  <div className="">
                    <h3 className="text-lg font-semibold">Your Orders</h3>
                    <p className="text-default-500">View and manage your orders</p>
                  </div>
                  {!orders || Object.keys(orders).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <p className="text-default-500">You haven't placed any orders yet.</p>
                      <p className="text-sm text-default-400">Your order history will appear here once you make a purchase.</p>
                    </div>
                  ) : (
                  <ScrollShadow className="h-full w-full p-1 py-3" hideScrollBar>
                    <div className="space-y-4 px-1">
                      {Object.values(orders).map((order: any) => (
                        <Card 
                          key={order.order_id} 
                          isPressable 
                          shadow="md"
                          className="border border-gray-200 hover:border-gray-300 transition-colors w-full"
                          onPress={() => {
                            setSelectedOrder(order);
                            openOrderModal();
                          }}
                        >

                          <CardBody className="p-4">
                            <div className="flex flex-col gap-4">
                              {/* Order Header */}
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm text-default-500">Order #{order.order_id}</p>
                                  <p className="text-sm text-default-500">
                                    {new Date(order.order_date).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="space-y-1 text-left">
                                    <p className={`text-sm ${
                                      (order.status || '').toLowerCase() === 'cancelled' ? 'text-red-500' : 
                                      (order.status || '').toLowerCase() === 'processed' ? 'text-green-500' : 
                                      'text-blue-500'
                                    }`}>
                                      {order.status === 'processed' 
                                        ? order.delivery_option === 'collection'
                                          ? 'READY TO COLLECT'
                                          : 'READY FOR DELIVERY'
                                        : (order.status).toUpperCase()}
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium">
                                    {new Intl.NumberFormat("en-GB", {
                                      style: "currency",
                                      currency: "GBP",
                                    }).format(order.final_total)}
                                  </p>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-px bg-gray-200"></div>

                              {/* Order Details */}
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-default-500">
                                    {order.delivery_option === 'collection' ? (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                        Collection in store
                                      </>
                                    ) : (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                                        {order.status === 'processed' && order.delivery_date ? (
                                          <>Delivery Date: <p className="font-semibold ">{new Date(order.delivery_date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'numeric',
                                            year: 'numeric'
                                          })}</p></>
                                        ) : (
                                          <>Delivery</>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {order.items.map((item: any) => (
                                    <div
                                      key={`${order.order_id}-${item.item_id}`}
                                      className="relative w-[40px] h-[40px]"
                                    >
                                      <Image
                                        className="object-cover object-center rounded-sm"
                                        radius="sm"
                                        shadow="sm"
                                        width="40px"
                                        height="40px"
                                        src={item.image_url}
                                        alt={item.display_name}
                                      />
                                      {order.items.length > 3 && item === order.items[2] && (
                                        <div className="absolute inset-0 bg-black/50 rounded-sm flex items-center justify-center text-white text-xs">
                                          +{order.items.length - 2}
                                        </div>
                                      )}
                                    </div>
                                  )).slice(0, 3)}
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </ScrollShadow>
                  )}
                  {/* Order Details Modal */}
                  <Modal 
                    size="2xl"
                    className="h-[95dvh] sm:h-[85dvh]"
                    isOpen={!!selectedOrder} 
                    onClose={() => {
                      setSelectedOrder(null);
                      setShowCancelSuccess(false);
                    }}
                  >
                    <ModalContent>
                      {(onClose) => (
                        <>
                          <ModalHeader className="flex flex-col gap-1">
                            <h3 className="text-lg font-medium">Order Details</h3>
                          </ModalHeader>
                          <ModalBody className="overflow-y-auto p-0">
                            {selectedOrder && (
                              <>
                                {showCancelSuccess ? (
                                  <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-16 h-16 mb-6 text-green-500">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <h4 className="text-xl font-medium mb-4">Order Successfully Cancelled</h4>
                                    <p className="text-default-500 mb-2">
                                      Your order has been cancelled and a refund has been initiated.
                                    </p>
                                    <p className="text-default-500">
                                      You should receive your refund within 5-10 business days, depending on your payment method.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col h-full">
                                    {/* Order Summary */}
                                    <div className="flex justify-between items-start bg-background p-6">
                                      <div className="space-y-1">
                                        <h4 className="font-medium">Order Date</h4>
                                        <p className="text-default-500">
                                          {new Date(selectedOrder.order_date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                          })}
                                        </p>
                                        {selectedOrder.delivery_option === 'delivery' && selectedOrder.status === 'processed' && selectedOrder.delivery_date && (
                                          <>
                                            <h4 className="font-medium mt-4">Delivery Date</h4>
                                            <p className="text-default-500">
                                              {new Date(selectedOrder.delivery_date).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                              })}
                                            </p>
                                          </>
                                        )}
                                      </div>
                                      <div className="space-y-1 text-left">
                                        <h4 className="font-medium">Status</h4>
                                        <p className={`font-medium ${
                                          (selectedOrder.status || '').toLowerCase() === 'cancelled' ? 'text-red-500' : 
                                          (selectedOrder.status || '').toLowerCase() === 'processed' ? 'text-green-500' : 
                                          'text-blue-500'
                                        }`}>
                                          {selectedOrder.status === 'processed' 
                                            ? selectedOrder.delivery_option === 'collection'
                                              ? 'READY TO COLLECT'
                                              : 'READY FOR DELIVERY'
                                            : (selectedOrder.status).toUpperCase()}
                                        </p>
                                      </div>
                                      <div className="space-y-1 text-right">
                                        <h4 className="font-medium">Total</h4>
                                        <p className="text-default-500">
                                          {new Intl.NumberFormat("en-GB", {
                                            style: "currency",
                                            currency: "GBP",
                                          }).format(selectedOrder.final_total)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Desktop Layout Container */}
                                    <div className="flex-1 flex flex-col sm:overflow-hidden">
                                      {/* Items Section - Scrollable on desktop */}
                                      <div className="sm:overflow-y-auto flex-1">
                                        <div className="p-6">
                                          <div className="space-y-3">
                                            {selectedOrder.items.map((item: any) => (
                                              <div key={item.item_id} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                                                <Image
                                                  className="object-cover object-center rounded-sm"
                                                  radius="sm"
                                                  shadow="sm"
                                                  width="50px"
                                                  height="50px"
                                                  src={item.image_url}
                                                  alt={item.name}
                                                />
                                                <div className="flex-1">
                                                  <p className="font-medium line-clamp-1">{item.name}</p>
                                                  <p className="text-sm text-default-500">Quantity: {item.quantity}</p>
                                                </div>
                                                <p className="text-right">
                                                  {new Intl.NumberFormat("en-GB", {
                                                    style: "currency",
                                                    currency: "GBP",
                                                  }).format(item.price)}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="bg-background p-4 rounded-lg mt-4">
                                            <div className="flex justify-between text-sm ">
                                              <span>Subtotal:</span>
                                              <span>£{selectedOrder?.original_total}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mt-2">
                                              <span>Shipping:</span>
                                              <span>{selectedOrder?.delivery_option === 'delivery' ? '£3.50' : 'Free'}</span>
                                            </div>
                                            {selectedOrder.free_magnet || selectedOrder.free_mug ? (
                                              <div className="flex justify-between text-sm mt-2">
                                                <div className="flex flex-col">
                                                  <span className="text-green-600">Promotions:</span>
                                                  <span className="text-green-600">{selectedOrder.free_magnet? '+ Free Magnet' : ''}</span>
                                                  <span className="text-green-600">{selectedOrder.free_mug? '+ Free Mug' : ''}</span>
                                                </div>
                                                {parseFloat(selectedOrder.discount_value) > 0 ? (
                                                  <span className="text-green-600">-£{parseFloat(selectedOrder.discount_value).toFixed(2)}</span>
                                                ) : null }
                                              </div>
                                            ) : null}
                                            <div className="flex justify-between font-medium mt-2">
                                              <span>Total Paid:</span>
                                              <span>
                                                {new Intl.NumberFormat("en-GB", {
                                                  style: "currency",
                                                  currency: "GBP",
                                                }).format(selectedOrder.final_total)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Delivery and Contact Information - Fixed at bottom on desktop */}
                                      <div className="sm:mt-auto">
                                        <div className="p-6">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                              <h4 className="font-medium mb-3">Delivery Information</h4>
                                              {selectedOrder.delivery_option === 'collection' ? (
                                                <div className="bg-background p-4 rounded-lg">
                                                  <div className="flex items-center gap-2 mb-3 text-default-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                    <span className="font-medium">Collection in Store</span>
                                                  </div>
                                                  <div className="space-y-3">
                                                    {selectedOrder.status === 'processed' ? (
                                                      <>
                                                      <span className="font-medium text-green-600">Your order is ready to collect from our store during business hours.</span>
                                                      <div>
                                                        <h5 className="text-sm font-medium text-default-600 mb-1">Store Address:</h5>
                                                        <div className="text-sm text-default-500">
                                                          <p>9 West Port</p>
                                                          <p>Dunbar</p>
                                                          <p>EH42 1BX</p>
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <h5 className="text-sm font-medium text-default-600 mb-1">Opening Hours:</h5>
                                                        <p className="text-sm text-default-500">Mon - Sat: 9:00 AM - 5:30 PM</p>
                                                      </div>
                                                      </>
                                                    ) : (
                                                      <p className="text-sm text-default-600">Your order will be available for collection from our store during business hours.</p>
                                                    )}
                                                  </div>
                                                </div>
                                              ) : selectedOrder.shipping_address ? (
                                                <div className="bg-background p-4 rounded-lg">
                                                  <div className="flex items-center gap-2 mb-3 text-default-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                                                    Delivery to:
                                                  </div>
                                                  
                                                  <div className="space-y-1 text-sm text-default-500">
                                                    <p>{selectedOrder.shipping_address.name}</p>
                                                    <p>{selectedOrder.shipping_address.line1}</p>
                                                    {selectedOrder.shipping_address.line2 && (
                                                      <p>{selectedOrder.shipping_address.line2}</p>
                                                    )}
                                                    <p>{selectedOrder.shipping_address.city}</p>
                                                    {selectedOrder.shipping_address.county && (
                                                      <p>{selectedOrder.shipping_address.county}</p>
                                                    )}
                                                    <p>{selectedOrder.shipping_address.postcode}</p>
                                                  </div>
                                                </div>
                                              ) : (
                                                <p className="text-default-500">Delivery information not available</p>
                                              )}
                                            </div>
                                            
                                            <div>
                                              <h4 className="font-medium mb-3">Contact Information</h4>
                                              <div className="bg-background p-4 rounded-lg">
                                                <div className="flex items-center gap-2 mb-3 text-default-500">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                  Contact Details:
                                                </div>
                                                <div className="space-y-2 text-sm text-default-500">
                                                  <p>{selectedOrder.contact_details.name}</p>
                                                  <p>{selectedOrder.contact_details.email}</p>
                                                  {selectedOrder.contact_details.phone && (
                                                    <p>Phone: {selectedOrder.contact_details.phone}</p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </ModalBody>
                          <ModalFooter>
                            {!showCancelSuccess && (
                              <Button
                                color="danger"
                                variant="ghost"
                                onPress={() => selectedOrder && openCancelConfirm(selectedOrder.order_id)}
                                isDisabled={!selectedOrder || selectedOrder.status !== 'paid' || isCancelling}
                              >
                                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                              </Button>
                            )}
                            <Button variant="ghost" onPress={onClose}>
                              Close
                            </Button>
                          </ModalFooter>
                        </>
                      )}
                    </ModalContent>
                  </Modal>
                  {/* Cancel Confirmation Modal */}
                  <Modal 
                    size="sm" 
                    isOpen={showCancelConfirm} 
                    onClose={() => {
                      setShowCancelConfirm(false);
                      setCancelOrderId(null);
                    }}
                  >
                    <ModalContent>
                      {() => (
                        <>
                          <ModalHeader className="flex flex-col gap-1">
                            <h3 className="text-xl">Cancel Order</h3>
                          </ModalHeader>
                          <ModalBody>
                            <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
                          </ModalBody>
                          <ModalFooter>
                            <Button
                              color="danger"
                              variant="solid"
                              onPress={() => cancelOrderId && handleCancelOrder(cancelOrderId)}
                              isDisabled={isCancelling}
                            >
                              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onPress={() => {
                                setShowCancelConfirm(false);
                                setCancelOrderId(null);
                              }}
                            >
                              No, Keep Order
                            </Button>
                          </ModalFooter>
                        </>
                      )}
                    </ModalContent>
                  </Modal>
                </>
              )}
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};