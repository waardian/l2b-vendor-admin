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
