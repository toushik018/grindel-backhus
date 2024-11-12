"use client";

import React, { useMemo, useState } from "react";
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
import { useRouter } from "next/navigation";
import { CartItemSkeleton } from "@/components/Skeletons/CartSkeleton";
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
  console.log(cartData);
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
      const response = await editProduct({
        id: item.cart_id,
        quantity: newQuantity,
      }).unwrap();
      await refetch();
      console.log(response.success);
      if (response.success) {
        toast.success("Artikelmenge erhöht");
      } else {
        toast.error("Fehler beim Erhöhen der Artikelmenge");
      }
    } catch (error: any) {
      toast.error(error.data?.message || "Fehler beim Erhöhen der Artikelmenge");
    }
  };

  const handleDecrement = async (item: CartItem) => {
    if (Number(item.quantity) > 1) {
      try {
        const newQuantity = Number(item.quantity) - 1;
        const response = await editProduct({
          id: item.cart_id,
          quantity: newQuantity,
        }).unwrap();
        await refetch();

        if (response.success) {
          toast.success("Artikelmenge verringert");
        } else {
          toast.error("Fehler beim Verringern der Artikelmenge");
        }
      } catch (error: any) {
        toast.error(error.data?.message || "Fehler beim Verringern der Artikelmenge");
      }
    } else {
      handleRemove(item);
    }
  };

  const handleRemove = async (item: CartItem) => {
    try {
      const response = await removeProduct({
        id: item.cart_id,
        quantity: 0,
      }).unwrap();
      await refetch();

      if (response.success) {
        toast.success(response.message || "Artikel aus dem Warenkorb entfernt");
      } else {
        toast.error(response.message || "Fehler beim Entfernen des Artikels");
      }
    } catch (error: any) {
      toast.error(error.data?.message || "Fehler beim Entfernen des Artikels");
    }
  };

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    const menuContents = cartData?.cart?.menu?.contents || [];

    try {
      for (const content of menuContents) {
        // Fetch products for this category
        const productPromises = content.ids.map((id: number) =>
          fetch(`/api/get-products-by-category`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ categoryId: id.toString() }),
          }).then((res) => res.json())
        );

        const results = await Promise.all(productPromises);
        const categoryProducts = results.reduce((acc, result) => {
          if (result.products) {
            return [...acc, ...result.products];
          }
          return acc;
        }, []);

        const requiredCount = content.count || 0;
        const currentCount = cartData?.products?.reduce((sum: number, product: any) => {
          const isInCategory = categoryProducts.some(
            (p: any) => p.product_id.toString() === product.product_id.toString()
          );

          return isInCategory ? sum + Number(product.quantity) : sum;
        }, 0) || 0;

        if (currentCount < requiredCount) {
          toast.error(
            `Bitte wählen Sie mindestens ${requiredCount} ${content.name} Artikel${
              requiredCount > 1 ? "s" : ""
            }. Sie haben ${currentCount} ausgewählt.`
          );
          setIsCheckingOut(false);
          return;
        }
      }
      router.push("/checkout");
    } catch (error) {
      console.error("Fehler beim Validieren der Artikel im Warenkorb:", error);
      toast.error("Fehler beim Validieren der Artikel im Warenkorb. Bitte versuchen Sie es erneut.");
      setIsCheckingOut(false);
    }
  };

  if (isCartLoading) return <Loading />;
  if (cartError) return <div>Fehler beim Laden der Warenkorb-Daten</div>;

  return (
    <div className="min-h-screen py-28 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:container w-full mx-auto"
      >
        <div className="bg-green-50 rounded-2xl shadow-md p-6 md:p-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-800">Ihr Warenkorb</h1>

          {cartItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-12"
            >
              <p className="text-xl text-gray-600 mb-6">Ihr Warenkorb ist leer</p>
              <Link
                href="/"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-full font-semibold transition-colors hover:bg-green-700"
              >
                Bestellen
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="hidden md:grid grid-cols-5 gap-4 mb-4 font-semibold text-gray-700 border-b pb-2">
                <div className="col-span-2">Produkt</div>
                <div className="text-center">Preis</div>
                <div className="text-center">Menge</div>
                <div className="text-right">Total</div>
              </div>
              <div className="md:hidden grid grid-cols-3 gap-4 mb-4 font-semibold text-gray-700 border-b pb-2">
                <div>Produkt</div>
                <div className="text-center">Menge</div>
                <div className="text-right">Aktion</div>
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
                    Zwischensumme:{" "}
                    <span className="text-green-600">{subTotal} €</span>
                  </div>
                  <div>
                    Gesamt:{" "}
                    <span className="text-green-600">{totalPrice} €</span>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className={`inline-block ${
                    isCheckingOut ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                  } text-white px-8 py-3 rounded-full font-semibold transition-all hover:shadow-lg transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-none`}
                >
                  {isCheckingOut ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Überprüfung...</span>
                    </div>
                  ) : (
                    'Weiter zur Kasse'
                  )}
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
  const {
    data: productDetails,
    isLoading,
    error,
  } = useGetProductByIdQuery(item.product_id.toString());

  if (isLoading) {
    return <CartItemSkeleton />;
  }

  if (
    error ||
    !productDetails ||
    !productDetails.products ||
    productDetails.products.length === 0
  ) {
    return (
      <div className="flex justify-start items-center py-4 text-red-500">
        Fehler beim Laden der Produkt-Details. Bitte versuchen Sie es später erneut.
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
