import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import PaymentTransaction from '../models/PaymentTransaction';
import { clearOrderItemsFromCart } from '../helpers/cart';

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

// Initialize a payment and get the checkout link
export const initializePayment = async (req: Request, res: Response) => {
  try {
    const { amount, currency, email, name, phone, tx_ref, order_id, user_id, redirect_url } = req.body;

    if (amount === undefined || amount === null || !currency || !email || !tx_ref) {
      console.error("Missing required fields payload:", { amount, currency, email, tx_ref });
      return res.status(400).json({ success: false, message: 'Missing required fields', received: { amount, currency, email, tx_ref } });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    // Idempotency: Ensure tx_ref doesn't already exist or is merely pending
    const [transaction, created] = await PaymentTransaction.findOrCreate({
      where: { tx_ref },
      defaults: {
        tx_ref,
        amount,
        currency,
        customer_email: email,
        order_id: order_id || null,
        user_id: user_id || null,
        status: 'pending',
      },
    });

    if (!created && transaction.status === 'successful') {
      return res.status(400).json({ success: false, message: 'Transaction already paid for.' });
    }

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: redirect_url || 'https://bloomzon.com/payment/verify', // fallback
      customer: {
        email,
        phonenumber: phone,
        name,
      },
      customizations: {
        title: 'Bloomzon Order',
        logo: 'https://bloomzon.com/logo.png',
      },
    };

    const response = await axios.post(`${FLW_BASE_URL}/payments`, payload, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.status === 'success') {
      return res.status(200).json({
        success: true,
        payment_url: response.data.data.link,
      });
    }

    return res.status(400).json({ success: false, message: 'Failed to generate payment link', data: response.data });
  } catch (error: any) {
    console.error('Initialize Payment Error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Explicit Verification (called when front-end redirects back)
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { transaction_id, tx_ref } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'Missing transaction_id' });
    }

    // Prevent double verification
    const existingTx = await PaymentTransaction.findOne({ where: { tx_ref } });
    if (existingTx && existingTx.status === 'successful') {
      return res.status(200).json({ success: true, message: 'Transaction already verified previously.' });
    }

    const response = await axios.get(`${FLW_BASE_URL}/transactions/${transaction_id}/verify`, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
      },
    });

    const data = response.data.data;

    // Check if truly successful and matches expected details
    if (
      response.data.status === 'success' &&
      data.status === 'successful' &&
      data.amount >= (existingTx?.amount || 0) &&
      data.currency === (existingTx?.currency || data.currency)
    ) {
      
      if (existingTx) {
        await existingTx.update({
          flw_transaction_id: transaction_id.toString(),
          status: 'successful',
        });
        
        // Clear items from cart
        if (existingTx.order_id && existingTx.user_id) {
          const clearResult = await clearOrderItemsFromCart(existingTx.order_id, existingTx.user_id);
          console.log("Cart clear result:", clearResult);
        }

        // TODO: Here you would make an axios call back to your `Bloomzon-Server` 
        // to update the Order Status natively in your main DB structure
        // e.g., axios.post('http://localhost:8080/api/orders/update-status', { order_id: existingTx.order_id, status: 'paid' })
      }

      return res.status(200).json({ success: true, message: 'Payment verified successfully', data });
    }

    // Failed
    if (existingTx) {
      await existingTx.update({ status: 'failed' });
    }
    return res.status(400).json({ success: false, message: 'Payment verification failed', data: data });

  } catch (error: any) {
    console.error('Verify Payment Error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Webhook
export const webhookProcessor = async (req: Request, res: Response) => {
  // If you specified a secret hash, check for the signature
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    return res.status(401).end(); // Unauthorized
  }

  const payload = req.body;
  
  if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
    const tx_ref = payload.data.tx_ref;
    const flw_id = payload.data.id;

    // Idempotency / Double checking
    const tx = await PaymentTransaction.findOne({ where: { tx_ref } });
    
    if (tx && tx.status !== 'successful') {
      // Re-verify strictly through API to avoid webhook spoofing holes
      try {
        const verifyResp = await axios.get(`${FLW_BASE_URL}/transactions/${flw_id}/verify`, {
           headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        });
        
        if (verifyResp.data.data.status === 'successful') {
          await tx.update({ status: 'successful', flw_transaction_id: flw_id.toString() });
          
          if (tx.order_id && tx.user_id) {
            await clearOrderItemsFromCart(tx.order_id, tx.user_id);
          }
          // Update Bloomzon-Server order
        }
      } catch (err) {
         console.error('Webhook reverification failed', err);
      }
    }
  }

  // Acknowledge receipt
  res.status(200).end();
};
