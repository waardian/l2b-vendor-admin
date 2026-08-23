export interface OtpChallenge {
  success: boolean;
  message: string;
  phone: string;
  is_new_user: boolean;
  dev_otp: string | null;
}

export interface CustomerProfile {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string | null;
}

export interface CustomerSession {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  profile: CustomerProfile;
}

export interface SkuOption {
  id: number;
  name: string;
  capacity: string;
  base_price: number;
  price_unit: string | null;
  pricing_unit: string | null;
  min_booking_hours: number | null;
  can_extend: boolean;
  sub_category: string | null;
  vendor_ready: boolean;
}

export interface SkuAttachment {
  id: number;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
}

export interface OrderAttachment {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sku_attachment_id: number | null;
}

export interface OrderAmounts {
  base_amount: number;
  attachment_amount: number;
  diesel_surcharge: number;
  toll_charges: number;
  discount_amount: number;
  coupon_discount: number;
  extension_amount: number;
  total_amount: number;
  coupon_code: string | null;
  computed_total: number;
  price_adjustment: number;
}

export interface OrderPayment {
  id: string;
  method: string;
  status: string;
  gateway: string;
  amount: number;
  reference: string | null;
}

export interface OrderExtension {
  id: string;
  extended_by_hours: number;
  extension_cost: number;
  status: string;
  extend_till: string;
  requested_at: string | null;
  response_deadline: string | null;
  rejection_reason: string | null;
}

export interface CustomerOrder {
  id: string;
  booking_number: string;
  status: string;
  sku_id: number | null;
  sku_name: string;
  scheduled_start: string;
  scheduled_end: string;
  created_at: string;
  amounts: OrderAmounts;
  hours_booked: number | null;
  actual_start: string | null;
  actual_end: string | null;
  site_address: string | null;
  work_type: string | null;
  purpose: string | null;
  start_otp: string | null;
  end_otp: string | null;
  start_otp_verified_at: string | null;
  end_otp_verified_at: string | null;
  is_extended: boolean;
  task_paused_at: string | null;
  cancellation_reason: string | null;
  assigned_operator_name: string | null;
  can_request_extension: boolean;
  can_cancel: boolean;
  payment: OrderPayment | null;
  attachments: OrderAttachment[];
  site_images: string[];
  pending_extension: OrderExtension | null;
  extensions: OrderExtension[];
}

export interface AttachmentInput {
  name: string;
  quantity: number;
  unit_price: number;
  sku_attachment_id?: number | null;
}

export interface PlaceOrderPayload {
  sku_id: number;
  scheduled_start: string;
  scheduled_end: string;
  payment_method: "cod" | "juspay";
  attachments?: AttachmentInput[];
  site_images?: string[];
  diesel_surcharge?: number;
  toll_charges?: number;
  discount_amount?: number;
  coupon_code?: string | null;
  coupon_discount?: number;
  extension_amount?: number;
  attachment_amount?: number | null;
  total_amount?: number | null;
  site_address?: string | null;
  site_lat?: number | null;
  site_lng?: number | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
  sender_name?: string | null;
  sender_contact?: string | null;
  receiver_name?: string | null;
  receiver_contact?: string | null;
  work_type?: string | null;
  type_of_load?: string | null;
  soil_type?: string | null;
  purpose?: string | null;
  dump_location_address?: string | null;
  estimated_km?: number | null;
  notes?: string | null;
  base_amount?: number | null;
}

export interface UserAddress {
  id: string;
  label?: string | null;
  house_no?: string | null;
  area_locality?: string | null;
  landmark?: string | null;
  full_address: string;
  pincode?: string | null;
  state_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_default: boolean;
  created_at?: string | null;
}

export interface UserAddressInput {
  label?: string;
  house_no?: string;
  area_locality?: string;
  landmark?: string;
  full_address: string;
  pincode?: string;
  state_code?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

export interface MaterialOrderItem {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  variant_id?: string | null;
  variant_name?: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  unit?: string | null;
  specifications?: Record<string, string> | null;
  qty: number;
  unit_price: number;
  line_total: number;
  image_url?: string | null;
}

export interface MaterialOrderStatusHistory {
  id: string;
  from_status?: string | null;
  to_status: string;
  actor_role?: string | null;
  reason_code?: string | null;
  created_at: string;
}

export interface MaterialSubOrderItem {
  id: string;
  order_item_id: string;
  product_name?: string | null;
  variant_name?: string | null;
  brand_name?: string | null;
  unit?: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface MaterialSubOrder {
  id: string;
  sub_order_number: string;
  status: string;
  vendor_id: string;
  vendor_name?: string | null;
  vendor_phone?: string | null;
  warehouse_name?: string | null;
  delivery_otp?: string | null;
  ready_at?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  delivery_booking_id?: string | null;
  delivery_booking_number?: string | null;
  delivery_booking_status?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_name?: string | null;
  vehicle_registration?: string | null;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  grand_total: number;
  items: MaterialSubOrderItem[];
}

export interface MaterialOrder {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  grand_total: number;
  payment_mode?: "online" | "cod";
  delivery_mode?: string | null;
  scheduled_delivery_date?: string | null;
  delivery_otp?: string | null;
  delivery_address?: UserAddress | null;
  items: MaterialOrderItem[];
  sub_orders?: MaterialSubOrder[];
  status_history: MaterialOrderStatusHistory[];
  can_cancel: boolean;
  cancellation_reason?: string | null;
  created_at: string;
}

export interface MaterialOrderItemInput {
  variant_id: string;
  brand_id?: string;
  qty: number;
}

export interface MaterialOrderQuoteLine {
  variant_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
  hsn_code?: string | null;
  tax_rate_pct: number;
  tax_amount: number;
}

export interface MaterialOrderQuote {
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  surcharge_amount: number;
  grand_total: number;
  lines: MaterialOrderQuoteLine[];
}

export interface PlaceMaterialOrderPayload {
  delivery_address_id: string;
  delivery_mode?: string;
  scheduled_delivery_date?: string;
  payment_mode?: "online" | "cod";
  items: MaterialOrderItemInput[];
}

export interface MaterialSubcategory {
  id: string;
  name: string;
  slug: string;
  hero_image_url?: string | null;
}

export interface MaterialCategory {
  id: string;
  name: string;
  slug: string;
  hero_image_url?: string | null;
  subcategories: MaterialSubcategory[];
}

export interface MaterialVariantBrandPrice {
  brand_id: string;
  brand_name: string;
  unit_price: number;
}

export interface MaterialProductVariant {
  id: string;
  name: string;
  unit: string;
  attributes: Record<string, string>;
  brands: MaterialVariantBrandPrice[];
}

export interface MaterialProduct {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  hsn_code?: string | null;
  variants: MaterialProductVariant[];
}

export interface DeliveryMode {
  mode: string;
  label: string;
  surcharge_amount: string;
  eta_date: string | null;
}
