import { NextResponse } from 'next/server';
import { verifySignature } from '@chargily/chargily-pay';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('signature');
        const secretKey = process.env.CHARGILY_SECRET_KEY;

        if (!signature || !secretKey) {
            console.error('Chargily Webhook: Missing signature or secret key');
            return NextResponse.json({ error: 'Missing signature or secret key' }, { status: 400 });
        }

        try {
            verifySignature(Buffer.from(rawBody), signature, secretKey);
        } catch (sigError: any) {
            console.error('Chargily Webhook: Invalid signature', sigError.message);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        const body = JSON.parse(rawBody);
        const event = body.type;
        const checkout = body.data;

        if (event === 'checkout.paid') {
            const { pharmacy_id, credit_amount } = checkout.metadata;

            if (!pharmacy_id || !credit_amount) {
                console.error('Chargily Webhook: Missing metadata in checkout.paid', checkout.metadata);
                return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
            }

            const supabase = createClient();
            const webhookSecret = process.env.WEBHOOK_INTERNAL_SECRET || 'wellza_super_secret_123';

            const { error } = await (supabase as any).rpc('add_credits_webhook', {
                p_pharmacy_id: pharmacy_id,
                p_amount: Number(credit_amount),
                p_secret: webhookSecret
            });

            if (error) {
                console.error('Supabase add credits error:', error);
                throw error;
            }

            console.log('Chargily Webhook: Fulfillment successful for pharmacy', pharmacy_id, 'Added credits:', credit_amount);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Chargily Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
