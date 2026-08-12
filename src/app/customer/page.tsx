"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCustomerToken } from "@/lib/customer-api";

export default function CustomerHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getCustomerToken() ? "/customer/orders" : "/customer/login");
  }, [router]);

  return null;
}
