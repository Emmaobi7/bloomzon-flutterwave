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

    // here am fetching the ids associated with the order
    const idsResp = await axios.get<OrderIdsResponse>(
      `${orderBaseUrl}/ids/${orderId}`,
      { timeout: 10000 },
    );

    console.log("IDs==>:", idsResp.data);

    if (!idsResp.data.success || !idsResp.data.data) {
      return { success: false, message: "Failed to fetch order item IDs" };
    }

    const itemIds = idsResp.data.data.item_ids;
    if (!itemIds || itemIds.length === 0) {
      return { success: true, message: "No items found for order" };
    }

    // here am removing the items from the cart using PATCH and include the owner
    const removeResp = await axios.patch(
      `${cartBaseUrl}`,
      { user_id: userId, cart_item_id: itemIds },
      { timeout: 10000 },
    );

    if (removeResp.data.success) {
       console.log("Cart items successfully cleared.");
      return { success: true, message: "Cart items cleared successfully" };
    } else {
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
