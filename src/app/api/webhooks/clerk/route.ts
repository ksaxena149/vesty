import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { NextRequest, NextResponse } from 'next/server';
import { syncUserFromClerk, deleteUserFromDb, type ClerkUser } from '@/lib/user-sync';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('Missing CLERK_WEBHOOK_SECRET environment variable');
}

export async function POST(req: NextRequest) {
  try {
    // Get the headers
    const headerPayload = headers();
    const svixId = headerPayload.get('svix-id');
    const svixTimestamp = headerPayload.get('svix-timestamp');
    const svixSignature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new NextResponse('Error: Missing svix headers', { status: 400 });
    }

    // Get the body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret
    const wh = new Webhook(webhookSecret);

    let evt;
    try {
      evt = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as { type: string; data: Record<string, unknown>; };
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return new NextResponse('Error: Verification failed', { status: 400 });
    }

    // Handle the webhook
    const eventType = evt.type;
    const userData = evt.data as ClerkUser;

    console.log(`📞 Webhook received: ${eventType}`, { userId: userData?.id });

    switch (eventType) {
      case 'user.created':
        await syncUserFromClerk(userData);
        console.log('✅ User created and synced to database');
        break;
        
      case 'user.updated':
        await syncUserFromClerk(userData);
        console.log('✅ User updated and synced to database');
        break;
        
      case 'user.deleted':
        if (userData?.id) {
          await deleteUserFromDb(userData.id);
          console.log('✅ User deleted from database');
        }
        break;
        
      default:
        console.log(`🔍 Unhandled event type: ${eventType}`);
    }

    return new NextResponse('Webhook processed successfully', { status: 200 });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new NextResponse(
      `Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      { status: 500 }
    );
  }
}
