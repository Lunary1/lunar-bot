/**
 * Hook for sending email notifications
 * Provides easy-to-use functions for triggering various email types
 */

type RestockAlertData = {
  productName: string;
  productUrl: string;
  storeName: string;
  price: number;
};

type TaskCompletedData = {
  productName: string;
  status: 'success' | 'failed';
  message?: string;
};

type PurchaseSuccessData = {
  productName: string;
  orderNumber: string;
  price: number;
  storeName: string;
};

type PriceDropData = {
  productName: string;
  productUrl: string;
  oldPrice: number;
  newPrice: number;
  storeName: string;
};

export function useEmailNotifications() {
  const sendNotification = async (type: string, data: any) => {
    try {
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  };

  return {
    sendRestockAlert: (data: RestockAlertData) =>
      sendNotification('restock', data),
    
    sendTaskCompleted: (data: TaskCompletedData) =>
      sendNotification('task_completed', data),
    
    sendPurchaseSuccess: (data: PurchaseSuccessData) =>
      sendNotification('purchase_success', data),
    
    sendPriceDropAlert: (data: PriceDropData) =>
      sendNotification('price_drop', data),
  };
}
