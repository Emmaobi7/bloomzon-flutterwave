# Bloomzon Flutterwave Service

A dedicated microservice for handling Flutterwave payment integrations in the Bloomzon ecosystem. This service manages payment initialization, transaction verification, and webhook processing with built-in idempotency and cart management.

## 🚀 Features

- **Payment Initialization**: Generates Flutterwave checkout links and records pending transactions.
- **Transaction Verification**: Securely verifies payment status with the Flutterwave API.
- **Webhook Handling**: Processes `charge.completed` events to update order status and clear carts automatically.
- **Idempotency**: Uses `tx_ref` and `flw_transaction_id` to prevent duplicate payments and processing.
- **Automated Cart Management**: Clears paid items from the user's cart upon successful payment.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: MySQL
- **HTTP Client**: Axios

## 📋 Prerequisites

- Node.js (v16+)
- MySQL Database
- Flutterwave Merchant Account (for API keys)

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_SECRET_HASH=your_webhook_secret_hash

ORDER_URL=http://localhost:8080/api/order
CART_URL=http://localhost:8080/api/cart
```

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## 🔌 API Endpoints

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Returns the service status.

### Initialize Payment
- **URL**: `/api/flutterwave/initialize`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "amount": 5000,
    "currency": "NGN",
    "email": "user@example.com",
    "name": "John Doe",
    "tx_ref": "unique_transaction_reference",
    "order_id": 123,
    "user_id": 45,
    "redirect_url": "https://bloomzon.com/verify"
  }
  ```

### Verify Payment
- **URL**: `/api/flutterwave/verify`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "transaction_id": "123456",
    "tx_ref": "unique_transaction_reference"
  }
  ```

### Webhook Processor
- **URL**: `/api/flutterwave/webhook`
- **Method**: `POST`
- **Description**: Receives and validates Flutterwave webhooks. Requires `verif-hash` header matching `FLW_SECRET_HASH`.

## 🗄 Database Schema

The service uses a table named `flw_payment_transactions` to track:
- `tx_ref`: Internal reference.
- `flw_transaction_id`: Flutterwave's reference.
- `status`: `pending`, `successful`, or `failed`.
- `amount` & `currency`.
- `order_id` & `user_id`.

## 🤝 Integration Flow

1. Frontend calls `/initialize` to get a `payment_url`.
2. User completes payment on Flutterwave.
3. User is redirected back to Bloomzon; Frontend calls `/verify`.
4. (Optional/Backup) Flutterwave sends a webhook to `/webhook` to ensure the order is updated even if the user closes the browser.
