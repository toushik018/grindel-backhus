"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ProductItem from "@/components/Products/ProductItem";
import Loading from "@/components/Loading";
import {
  useGetCartQuery,
  useEditProductMutation,
  useRemoveProductMutation,
  useGetProductByIdQuery,
} from "@/services/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
interface CartItem {
  product_id: number;
  cart_id: string;
  name?: string;
  thumb?: string;
  price?: string;
  quantity: number;
  leadTime?: string;
}

const Cart: React.FC = () => {
  const router = useRouter();
  const {
    data: cartData,
    isLoading: isCartLoading,
    error: cartError,
    refetch,
  } = useGetCartQuery();
  const [editProduct] = useEditProductMutation();
  const [removeProduct] = useRemoveProductMutation();

  const cartItems = useMemo(() => {
    return (
      cartData?.products?.map((product: CartItem) => ({
        ...product,
        price: parseFloat(product.price || "0"),
      })) || []
    );
  }, [cartData]);

  const { subTotal, totalPrice } = useMemo(() => {
    if (Array.isArray(cartItems)) {
      const subTotal = cartItems.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0
      );
      const totalItem = cartData?.totals?.find(
        (item: { title: string }) => item.title === "Total"
      );
      const totalPrice = totalItem
        ? parseFloat(totalItem.text.replace(/[^0-9.]/g, ""))
        : subTotal;
      return {
        subTotal: subTotal.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
      };
    }
    return { subTotal: "0.00", totalPrice: "0.00" };
  }, [cartItems, cartData]);

  const handleIncrement = async (item: CartItem) => {
    try {
      const newQuantity = Number(item.quantity) + 1;
      await editProduct({ id: item.cart_id, quantity: newQuantity });
      await refetch();
      toast.success("Item quantity increased");
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const handleDecrement = async (item: CartItem) => {
    if (Number(item.quantity) > 1) {
      try {
        const newQuantity = Number(item.quantity) - 1;
        await editProduct({ id: item.cart_id, quantity: newQuantity });
        await refetch();
        toast.success("Item quantity decreased");
      } catch (error) {
        toast.error("Failed to update quantity");
      }
    } else {
      handleRemove(item);
    }
  };

  const handleRemove = async (item: CartItem) => {
    try {
      await removeProduct({ id: item.cart_id, quantity: 0 });
      await refetch();
      toast.success("Item removed from cart");
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleCheckout = () => {
    const menuContents = cartData?.cart?.menu?.contents || [];
    for (const content of menuContents) {
      const requiredCount = content.count || 0;
      const currentCount = content.currentCount || 0;

      if (currentCount < requiredCount) {
        toast.error(
          `Please select at least ${requiredCount} ${content.name} item${
            requiredCount > 1 ? "s" : ""
          }. You have selected ${currentCount}.`
        );
        return;
      }
    }
    router.push("/checkout");
  };

  if (isCartLoading) return <Loading />;
  if (cartError) return <div>Error loading cart data</div>;

  return (
    <div className="min-h-screen py-28 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:container w-full mx-auto"
      >
        <div className="bg-green-50 rounded-2xl shadow-md p-6 md:p-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-800">Your Cart</h1>

          {cartItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-12"
            >
              <p className="text-xl text-gray-600 mb-6">Your cart is empty</p>
              <Link
                href="/"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-full font-semibold transition-colors hover:bg-green-700"
              >
                Order Now
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-5 gap-4 mb-4 font-semibold text-gray-700 border-b pb-2">
                <div className="col-span-2">Product</div>
                <div className="text-center">Price</div>
                <div className="text-center">Quantity</div>
                <div className="text-right">Total</div>
              </div>
              <div className="md:hidden grid grid-cols-3 gap-4 mb-4 font-semibold text-gray-700 border-b pb-2">
                <div>Product</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Action</div>
              </div>
              <AnimatePresence>
                {cartItems.map((item: CartItem) => (
                  <CartItemWithDetails
                    key={item.product_id}
                    item={item}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onRemove={handleRemove}
                  />
                ))}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 flex flex-col md:flex-row justify-between items-center"
              >
                <div className="text-xl font-bold text-gray-800 mb-4 md:mb-2 space-y-2">
                  <div>
                    Sub-Total:{" "}
                    <span className="text-green-600">{subTotal} €</span>
                  </div>
                  <div>
                    Total:{" "}
                    <span className="text-green-600">{totalPrice} €</span>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="inline-block bg-green-600 text-white px-8 py-3 rounded-full font-semibold transition-all hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-1"
                >
                  Proceed to Checkout
                </button>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const CartItemWithDetails: React.FC<{
  item: CartItem;
  onIncrement: (item: CartItem) => void;
  onDecrement: (item: CartItem) => void;
  onRemove: (item: CartItem) => void;
}> = ({ item, onIncrement, onDecrement, onRemove }) => {
  const { data: productDetails, isLoading, error } = useGetProductByIdQuery(
    item.product_id.toString()
  );

  if (isLoading) {
    return (
      <div className="flex justify-start items-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  if (error || !productDetails || !productDetails.products || productDetails.products.length === 0) {
    return (
      <div className="flex justify-start items-center py-4 text-red-500">
        Error loading product details. Please try again later.
      </div>
    );
  }

  const product = {
    ...item,
    ...productDetails.products[0],
  };

  return (
    <ProductItem
      product={product}
      onIncrement={() => onIncrement(item)}
      onDecrement={() => onDecrement(item)}
      onRemove={() => onRemove(item)}
    />
  );
};

export default Cart;
