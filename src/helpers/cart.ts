import axios from "axios";

interface OrderIdsResponse {
  success: boolean;
  code: number;
  message: string;
  data?: {
    order_id: number;
    item_ids: number[];
  };
}

export async function clearOrderItemsFromCart(
  orderId: number,
  userId: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const orderBaseUrl = process.env.ORDER_URL as string;
    const cartBaseUrl = process.env.CART_URL as string;

    console.log(`[Cart Helper] Fetching item IDs for order: ${orderId}`);
    const idsResp = await axios.get<OrderIdsResponse>(
      `${orderBaseUrl}/ids/${orderId}`,
      { timeout: 10000 },
    );

    console.log(`[Cart Helper] Order IDs Response for ${orderId}:`, idsResp.data);

    if (!idsResp.data.success || !idsResp.data.data) {
      console.warn(`[Cart Helper] Failed to fetch items for order ${orderId}`);
      return { success: false, message: "Failed to fetch order item IDs" };
    }

    const itemIds = idsResp.data.data.item_ids;
    if (!itemIds || itemIds.length === 0) {
      console.log(`[Cart Helper] No items found to clear for order ${orderId}`);
      return { success: true, message: "No items found for order" };
    }

    console.log(`[Cart Helper] Attempting to remove items ${itemIds.join(', ')} from cart for user ${userId}`);
    const removeResp = await axios.patch(
      `${cartBaseUrl}`,
      { user_id: userId, cart_item_id: itemIds },
      { timeout: 10000 },
    );

    if (removeResp.data.success) {
       console.log(`[Cart Helper] Successfully cleared ${itemIds.length} items from cart.`);
      return { success: true, message: "Cart items cleared successfully" };
    } else {
      console.error(`[Cart Helper] Failed to clear items: ${removeResp.data.message}`);
      return {
        success: false,
        message: removeResp.data.message || "Failed to remove cart items",
      };
    }
  } catch (error: any) {
    console.error("Cart helper error:", error?.response?.data || error.message);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Cart operation failed",
    };
  }
}
