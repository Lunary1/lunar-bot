import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/notifications/email
 * Send email notifications
 * 
 * Body:
 * {
 *   type: 'restock' | 'task_completed' | 'purchase_success' | 'price_drop',
 *   data: { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      );
    }

    // Get user email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', session.user.id)
      .single();

    const userEmail = profile?.email || session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    let success = false;

    switch (type) {
      case 'restock':
        success = await emailService.sendRestockAlert(
          userEmail,
          data.productName,
          data.productUrl,
          data.storeName,
          data.price
        );
        break;

      case 'task_completed':
        success = await emailService.sendTaskCompleted(
          userEmail,
          data.productName,
          data.status,
          data.message
        );
        break;

      case 'purchase_success':
        success = await emailService.sendPurchaseSuccess(
          userEmail,
          data.productName,
          data.orderNumber,
          data.price,
          data.storeName
        );
        break;

      case 'price_drop':
        success = await emailService.sendPriceDropAlert(
          userEmail,
          data.productName,
          data.productUrl,
          data.oldPrice,
          data.newPrice,
          data.storeName
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
