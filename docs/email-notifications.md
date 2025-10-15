# Email Notification System

## Overview

The LunarBot email notification system provides automated email alerts for key events like product restocks, task completions, purchases, and price drops.

## Features

- ✅ **Restock Alerts** - Notify users when products come back in stock
- ✅ **Task Completion** - Send status updates when tasks finish
- ✅ **Purchase Success** - Confirm successful automated purchases
- ✅ **Price Drop Alerts** - Alert users when prices decrease

## Setup

### 1. Install Resend

```bash
npm install resend
```

### 2. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain
3. Get your API key from the dashboard

### 3. Configure Environment Variables

Add to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM="LunarBot <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Usage

### Frontend Hook

Use the `useEmailNotifications` hook in your components:

```typescript
import { useEmailNotifications } from '@/hooks/useEmailNotifications';

function MyComponent() {
  const { sendRestockAlert, sendTaskCompleted } = useEmailNotifications();

  const handleRestock = async () => {
    await sendRestockAlert({
      productName: 'Pokémon Booster Box',
      productUrl: 'https://store.com/product',
      storeName: 'ToyChamp',
      price: 89.99,
    });
  };

  const handleTaskComplete = async () => {
    await sendTaskCompleted({
      productName: 'Pokémon Booster Box',
      status: 'success',
      message: 'Successfully purchased!',
    });
  };
}
```

### API Endpoint

Direct API usage:

```typescript
const response = await fetch('/api/notifications/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'restock',
    data: {
      productName: 'Pokémon Booster Box',
      productUrl: 'https://store.com/product',
      storeName: 'ToyChamp',
      price: 89.99,
    },
  }),
});
```

### Backend Service

Direct service usage in API routes or server-side code:

```typescript
import { emailService } from '@/lib/emailService';

await emailService.sendRestockAlert(
  'user@example.com',
  'Pokémon Booster Box',
  'https://store.com/product',
  'ToyChamp',
  89.99
);
```

## Email Types

### Restock Alert

```typescript
sendRestockAlert({
  productName: string;
  productUrl: string;
  storeName: string;
  price: number;
})
```

### Task Completed

```typescript
sendTaskCompleted({
  productName: string;
  status: 'success' | 'failed';
  message?: string;
})
```

### Purchase Success

```typescript
sendPurchaseSuccess({
  productName: string;
  orderNumber: string;
  price: number;
  storeName: string;
})
```

### Price Drop Alert

```typescript
sendPriceDropAlert({
  productName: string;
  productUrl: string;
  oldPrice: number;
  newPrice: number;
  storeName: string;
})
```

## Integration Examples

### In Worker Tasks

```typescript
// api/worker.js
import { emailService } from '@/lib/emailService';

async function processPurchaseTask(task) {
  try {
    const result = await executePurchase(task);
    
    await emailService.sendPurchaseSuccess(
      task.userEmail,
      task.productName,
      result.orderNumber,
      task.price,
      task.storeName
    );
  } catch (error) {
    await emailService.sendTaskCompleted(
      task.userEmail,
      task.productName,
      'failed',
      error.message
    );
  }
}
```

### In Product Monitor

```typescript
// Restock detection
if (product.inStock && !wasInStock) {
  const watchlistUsers = await getWatchlistUsers(product.id);
  
  for (const user of watchlistUsers) {
    await emailService.sendRestockAlert(
      user.email,
      product.name,
      product.url,
      product.store,
      product.price
    );
  }
}

// Price drop detection
if (product.price < previousPrice) {
  const priceAlertUsers = await getPriceAlertUsers(product.id);
  
  for (const user of priceAlertUsers) {
    await emailService.sendPriceDropAlert(
      user.email,
      product.name,
      product.url,
      previousPrice,
      product.price,
      product.store
    );
  }
}
```

## Testing

### Development Mode

Without a `RESEND_API_KEY`, emails will be logged to console instead of sent:

```bash
📧 [Email Mock] {
  to: 'user@example.com',
  subject: '🚨 Product is back in stock!',
  html: '...',
}
```

### Test Email

Create a test endpoint:

```typescript
// app/api/test-email/route.ts
import { emailService } from '@/lib/emailService';
import { NextResponse } from 'next/server';

export async function GET() {
  await emailService.sendRestockAlert(
    'test@example.com',
    'Test Product',
    'https://example.com',
    'Test Store',
    99.99
  );
  
  return NextResponse.json({ success: true });
}
```

## User Preferences

Add email notification preferences to user profiles:

```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
  "restock_alerts": true,
  "task_completion": true,
  "purchase_success": true,
  "price_drops": true,
  "marketing": false
}'::jsonb;
```

Then check preferences before sending:

```typescript
const { data: profile } = await supabase
  .from('user_profiles')
  .select('email_notifications')
  .eq('user_id', userId)
  .single();

if (profile?.email_notifications?.restock_alerts) {
  await emailService.sendRestockAlert(...);
}
```

## Troubleshooting

### Emails not sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend dashboard
3. Check email isn't in spam folder
4. Look for errors in server logs

### Rate Limits

Resend free tier limits:
- 100 emails per day
- 3,000 emails per month

Upgrade to paid plan for production use.

## Best Practices

1. **Don't spam** - Respect user preferences and rate limits
2. **Test emails** - Use test mode in development
3. **Handle errors** - Always catch and log email failures
4. **Track delivery** - Use Resend dashboard to monitor delivery
5. **Unsubscribe links** - Include opt-out options in marketing emails

## Next Steps

- [ ] Add email templates to database
- [ ] Implement email scheduling/queuing
- [ ] Add webhook for delivery status
- [ ] Create email analytics dashboard
- [ ] Support multiple languages

---

**Status**: ✅ Implemented  
**Last Updated**: December 2024  
**Milestone**: 4.3 - Restock Detection & Notifications
