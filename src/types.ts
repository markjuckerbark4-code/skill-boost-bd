export type PackageLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'IELTS & Career'
  | '1-on-1 Coaching';

export interface CoursePackage {
  id: string;
  title: string;
  subtitle: string;
  level: PackageLevel;
  duration: string;
  format: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  features: string[];
  featured: boolean;
  active: boolean;
  seatsLabel: string;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type OrderStatus = 'pending' | 'verified' | 'rejected';

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  packageId: string;
  packageTitle: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  batchPreference: string;
  paymentMethod: string;
  senderNumber: string;
  trxId: string;
  couponCode: string;
  discountAmount: number;
  originalAmount: number;
  finalPrice: number;
  currency: string;
  status: OrderStatus;
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderLookup {
  orderCode: string;
  orderId: string;
  packageTitle: string;
  finalPrice: number;
  currency: string;
  paymentMethod: string;
  batchPreference: string;
  status: OrderStatus;
  adminNote: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  description: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type InquiryStatus = 'new' | 'contacted' | 'enrolled';

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  currentLevel: string;
  goal: string;
  status: InquiryStatus;
  createdAt?: unknown;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  outcome: string;
  quote: string;
}

export interface StorefrontSettings {
  storeName: string;
  announcementEnabled: boolean;
  announcementText: string;
  heroHeadline: string;
  heroSubheadline: string;
  enrollmentOpen: boolean;
  currencySymbol: string;
  currencyCode: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  instructorName: string;
  instructorBio: string;
  testimonials: Testimonial[];
  updatedAt?: unknown;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'mobile_wallet' | 'bank' | 'card';
  enabled: boolean;
  accountType: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
}

export interface PaymentSettings {
  methods: PaymentMethodConfig[];
  autoConfirmNote: string;
  updatedAt?: unknown;
}
