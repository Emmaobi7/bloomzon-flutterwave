import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

export class PaymentTransaction extends Model {
  declare id: number;
  declare tx_ref: string;
  declare flw_transaction_id: string | null;
  declare amount: number;
  declare currency: string;
  declare status: string;
  declare order_id: number | null;
  declare user_id: number | null;
  declare customer_email: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PaymentTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tx_ref: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Guarantees idempotency on tx_ref
    },
    flw_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true, // Prevents duplicate successful callbacks
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending', // pending, successful, failed
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'flw_payment_transactions',
    timestamps: true,
  }
);

export default PaymentTransaction;
