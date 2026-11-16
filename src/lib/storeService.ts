import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_COUPONS,
  DEFAULT_PACKAGES,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
} from '../defaults';
import {
  Coupon,
  CoursePackage,
  Inquiry,
  InquiryStatus,
  Order,
  OrderLookup,
  OrderStatus,
  PaymentSettings,
  StorefrontSettings,
} from '../types';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

export const SUPER_ADMIN_EMAIL = 'markjuckerbark4@gmail.com';

export async function verifyAdminAccess(
  uid: string,
  email: string | null,
  emailVerified: boolean
): Promise<boolean> {
  if (!emailVerified) return false;
  if (email === SUPER_ADMIN_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export function subscribePackages(
  onData: (packages: CoursePackage[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'packages';
  const q = query(collection(db, path), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CoursePackage[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CoursePackage, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function savePackage(
  pkg: Omit<CoursePackage, 'createdAt' | 'updatedAt'>,
  isNew: boolean
) {
  const path = `packages/${pkg.id}`;
  try {
    const ref = doc(db, 'packages', pkg.id);
    const payload = {
      title: pkg.title.trim().slice(0, 120),
      subtitle: pkg.subtitle.trim().slice(0, 240),
      level: pkg.level,
      duration: pkg.duration.trim().slice(0, 60),
      format: pkg.format.trim().slice(0, 80),
      price: Number(pkg.price) || 0,
      originalPrice: Number(pkg.originalPrice) || 0,
      imageUrl: pkg.imageUrl.trim().slice(0, 500),
      features: pkg.features
        .map((f) => f.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 12),
      featured: Boolean(pkg.featured),
      active: Boolean(pkg.active),
      seatsLabel: pkg.seatsLabel.trim().slice(0, 60),
      sortOrder: Number(pkg.sortOrder) || 0,
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deletePackageById(id: string) {
  const path = `packages/${id}`;
  try {
    await deleteDoc(doc(db, 'packages', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeStorefrontSettings(
  onData: (settings: StorefrontSettings | null) => void
) {
  const path = 'settings/storefront';
  return onSnapshot(
    doc(db, 'settings', 'storefront'),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as StorefrontSettings);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function saveStorefrontSettings(settings: StorefrontSettings) {
  const path = 'settings/storefront';
  try {
    await setDoc(doc(db, 'settings', 'storefront'), {
      storeName: settings.storeName.trim().slice(0, 100),
      announcementEnabled: Boolean(settings.announcementEnabled),
      announcementText: settings.announcementText.trim().slice(0, 200),
      heroHeadline: settings.heroHeadline.trim().slice(0, 200),
      heroSubheadline: settings.heroSubheadline.trim().slice(0, 400),
      enrollmentOpen: Boolean(settings.enrollmentOpen),
      currencySymbol: settings.currencySymbol.trim().slice(0, 10),
      currencyCode: settings.currencyCode.trim().slice(0, 10),
      supportPhone: settings.supportPhone.trim().slice(0, 40),
      supportEmail: settings.supportEmail.trim().slice(0, 150),
      whatsappNumber: settings.whatsappNumber.trim().slice(0, 40),
      instructorName: settings.instructorName.trim().slice(0, 100),
      instructorBio: settings.instructorBio.trim().slice(0, 400),
      testimonials: settings.testimonials.slice(0, 10),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribePaymentSettings(
  onData: (settings: PaymentSettings | null) => void
) {
  const path = 'settings/payments';
  return onSnapshot(
    doc(db, 'settings', 'payments'),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as PaymentSettings);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function savePaymentSettings(settings: PaymentSettings) {
  const path = 'settings/payments';
  try {
    await setDoc(doc(db, 'settings', 'payments'), {
      methods: settings.methods.slice(0, 10),
      autoConfirmNote: settings.autoConfirmNote.trim().slice(0, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function validateCouponCode(rawCode: string): Promise<Coupon | null> {
  const normalized = rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!normalized || normalized.length < 2) return null;
  const path = `coupons/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'coupons', normalized));
    if (snap.exists()) {
      const data = snap.data() as Omit<Coupon, 'id'>;
      if (data.active) {
        return { id: snap.id, ...data };
      }
      return null;
    }
    // Check default starter coupons if database hasn't been seeded yet
    const fallback = DEFAULT_COUPONS.find(
      (c) => c.code === normalized && c.active
    );
    return fallback ?? null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeCoupons(onData: (coupons: Coupon[]) => void) {
  const path = 'coupons';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Coupon, 'id'>),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveCoupon(
  coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>,
  isNew: boolean
) {
  const code = coupon.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 30);
  const path = `coupons/${code}`;
  try {
    const ref = doc(db, 'coupons', code);
    const payload = {
      code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue) || 0,
      description: coupon.description.trim().slice(0, 150),
      active: Boolean(coupon.active),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deleteCouponById(code: string) {
  const path = `coupons/${code}`;
  try {
    await deleteDoc(doc(db, 'coupons', code));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createOrderWithLookup(params: {
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
}): Promise<string> {
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `AHE-2026-${randomDigits}`;
  const userId = auth.currentUser ? auth.currentUser.uid : 'guest';
  const batch = writeBatch(db);

  const orderRef = doc(db, 'orders', orderId);
  const lookupRef = doc(db, 'orderLookups', orderCode);

  batch.set(orderRef, {
    orderCode,
    userId,
    packageId: params.packageId.slice(0, 128),
    packageTitle: params.packageTitle.trim().slice(0, 120),
    studentName: params.studentName.trim().slice(0, 100),
    studentEmail: params.studentEmail.trim().slice(0, 150),
    studentPhone: params.studentPhone.trim().slice(0, 40),
    batchPreference: params.batchPreference.trim().slice(0, 60),
    paymentMethod: params.paymentMethod.trim().slice(0, 60),
    senderNumber: params.senderNumber.trim().slice(0, 60),
    trxId: params.trxId.trim().slice(0, 80),
    couponCode: params.couponCode.trim().slice(0, 40),
    discountAmount: Number(params.discountAmount) || 0,
    originalAmount: Number(params.originalAmount) || 0,
    finalPrice: Number(params.finalPrice) || 0,
    currency: params.currency.trim().slice(0, 10),
    status: 'pending',
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(lookupRef, {
    orderCode,
    orderId,
    packageTitle: params.packageTitle.trim().slice(0, 120),
    finalPrice: Number(params.finalPrice) || 0,
    currency: params.currency.trim().slice(0, 10),
    paymentMethod: params.paymentMethod.trim().slice(0, 60),
    batchPreference: params.batchPreference.trim().slice(0, 60),
    status: 'pending',
    adminNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return orderCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function lookupOrderByCode(
  rawCode: string
): Promise<OrderLookup | null> {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!code || code.length < 4) return null;
  const path = `orderLookups/${code}`;
  try {
    const snap = await getDoc(doc(db, 'orderLookups', code));
    if (!snap.exists()) return null;
    return snap.data() as OrderLookup;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeOrders(onData: (orders: Order[]) => void) {
  const path = 'orders';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Order, 'id'>),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function updateOrderVerificationStatus(
  order: Order,
  status: OrderStatus,
  adminNote: string
) {
  const batch = writeBatch(db);
  const cleanNote = adminNote.trim().slice(0, 300);

  batch.update(doc(db, 'orders', order.id), {
    status,
    adminNote: cleanNote,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, 'orderLookups', order.orderCode), {
    status,
    adminNote: cleanNote,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

export async function deleteOrderById(order: Order) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'orders', order.id));
  batch.delete(doc(db, 'orderLookups', order.orderCode));
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${order.id}`);
  }
}

export async function submitInquiry(params: {
  name: string;
  phone: string;
  email: string;
  currentLevel: string;
  goal: string;
}) {
  const id = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `inquiries/${id}`;
  try {
    await setDoc(doc(db, 'inquiries', id), {
      name: params.name.trim().slice(0, 100),
      phone: params.phone.trim().slice(0, 40),
      email: params.email.trim().slice(0, 150),
      currentLevel: params.currentLevel.trim().slice(0, 60),
      goal: params.goal.trim().slice(0, 400),
      status: 'new',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeInquiries(onData: (inquiries: Inquiry[]) => void) {
  const path = 'inquiries';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Inquiry, 'id'>),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  const path = `inquiries/${id}`;
  try {
    await updateDoc(doc(db, 'inquiries', id), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInquiryById(id: string) {
  const path = `inquiries/${id}`;
  try {
    await deleteDoc(doc(db, 'inquiries', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedInitialStoreData() {
  const batch = writeBatch(db);

  for (const pkg of DEFAULT_PACKAGES) {
    batch.set(doc(db, 'packages', pkg.id), {
      title: pkg.title,
      subtitle: pkg.subtitle,
      level: pkg.level,
      duration: pkg.duration,
      format: pkg.format,
      price: pkg.price,
      originalPrice: pkg.originalPrice,
      imageUrl: pkg.imageUrl,
      features: pkg.features,
      featured: pkg.featured,
      active: pkg.active,
      seatsLabel: pkg.seatsLabel,
      sortOrder: pkg.sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const coupon of DEFAULT_COUPONS) {
    batch.set(doc(db, 'coupons', coupon.code), {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description,
      active: coupon.active,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'settings', 'storefront'), {
    ...DEFAULT_STOREFRONT_SETTINGS,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'settings', 'payments'), {
    ...DEFAULT_PAYMENT_SETTINGS,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_store');
  }
}
