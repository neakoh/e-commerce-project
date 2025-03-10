import { 
  useEffect, 
  useState, 
  useMemo 
} from 'react';
import { 
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Button, Input, 
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Pagination, Selection, SortDescriptor,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/react";
import { toast } from 'sonner';
import { config } from "@/config/config"

const API_URL = config.API_URL
// Types
interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  option?: {
    id: number;
    name: string;
    price: number;
  };
  brand?: string;
  image_url: string;
}

interface Order {
  order_id: string;
  order_date: string;
  status: string;
  original_total: string;
  final_total: number;
  free_mug: boolean;
  free_magnet: boolean;
  discount_value: string;
  delivery_option: 'delivery' | 'collection';
  contact_details: {
    name: string;
    email: string;
    phone?: string;
  };
  shipping_address?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
  };
  items: OrderItem[];
  delivery_fee?: number;
  discount?: number;
}

const statusColorMap: Record<string, "success" | "warning" | "danger" | "default"> = {
  processed: "success",
  paid: "default",
  cancelled: "danger",
};

const statusOptions = [
  { label: "Processed", value: "processed" },
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
];

export const AdminView = () => {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<Selection>("all");
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "order_date",
    direction: "descending",
  });
  const [page, setPage] = useState(1);

  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Add state for delivery date
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  // Reset delivery date when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeliveryDate("");
    }
  }, [isOpen]);

  // Fetch orders
  useEffect(() => {
    const getOrders = async () => {
      try {
        const response = await fetch(`${API_URL}/orders/all`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
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
        setOrders(Object.values(ordersObject));
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getOrders();
  }, []);

  // Fetch order details
  const handleOrderClick = async (order: Order) => {
    try {
      const response = await fetch(`${API_URL}/orders/${order.order_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      // Format the order data
      const formattedName = `${(data.firstname?.charAt(0).toUpperCase() + data.firstname?.slice(1) || '')} ${(data.lastname?.charAt(0).toUpperCase() + data.lastname?.slice(1) || '')}`.trim();
      
      const formattedOrder = {
        order_id: data.order_id,
        order_date: data.order_date,
        original_total: data.original_total,
        final_total: data.final_total,
        free_mug: data.free_mug,
        free_magnet: data.free_magnet,
        discount_value: data.discount_value,
        delivery_option: data.delivery_option,
        status: data.status,
        contact_details: {
          name: formattedName,
          email: data.email,
          phone: data.phone_number
        },
        shipping_address: data.delivery_option === 'delivery' ? {
          name: formattedName,
          line1: data.address_line1,
          line2: data.address_line2,
          city: data.city,
          county: data.county,
          postcode: data.postcode
        } : null,
        items: data.items.map((item: any) => ({
          ...item,
          name: item.display_name || item.item_name,
          brand: item.brand_name,
          image_url: item.image_url,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity)
        })),
        delivery_fee: data.delivery_fee,
        discount: data.discount
      };

      setSelectedOrder(formattedOrder);
      onOpen();
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to fetch order details", {
        description: "Please try again later",
      });
    }
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Text filter
    if (filterValue) {
      filtered = filtered.filter(order => 
        order.order_id ||
        order.contact_details.name.toLowerCase().includes(filterValue.toLowerCase()) ||
        order.contact_details.email.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all" && Array.from(statusFilter).length > 0) {
      filtered = filtered.filter(order => 
        Array.from(statusFilter).includes(order.status.toLowerCase())
      );
    }

    // Sorting
    if (sortDescriptor.column && sortDescriptor.direction) {
      filtered.sort((a, b) => {
        let first = a[sortDescriptor.column as keyof Order];
        let second = b[sortDescriptor.column as keyof Order];
        
        if (sortDescriptor.column === "order_date") {
          first = new Date(first as string).getTime();
          second = new Date(second as string).getTime();
        }

        const cmp = first < second ? -1 : first > second ? 1 : 0;
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      });
    }

    return filtered;
  }, [orders, filterValue, statusFilter, sortDescriptor]);

  // Pagination
  const pages = Math.ceil(filteredOrders.length / rowsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredOrders.slice(start, end);
  }, [page, filteredOrders, rowsPerPage]);

  // Render
  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex flex-col flex-grow p-4">
        <div className="flex justify-between gap-3 items-center pb-4">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by order ID, customer name or email..."
            value={filterValue}
            onValueChange={setFilterValue}
          />
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger>
                <Button
                  endContent={<span className="text-small">▼</span>}
                  variant="flat"
                >
                  Status
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={statusFilter}
                selectionMode="multiple"
                onSelectionChange={setStatusFilter}
              >
                {statusOptions.map((status) => (
                  <DropdownItem key={status.value} className="capitalize">
                    {status.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        <div className="flex-grow min-h-0">
          <Table
            aria-label="Orders table"
            className="h-full"
            bottomContent={null}
            bottomContentPlacement="outside"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <TableHeader>
              <TableColumn key="order_id" allowsSorting>Order ID</TableColumn>
              <TableColumn key="order_date" allowsSorting>Date</TableColumn>
              <TableColumn key="contact_details">Customer</TableColumn>
              <TableColumn key="delivery_option">Delivery</TableColumn>
              <TableColumn key="total_price" allowsSorting>Total</TableColumn>
              <TableColumn key="status" allowsSorting>Status</TableColumn>
              <TableColumn key="actions">Actions</TableColumn>
            </TableHeader>
            <TableBody
              items={paginatedOrders}
              isLoading={isLoading}
              loadingContent={<div>Loading orders...</div>}
              emptyContent={!isLoading ? "No orders found" : null}
            >
              {(order) => (
                <TableRow key={order.order_id}>
                  <TableCell>{order.order_id}</TableCell>
                  <TableCell>
                    {new Date(order.order_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <p className="text-bold">{order.contact_details.name}</p>
                      <p className="text-tiny text-default-500">{order.contact_details.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      className="capitalize"
                      color={order.delivery_option === 'collection' ? 'warning' : 'primary'}
                      size="sm"
                      variant="flat"
                    >
                      {order.delivery_option}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: "GBP",
                    }).format(order.final_total)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      className="capitalize"
                      color={statusColorMap[order.status.toLowerCase()]}
                      size="sm"
                      variant="flat"
                    >
                      {order.status}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        onClick={() => handleOrderClick(order)}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex justify-center p-4">
        <Pagination
          isCompact
          showControls
          showShadow
          className="pb-10"
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />
      </div>

      {/* Order Details Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Order Details
              </ModalHeader>
              <ModalBody>
                {isLoadingDetails ? (
                  <div className="flex justify-center items-center h-40">
                    Loading...
                  </div>
                ) : selectedOrder ? (
                  <div className="space-y-6">
                    {/* Order Info */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Order Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Order ID</p>
                          <p>{selectedOrder.order_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p>{new Date(selectedOrder.order_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Delivery Option</p>
                          <Chip
                            className="capitalize mt-1"
                            color={selectedOrder.delivery_option === 'collection' ? 'warning' : 'primary'}
                            size="sm"
                            variant="flat"
                          >
                            {selectedOrder.delivery_option}
                          </Chip>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <Chip
                            className="capitalize mt-1"
                            color={statusColorMap[selectedOrder.status.toLowerCase()]}
                            size="sm"
                            variant="flat"
                          >
                            {selectedOrder.status}
                          </Chip>
                        </div>

                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Customer Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p>{selectedOrder.contact_details.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p>{selectedOrder.contact_details.email}</p>
                        </div>
                        {selectedOrder.contact_details.phone && (
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p>{selectedOrder.contact_details.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Info */}
                    {selectedOrder.delivery_option === 'delivery' && selectedOrder.status === 'paid' && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Delivery Information</h3>
                      <div className="grid grid-cols-2">
                        <div>
                          {selectedOrder.delivery_option == 'delivery' && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">Shipping Address</p>
                            <div className="mt-1">
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
                          )}
                        </div>          
                        <div>
                          <p className="text-sm text-gray-500">Set Delivery Date</p>
                          <div className="mt-4">
                            <Input
                              type="date"
                              label="Delivery Date"
                              value={deliveryDate}
                              onChange={(e) => setDeliveryDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              isRequired
                              className="max-w-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                    {/* Order Items */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Order Items</h3>
                      {selectedOrder.items.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-4">
                          <img
                            src={item.image_url}
                            alt={item.option_name}
                            width={50}
                            height={50}
                            className="object-cover rounded-md"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.brand} - Quantity: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {new Intl.NumberFormat("en-GB", {
                                style: "currency",
                                currency: "GBP",
                              }).format(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Order Summary */}
                    <div className="bg-background p-4 rounded-lg space-y-4">
                      <h3 className="font-medium">Order Summary</h3>
                      
                      {/* Subtotal */}
                      <div className="space-y-2">
                        
                        <div className="flex justify-between text-sm">
                          <p className="text-gray-600">Subtotal</p>
                          <p>
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: "GBP",
                            }).format(selectedOrder.items.reduce((acc, item) => 
                              acc + (item.price * item.quantity), 0)
                            )}
                          </p>
                        </div>
                        <div className="flex justify-between text-sm">
                          <p className="text-gray-600">Delivery Fee</p>
                          <p>
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: "GBP",
                            }).format(selectedOrder.delivery_fee || 0)}
                          </p>
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
                        {/* Total */}
                        <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                          <p>Total</p>
                          <p>
                            {new Intl.NumberFormat("en-GB", {
                              style: "currency",
                              currency: "GBP",
                            }).format(selectedOrder.final_total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    No order details available
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                
                {selectedOrder && selectedOrder.status === 'paid' && (
                  <Button 
                    color="primary" 
                    onPress={async () => {
                      try {
                        // Validate delivery date for delivery orders
                        if (selectedOrder.delivery_option === 'delivery' && !deliveryDate) {
                          toast.error('Please select a delivery date');
                          return;
                        }
                        
                        const response = await fetch(`${API_URL}/orders/${selectedOrder.order_id}/status`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            status: 'processed',
                            delivery_option: selectedOrder.delivery_option,
                            delivery_date: selectedOrder.delivery_option === 'delivery' ? deliveryDate : null,
                            delivery_address: selectedOrder.shipping_address? selectedOrder.shipping_address : null,
                            items: selectedOrder.items,
                            contact_details: selectedOrder.contact_details,
                            original_total: selectedOrder.original_total,
                            final_total: selectedOrder.final_total,
                            free_mug: selectedOrder.free_mug,
                            free_magnet: selectedOrder.free_magnet,
                            discount_value: selectedOrder.discount_value,
                          })
                        });

                        if (!response.ok) {
                          throw new Error('Failed to update order status');
                        }

                        // Update local state
                        setOrders(orders.map(order => 
                          order.order_id === selectedOrder.order_id 
                            ? { ...order, status: 'processed' } 
                            : order
                        ));
                        setSelectedOrder({ ...selectedOrder, status: 'processed' });

                        toast.success('Order marked as processed');
                        onClose();
                      } catch (error) {
                        console.error('Error updating order status:', error);
                        toast.error('Failed to update order status');
                      }
                    }}
                    isDisabled={selectedOrder.delivery_option === 'delivery' && !deliveryDate}
                  >
                    Process Order
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};