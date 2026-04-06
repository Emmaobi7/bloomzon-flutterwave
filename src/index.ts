import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import { initializePayment, verifyPayment, webhookProcessor } from './controllers/flutterwave';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Init DB
connectDB();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bloomzon-flutterwave-service' });
});

app.post('/api/flutterwave/initialize', initializePayment);
app.post('/api/flutterwave/verify', verifyPayment);
app.post('/api/flutterwave/webhook', webhookProcessor);

app.listen(PORT, () => {
  console.log(`🚀 Bloomzon-flutterwave-Service is running on port ${PORT}`);
});
