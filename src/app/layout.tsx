import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Home/Navbar/Navbar";
import Footer from "@/components/Home/Footer/Footer";
import ClientLayout from "./client-layout";
import Providers from "@/redux/provider";
import { store } from "@/redux/store";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Grindel Backhus",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers store={store}>
          <Navbar />
          <ClientLayout>
            {children}

            <Toaster richColors position="top-right" />
          </ClientLayout>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
