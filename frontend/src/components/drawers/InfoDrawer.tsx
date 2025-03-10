import { Drawer, DrawerContent, DrawerHeader, DrawerBody, Divider } from "@heroui/react";
import { useTheme } from "@/contexts/ThemeContext";

interface InfoDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const InfoDrawer = ({ isOpen, onOpenChange }: InfoDrawerProps) => {
  const { isDark } = useTheme();

  const handleClose = () => {
    onOpenChange(false);
    localStorage.setItem('hasVisited', 'true');
  };

  return (
    <Drawer backdrop="blur" isOpen={isOpen} onOpenChange={handleClose} placement="left">
      <DrawerContent className="bg-background/80 backdrop-blur-lg overflow-hidden">
        <DrawerHeader className="flex flex-col mb-0 pb-0">
          <div>
            <h2 className="text-2xl font-semibold"></h2>
            <p className="text-default-500 font-normal text-md">
              Weclome
            </p>
          </div>
        </DrawerHeader>
        <Divider className="my-4"/>
        <DrawerBody>
          <div className="space-y-6 mb-4">
            {/* About Section */}
            <section>
              <img className="mb-4"src={isDark ? "/full-white.png" : "/full-black.png"}></img>
              <h3 className="text-lg font-semibold mb-2">Foreword</h3>
              <p className="text-default-600"></p>
            </section>

            {/* Discounts */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Our Offers</h3>
              <div className="space-y-3">
                <div className="bg-success-50 rounded-lg p-4">
                  <h4 className="font-medium text-success-700 mb-1">Spend £10</h4>
                  <p className="text-sm text-success-600">Get a free random magnet & a free random figure with your order.</p>
                </div>
                <div className="bg-success-50 rounded-lg p-4">
                  <h4 className="font-medium text-success-700 mb-1">Spend £20</h4>
                  <p className="text-sm text-success-600">Get a free random mug with your order.</p>
                </div>
                <div className="bg-success-50 rounded-lg p-4">
                  <h4 className="font-medium text-success-700 mb-1">Spend £40</h4>
                  <p className="text-sm text-success-600">Get 20% off your entire order.</p>
                </div>
                <div className="bg-success-50 rounded-lg p-4">
                  <h4 className="font-medium text-success-700 mb-1">Spend £80</h4>
                  <p className="text-sm text-success-600">Get 30% off your entire order.</p>
                </div>
              </div>
            </section>

            {/* Delivery Information */}
            <section>
              <h3 className="text-lg font-semibold mb-2">Delivery Options</h3>
              <div className="space-y-3">
                <div className="bg-default-50 rounded-lg p-4">
                  <h4 className="font-medium mb-1">Collection</h4>
                  <p className="text-sm text-default-600">Free - Pick up from the shop.</p>
                </div>
                <div className="bg-default-50 rounded-lg p-4">
                  <h4 className="font-medium mb-1">Delivery</h4>
                  <p className="text-sm text-default-600">£3.50 - We'll deliver to you.</p>
                </div>
              </div>
            </section>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
