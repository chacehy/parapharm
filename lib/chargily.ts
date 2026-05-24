import { ChargilyClient } from '@chargily/chargily-pay';

const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;
const CHARGILY_MODE = (process.env.CHARGILY_MODE as 'test' | 'live') || 'test';

if (!CHARGILY_SECRET_KEY) {
  console.warn('CHARGILY_SECRET_KEY is not defined in environment variables');
}

export const chargilyClient = new ChargilyClient({
  api_key: CHARGILY_SECRET_KEY || '',
  mode: CHARGILY_MODE,
});

export interface CreateCheckoutParams {
  amount: number;
  success_url: string;
  failure_url?: string;
  webhook_endpoint?: string;
  metadata?: any;
}

/**
 * Create a Chargily Pay V2 Checkout
 */
export async function createChargilyCheckout(params: CreateCheckoutParams) {
  try {
    const checkout = await chargilyClient.createCheckout({
      amount: params.amount,
      currency: 'dzd',
      success_url: params.success_url,
      failure_url: params.failure_url,
      webhook_endpoint: params.webhook_endpoint,
      metadata: params.metadata,
    });

    return {
      success: true,
      url: checkout.checkout_url,
      id: checkout.id,
    };
  } catch (error: any) {
    console.error('Chargily Checkout Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create checkout',
    };
  }
}
