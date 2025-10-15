/**
 * Email Notification Service
 * Handles sending various types of notifications to users
 * 
 * Setup:
 * 1. Install: npm install resend
 * 2. Add RESEND_API_KEY to .env.local
 * 3. Verify domain in Resend dashboard
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private apiKey: string;
  private from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.from = process.env.EMAIL_FROM || 'LunarBot <noreply@lunarbot.com>';
    
    if (!this.apiKey) {
      console.warn('⚠️ RESEND_API_KEY not configured. Email notifications will be logged only.');
    }
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.log('📧 [Email Mock]', options);
      return true;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * Send restock alert notification
   */
  async sendRestockAlert(
    email: string,
    productName: string,
    productUrl: string,
    storeName: string,
    price: number
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .product { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Product Back in Stock!</h1>
            </div>
            <div class="content">
              <p>Great news! A product you're watching is back in stock:</p>
              <div class="product">
                <h2>${productName}</h2>
                <p><strong>Store:</strong> ${storeName}</p>
                <p><strong>Price:</strong> €${price.toFixed(2)}</p>
                <a href="${productUrl}" class="button">View Product →</a>
              </div>
              <p>This product tends to sell out quickly. Act fast to secure your purchase!</p>
            </div>
            <div class="footer">
              <p>You're receiving this because you enabled restock alerts in LunarBot.</p>
              <p>© ${new Date().getFullYear()} LunarBot. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `🚨 Product Back in Stock!\n\n${productName}\nStore: ${storeName}\nPrice: €${price.toFixed(2)}\n\nView: ${productUrl}`;

    return this.sendEmail({
      to: email,
      subject: `🚨 ${productName} is back in stock!`,
      html,
      text,
    });
  }

  /**
   * Send task completion notification
   */
  async sendTaskCompleted(
    email: string,
    productName: string,
    status: 'success' | 'failed',
    message?: string
  ): Promise<boolean> {
    const isSuccess = status === 'success';
    const emoji = isSuccess ? '✅' : '❌';
    const color = isSuccess ? '#10b981' : '#ef4444';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .status { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: ${color}; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${emoji} Task ${isSuccess ? 'Completed' : 'Failed'}</h1>
            </div>
            <div class="content">
              <div class="status">
                <h2>${productName}</h2>
                <p><strong>Status:</strong> ${isSuccess ? 'Successfully completed' : 'Failed'}</p>
                ${message ? `<p>${message}</p>` : ''}
              </div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://lunarbot.com'}/dashboard" class="button">View Dashboard →</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LunarBot. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `${emoji} Task ${isSuccess ? 'Completed' : 'Failed'}\n\n${productName}\nStatus: ${isSuccess ? 'Successfully completed' : 'Failed'}\n${message || ''}`;

    return this.sendEmail({
      to: email,
      subject: `${emoji} ${productName} - Task ${isSuccess ? 'Completed' : 'Failed'}`,
      html,
      text,
    });
  }

  /**
   * Send purchase success notification
   */
  async sendPurchaseSuccess(
    email: string,
    productName: string,
    orderNumber: string,
    price: number,
    storeName: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .order-details { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .button { display: inline-block; background: #10b981; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Purchase Successful!</h1>
            </div>
            <div class="content">
              <p>Congratulations! Your automated purchase was successful:</p>
              <div class="order">
                <h2>${productName}</h2>
                <div class="order-details">
                  <p><strong>Order Number:</strong> ${orderNumber}</p>
                  <p><strong>Store:</strong> ${storeName}</p>
                  <p><strong>Price:</strong> €${price.toFixed(2)}</p>
                </div>
                <p>You should receive an order confirmation email from ${storeName} shortly.</p>
              </div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://lunarbot.com'}/dashboard" class="button">View Dashboard →</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LunarBot. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `🎉 Purchase Successful!\n\n${productName}\nOrder Number: ${orderNumber}\nStore: ${storeName}\nPrice: €${price.toFixed(2)}\n\nYou should receive an order confirmation email from ${storeName} shortly.`;

    return this.sendEmail({
      to: email,
      subject: `🎉 Purchase Successful - ${productName}`,
      html,
      text,
    });
  }

  /**
   * Send price drop alert
   */
  async sendPriceDropAlert(
    email: string,
    productName: string,
    productUrl: string,
    oldPrice: number,
    newPrice: number,
    storeName: string
  ): Promise<boolean> {
    const savings = oldPrice - newPrice;
    const percentOff = ((savings / oldPrice) * 100).toFixed(0);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .product { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .price-compare { display: flex; justify-content: space-around; margin: 20px 0; }
            .old-price { text-decoration: line-through; color: #999; }
            .new-price { color: #10b981; font-size: 24px; font-weight: bold; }
            .savings { background: #fef3c7; color: #92400e; padding: 10px; border-radius: 6px; text-align: center; margin: 15px 0; font-weight: bold; }
            .button { display: inline-block; background: #f59e0b; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Price Drop Alert!</h1>
            </div>
            <div class="content">
              <p>Great news! A product you're watching has dropped in price:</p>
              <div class="product">
                <h2>${productName}</h2>
                <p><strong>Store:</strong> ${storeName}</p>
                <div class="price-compare">
                  <div>
                    <p>Was</p>
                    <p class="old-price">€${oldPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p>Now</p>
                    <p class="new-price">€${newPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div class="savings">
                  Save €${savings.toFixed(2)} (${percentOff}% OFF)
                </div>
                <a href="${productUrl}" class="button">Buy Now →</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} LunarBot. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `💰 Price Drop Alert!\n\n${productName}\nStore: ${storeName}\nWas: €${oldPrice.toFixed(2)}\nNow: €${newPrice.toFixed(2)}\nSave €${savings.toFixed(2)} (${percentOff}% OFF)\n\nView: ${productUrl}`;

    return this.sendEmail({
      to: email,
      subject: `💰 Price Drop: ${productName} - Save ${percentOff}%!`,
      html,
      text,
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
