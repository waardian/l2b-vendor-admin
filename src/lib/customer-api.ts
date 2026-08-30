import { apiFetch, apiUpload } from "./http";
import type {
  CustomerOrder,
  CustomerProfile,
  CustomerSession,
  OtpChallenge,
  PlaceOrderPayload,
  SkuAttachment,
  SkuOption,
} from "./customer-types";

const TOKEN_KEY = "l2b_customer_access_token";

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setCustomerToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearCustomerToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  return apiFetch<T>(`/customer${path}`, {
    method,
    body,
    token: auth ? getCustomerToken() : null,
  });
}

export const customerApi = {
  signup: (payload: { name: string; phone: string; email?: string | null }) =>
    request<OtpChallenge>("/auth/signup", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (phone: string) =>
    request<OtpChallenge>("/auth/login", {
      method: "POST",
      body: { phone },
      auth: false,
    }),

  verify: (phone: string, otpCode: string) =>
    request<CustomerSession>("/auth/verify", {
      method: "POST",
      body: { phone, otp_code: otpCode },
      auth: false,
    }),

  me: () => request<{ data: CustomerProfile }>("/me").then((r) => r.data),

  listSkus: () => request<{ data: SkuOption[] }>("/skus").then((r) => r.data),

  listSkuAttachments: (skuId: number) =>
    request<{ data: SkuAttachment[] }>(`/skus/${skuId}/attachments`).then((r) => r.data),

  uploadSiteImage: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiUpload<{ data: string }>(
      "/customer/site-images",
      form,
      getCustomerToken()
    ).then((r) => r.data);
  },

  listOrders: () =>
    request<{ data: CustomerOrder[] }>("/orders").then((r) => r.data),

  placeOrder: (payload: PlaceOrderPayload) =>
    request<{ data: CustomerOrder }>("/orders", {
      method: "POST",
      body: payload,
    }).then((r) => r.data),

  requestExtension: (orderId: string, hours: number) =>
    request<{ data: CustomerOrder }>(`/orders/${orderId}/extension`, {
      method: "POST",
      body: { extended_by_hours: hours },
    }).then((r) => r.data),

  cancelOrder: (orderId: string, reason: string) =>
    request<{ data: CustomerOrder }>(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: { reason },
    }).then((r) => r.data),

  listAddresses: () =>
    request<{ data: import("./customer-types").UserAddress[] }>("/addresses").then((r) => r.data),

  createAddress: (payload: import("./customer-types").UserAddressInput) =>
    request<{ data: import("./customer-types").UserAddress }>("/addresses", {
      method: "POST",
      body: payload,
    }).then((r) => r.data),

  updateAddress: (addressId: string, payload: import("./customer-types").UserAddressInput) =>
    request<{ data: import("./customer-types").UserAddress }>(`/addresses/${addressId}`, {
      method: "PUT",
      body: payload,
    }).then((r) => r.data),

  deleteAddress: (addressId: string) =>
    request<{ success: boolean }>(`/addresses/${addressId}`, {
      method: "DELETE",
    }),

  setDefaultAddress: (addressId: string) =>
    request<{ data: import("./customer-types").UserAddress }>(`/addresses/${addressId}/default`, {
      method: "PATCH",
    }).then((r) => r.data),

  listMaterialOrders: () =>
    request<{ data: import("./customer-types").MaterialOrder[] }>("/material-orders").then((r) => r.data),

  quoteMaterialOrder: (payload: {
    delivery_mode?: string;
    items: import("./customer-types").MaterialOrderItemInput[];
  }) =>
    request<{ data: import("./customer-types").MaterialOrderQuote }>(
      "/material-orders/quote",
      { method: "POST", body: payload }
    ).then((r) => r.data),

  placeMaterialOrder: (payload: import("./customer-types").PlaceMaterialOrderPayload) =>
    request<{ data: import("./customer-types").MaterialOrder }>("/material-orders", {
      method: "POST",
      body: payload,
    }).then((r) => r.data),

  getMaterialOrder: (orderId: string) =>
    request<{ data: import("./customer-types").MaterialOrder }>(`/material-orders/${orderId}`).then((r) => r.data),

  cancelMaterialOrder: (orderId: string, reason?: string) =>
    request<{ data: import("./customer-types").MaterialOrder }>(`/material-orders/${orderId}/cancel`, {
      method: "POST",
      body: { reason },
    }).then((r) => r.data),

  listMaterialCategories: () =>
    request<{ data: import("./customer-types").MaterialCategory[] }>("/material-catalog/categories").then((r) => r.data),

  listMaterialProducts: (categoryId?: string) =>
    request<{ data: import("./customer-types").MaterialProduct[] }>(
      `/material-catalog/products${categoryId ? `?category_id=${categoryId}` : ""}`
    ).then((r) => r.data),

  getDeliveryModes: () =>
    request<{ data: { modes: import("./customer-types").DeliveryMode[] } }>("/delivery-modes").then(
      (r) => r.data.modes
    ),
};
