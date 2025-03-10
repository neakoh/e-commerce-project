import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { useAccountDrawer } from "@/contexts/AccountDrawerContext";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;  
  userFirstname: string | null;
  expirationTime: string;
}

export const SessionExpiredModal = ({ isOpen, onClose }: SessionExpiredModalProps) => {
  const { setView, setIsOpen } = useAccountDrawer();

  const handleSignIn = () => {
    setView("login");
    setIsOpen(true);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      backdrop="blur"
      hideCloseButton
      isDismissable={false}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">Session Expired</h2>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-2">
            <p>Please sign in again to continue shopping.</p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button 
            color="primary" 
            onPress={handleSignIn}
            className="w-full"
          >
            Sign In
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
