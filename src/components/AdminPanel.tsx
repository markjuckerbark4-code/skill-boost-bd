import { signInWithPopup, signOut, User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_STOREFRONT_SETTINGS,
  PRESET_IMAGES,
} from '../defaults';
import { auth, googleProvider } from '../lib/firebase';
import {
  deleteCouponById,
  deleteInquiryById,
  deleteOrderById,
  deletePackageById,
  saveCoupon,
  savePackage,
  savePaymentSettings,
  saveStorefrontSettings,
  seedInitialStoreData,
  subscribeCoupons,
  subscribeInquiries,
  subscribeOrders,
  updateInquiryStatus,
  updateOrderVerificationStatus,
} from '../lib/storeService';
import {
  Coupon,
  CoursePackage,
  Inquiry,
  InquiryStatus,
  Order,
  OrderStatus,
  PackageLevel,
  PaymentMethodConfig,
  PaymentSettings,
  StorefrontSettings,
} from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface AdminPanelProps {
  user: User | null;
  authLoading: boolean;
  isAdmin: boolean;
  packages: CoursePackage[];
  hasDbPackages: boolean;
  storefront: StorefrontSettings;
  paymentSettings: PaymentSettings;
  onNavigateStorefront: () => void;
}

type AdminTab =
  | 'overview'
  | 'orders'
  | 'packages'
  | 'payments'
  | 'coupons'
  | 'settings'
  | 'inquiries';

const LEVEL_OPTIONS: PackageLevel[] = [
  'Beginner',
  'Intermediate',
  'IELTS & Career',
  '1-on-1 Coaching',
];

export function AdminPanel({
  user,
  authLoading,
  isAdmin,
  packages,
  hasDbPackages,
  storefront,
  paymentSettings,
  onNavigateStorefront,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin Passcode Gate (/admin login)
  const [passcodeVerified, setPasscodeVerified] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ahe_admin_unlocked') === '1';
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Admin Firestore subscriptions (only active when verified admin)
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Orders filters & inspection
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [orderUpdating, setOrderUpdating] = useState(false);

  // Package Modal State
  const [editingPkg, setEditingPkg] = useState<CoursePackage | null>(null);
  const [isNewPkg, setIsNewPkg] = useState(false);
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgSubtitle, setPkgSubtitle] = useState('');
  const [pkgLevel, setPkgLevel] = useState<PackageLevel>('Beginner');
  const [pkgDuration, setPkgDuration] = useState('8 Weeks');
  const [pkgFormat, setPkgFormat] = useState('Live Zoom + Practice Labs');
  const [pkgPrice, setPkgPrice] = useState('3500');
  const [pkgOriginalPrice, setPkgOriginalPrice] = useState('5000');
  const [pkgSeatsLabel, setPkgSeatsLabel] = useState('10 seats remaining');
  const [pkgImageUrl, setPkgImageUrl] = useState(PRESET_IMAGES[0].url);
  const [pkgSortOrder, setPkgSortOrder] = useState('1');
  const [pkgFeatured, setPkgFeatured] = useState(false);
  const [pkgActive, setPkgActive] = useState(true);
  const [pkgFeaturesText, setPkgFeaturesText] = useState('');
  const [pkgSaving, setPkgSaving] = useState(false);

  // Payment Settings Form State
  const [paymentDraft, setPaymentDraft] = useState<PaymentSettings>(
    paymentSettings || DEFAULT_PAYMENT_SETTINGS
  );
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Storefront Settings Form State
  const [storefrontDraft, setStorefrontDraft] = useState<StorefrontSettings>(
    storefront || DEFAULT_STOREFRONT_SETTINGS
  );
  const [storefrontSaving, setStorefrontSaving] = useState(false);

  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed'>('percent');
  const [couponValue, setCouponValue] = useState('15');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponSaving, setCouponSaving] = useState(false);

  useEffect(() => {
    setPaymentDraft(paymentSettings);
  }, [paymentSettings]);

  useEffect(() => {
    setStorefrontDraft(storefront);
  }, [storefront]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubOrders = subscribeOrders(setOrders);
    const unsubCoupons = subscribeCoupons(setCoupons);
    const unsubInquiries = subscribeInquiries(setInquiries);
    return () => {
      unsubOrders();
      unsubCoupons();
      unsubInquiries();
    };
  }, [isAdmin]);

  function notify(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }

  async function handleGoogleLogin() {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
      );
    }
  }

  function handlePasscodeSubmit(e: FormEvent) {
    e.preventDefault();
    setPasscodeError(null);
    const expected = atob('RVNBMDA2IyM=');
    if (passcodeInput.trim() === expected) {
      try {
        sessionStorage.setItem('ahe_admin_unlocked', '1');
      } catch {
        // ignore storage errors
      }
      setPasscodeVerified(true);
      setPasscodeInput('');
    } else {
      setPasscodeError('Incorrect admin password. Please try again.');
    }
  }

  function handleLockAdmin() {
    try {
      sessionStorage.removeItem('ahe_admin_unlocked');
    } catch {
      // ignore storage errors
    }
    setPasscodeVerified(false);
  }

  function requireCloudAdmin(): boolean {
    if (!isAdmin) {
      notify('Please click "Connect Cloud Sync" at the top first to save changes to Firestore.');
      return false;
    }
    return true;
  }

  async function handleSeedStore() {
    if (!requireCloudAdmin()) return;
    setSeeding(true);
    try {
      await seedInitialStoreData();
      notify('Starter packages, coupons, and payment gateways published to Firestore.');
    } catch {
      notify('Failed to seed starter data.');
    } finally {
      setSeeding(false);
    }
  }

  // Metrics
  const stats = useMemo(() => {
    const verified = orders.filter((o) => o.status === 'verified');
    const pending = orders.filter((o) => o.status === 'pending');
    const totalRevenue = verified.reduce((sum, o) => sum + (o.finalPrice || 0), 0);
    const pendingRevenue = pending.reduce((sum, o) => sum + (o.finalPrice || 0), 0);
    const activePkgs = packages.filter((p) => p.active).length;
    return {
      totalRevenue,
      pendingRevenue,
      verifiedCount: verified.length,
      pendingCount: pending.length,
      activePkgs,
      newInquiries: inquiries.filter((i) => i.status === 'new').length,
    };
  }, [orders, packages, inquiries]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.studentName.toLowerCase().includes(q) ||
        o.studentPhone.toLowerCase().includes(q) ||
        o.trxId.toLowerCase().includes(q) ||
        o.packageTitle.toLowerCase().includes(q)
      );
    });
  }, [orders, orderStatusFilter, orderSearch]);

  function openNewPackageModal() {
    setIsNewPkg(true);
    setEditingPkg({
      id: `pkg-${Date.now()}`,
      title: '',
      subtitle: '',
      level: 'Beginner',
      duration: '8 Weeks',
      format: 'Live Zoom + Speaking Labs',
      price: 3500,
      originalPrice: 5000,
      imageUrl: PRESET_IMAGES[0].url,
      features: [],
      featured: false,
      active: true,
      seatsLabel: '10 seats remaining',
      sortOrder: packages.length + 1,
    });
    setPkgTitle('');
    setPkgSubtitle('');
    setPkgLevel('Beginner');
    setPkgDuration('8 Weeks');
    setPkgFormat('Live Zoom + Practice Labs');
    setPkgPrice('3500');
    setPkgOriginalPrice('5000');
    setPkgSeatsLabel('10 seats remaining');
    setPkgImageUrl(PRESET_IMAGES[0].url);
    setPkgSortOrder(String(packages.length + 1));
    setPkgFeatured(false);
    setPkgActive(true);
    setPkgFeaturesText(
      'Live small-group speaking sessions\nWeekly pronunciation feedback\nRecorded sessions & PDF workbook'
    );
  }

  function openEditPackageModal(pkg: CoursePackage) {
    setIsNewPkg(false);
    setEditingPkg(pkg);
    setPkgTitle(pkg.title);
    setPkgSubtitle(pkg.subtitle);
    setPkgLevel(pkg.level);
    setPkgDuration(pkg.duration);
    setPkgFormat(pkg.format);
    setPkgPrice(String(pkg.price));
    setPkgOriginalPrice(String(pkg.originalPrice));
    setPkgSeatsLabel(pkg.seatsLabel);
    setPkgImageUrl(pkg.imageUrl);
    setPkgSortOrder(String(pkg.sortOrder));
    setPkgFeatured(pkg.featured);
    setPkgActive(pkg.active);
    setPkgFeaturesText(pkg.features.join('\n'));
  }

  async function handleSavePackage(e: FormEvent) {
    e.preventDefault();
    if (!editingPkg || !requireCloudAdmin()) return;
    setPkgSaving(true);
    try {
      const features = pkgFeaturesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await savePackage(
        {
          id: editingPkg.id,
          title: pkgTitle,
          subtitle: pkgSubtitle,
          level: pkgLevel,
          duration: pkgDuration,
          format: pkgFormat,
          price: Number(pkgPrice) || 0,
          originalPrice: Number(pkgOriginalPrice) || 0,
          imageUrl: pkgImageUrl,
          features,
          featured: pkgFeatured,
          active: pkgActive,
          seatsLabel: pkgSeatsLabel,
          sortOrder: Number(pkgSortOrder) || 1,
        },
        isNewPkg
      );
      setEditingPkg(null);
      notify(isNewPkg ? 'Package created.' : 'Package updated.');
    } catch {
      notify('Error saving package.');
    } finally {
      setPkgSaving(false);
    }
  }

  async function handleOrderDecision(order: Order, status: OrderStatus, note?: string) {
    if (!requireCloudAdmin()) return;
    setOrderUpdating(true);
    try {
      await updateOrderVerificationStatus(
        order,
        status,
        note !== undefined ? note : order.adminNote
      );
      if (inspectingOrder?.id === order.id) {
        setInspectingOrder(null);
      }
      notify(`Order ${order.orderCode} marked as ${status}.`);
    } catch {
      notify('Failed to update order status.');
    } finally {
      setOrderUpdating(false);
    }
  }

  function handleExportCsv() {
    const headers = [
      'Order Code',
      'Student Name',
      'Phone',
      'Email',
      'Package',
      'Batch',
      'Payment Method',
      'Sender Number',
      'TrxID',
      'Coupon',
      'Final Price',
      'Status',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderCode,
      o.studentName,
      o.studentPhone,
      o.studentEmail,
      o.packageTitle,
      o.batchPreference,
      o.paymentMethod,
      o.senderNumber,
      o.trxId,
      o.couponCode,
      String(o.finalPrice),
      o.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aby-hayat-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSavePayments(e: FormEvent) {
    e.preventDefault();
    if (!requireCloudAdmin()) return;
    setPaymentSaving(true);
    try {
      await savePaymentSettings(paymentDraft);
      notify('Payment gateways saved.');
    } catch {
      notify('Failed to save payment settings.');
    } finally {
      setPaymentSaving(false);
    }
  }

  function updatePaymentMethodField(
    idx: number,
    field: keyof PaymentMethodConfig,
    value: string | boolean
  ) {
    setPaymentDraft((prev) => {
      const next = [...prev.methods];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, methods: next };
    });
  }

  function addCustomPaymentMethod() {
    setPaymentDraft((prev) => ({
      ...prev,
      methods: [
        ...prev.methods,
        {
          id: `custom_${Date.now()}`,
          name: 'New Payment Method',
          type: 'mobile_wallet',
          enabled: true,
          accountType: 'Personal',
          accountNumber: '01XXXXXXXXX',
          accountName: storefront.storeName,
          instructions: 'Send payment and submit your Transaction ID below.',
        },
      ],
    }));
  }

  async function handleSaveStorefront(e: FormEvent) {
    e.preventDefault();
    if (!requireCloudAdmin()) return;
    setStorefrontSaving(true);
    try {
      await saveStorefrontSettings(storefrontDraft);
      notify('Storefront configuration saved.');
    } catch {
      notify('Failed to save storefront settings.');
    } finally {
      setStorefrontSaving(false);
    }
  }

  async function handleCreateCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponCode.trim() || !requireCloudAdmin()) return;
    setCouponSaving(true);
    try {
      await saveCoupon(
        {
          code: couponCode,
          discountType: couponType,
          discountValue: Number(couponValue) || 0,
          description: couponDesc || 'Promotional Discount',
          active: true,
        },
        true
      );
      setCouponCode('');
      setCouponDesc('');
      notify('Coupon saved.');
    } catch {
      notify('Failed to save coupon.');
    } finally {
      setCouponSaving(false);
    }
  }

  // Passcode Login Gate (/admin)
  if (!passcodeVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#0F4C3A]">
              {storefront.storeName}
            </p>
            <h1 className="text-2xl font-semibold text-neutral-900 font-editorial">
              Admin Panel Login
            </h1>
            <p className="text-sm text-neutral-600">
              Enter your administrator password to open store controls, payment settings, and order verification.
            </p>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-passcode"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-passcode"
                  type={showPasscode ? 'text' : 'password'}
                  required
                  autoFocus
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  aria-label={showPasscode ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2.5 p-1 text-neutral-400 hover:text-neutral-700"
                >
                  {showPasscode ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {passcodeError && (
              <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {passcodeError}
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] transition-colors"
            >
              <Lock className="w-4 h-4" />
              Unlock Admin Panel
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-200 text-center">
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders & Payments',
      icon: ShoppingBag,
      badge: stats.pendingCount,
    },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'payments', label: 'Payment System', icon: CreditCard },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'settings', label: 'Store Control', icon: Settings },
    {
      id: 'inquiries',
      label: 'Inquiries',
      icon: MessageSquare,
      badge: stats.newInquiries,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] text-neutral-900">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-neutral-200 shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-neutral-200">
          <span className="text-sm font-bold tracking-tight text-neutral-900 truncate font-editorial">
            {storefront.storeName}
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#0F4C3A] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      active ? 'text-white/90' : 'text-[#0F4C3A] font-semibold'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 space-y-3">
          <div className="text-xs text-neutral-500 truncate">
            {user ? user.email : 'Passcode Unlocked'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Storefront
            </button>
            <button
              type="button"
              onClick={handleLockAdmin}
              title="Lock Admin Panel"
              aria-label="Lock Admin Panel"
              className="p-2 text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200"
            >
              <Lock className="w-4 h-4" />
            </button>
            {user && (
              <button
                type="button"
                onClick={() => signOut(auth)}
                title="Disconnect Google Account"
                aria-label="Sign out Google account"
                className="p-2 text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 bg-white h-full flex flex-col border-r border-neutral-200 z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200">
              <span className="text-sm font-bold text-neutral-900 font-editorial">
                {storefront.storeName}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-1.5 text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg ${
                      active
                        ? 'bg-[#0F4C3A] text-white'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-xs font-mono tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-neutral-200 flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateStorefront}
                className="flex-1 py-2 text-xs font-medium bg-neutral-100 rounded-lg"
              >
                View Store
              </button>
              <button
                type="button"
                onClick={handleLockAdmin}
                className="py-2 px-3 text-xs font-medium bg-neutral-100 rounded-lg"
              >
                Lock
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-neutral-500 truncate">
              Admin Panel <span className="mx-1.5">/</span>{' '}
              <span className="font-semibold text-neutral-900">
                {navItems.find((n) => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeTab === 'packages' && (
              <button
                type="button"
                onClick={openNewPackageModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Package
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Storefront
            </button>
          </div>
        </header>

        {toastMsg && (
          <div className="mx-6 mt-4 px-4 py-3 text-xs font-medium text-[#0F4C3A] bg-[#0F4C3A]/10 border border-[#0F4C3A]/20 rounded-lg flex items-center justify-between">
            <span>{toastMsg}</span>
            <button type="button" onClick={() => setToastMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
          {/* Cloud Database Connection Banner when Google Auth isn't connected yet */}
          {!authLoading && !isAdmin && (
            <div className="p-5 bg-white border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-neutral-900">
                  {user
                    ? `Signed in as ${user.email} (Not an Admin Account)`
                    : 'Connect Cloud Sync to Read Orders & Save Changes'}
                </h2>
                <p className="text-xs text-neutral-600">
                  {user
                    ? 'Switch to your authorized Google account (markjuckerbark4@gmail.com) to manage Firestore orders, packages, and payment settings.'
                    : 'Admin panel is unlocked. Connect your Google account (markjuckerbark4@gmail.com) once to sync live orders, packages, and payment settings with Cloud Firestore.'}
                </p>
                {loginError && (
                  <p className="text-xs font-medium text-red-600">{loginError}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {user && (
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="px-3.5 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 rounded-lg hover:bg-neutral-200 whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] whitespace-nowrap"
                >
                  {user ? 'Switch Google Account' : 'Connect Cloud Sync'}
                </button>
              </div>
            </div>
          )}

          {/* Starter Seed Banner if DB has no packages yet */}
          {isAdmin && !hasDbPackages && (
            <div className="p-5 bg-white border border-neutral-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  Publish Starter Store Catalog to Database
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Save the 4 starter Spoken English packages, bKash/Nagad/Rocket/Bank payment settings, and launch coupons directly into Firestore so you can edit them anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedStore}
                disabled={seeding}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] whitespace-nowrap shrink-0"
              >
                {seeding ? 'Publishing...' : 'Publish Starter Store'}
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-neutral-200 rounded-xl">
                  <div className="text-xs text-neutral-500">
                    Verified Revenue
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mt-1 tabular-nums">
                    {storefront.currencySymbol}
                    {stats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                    Pending: {storefront.currencySymbol}
                    {stats.pendingRevenue.toLocaleString()}
                  </div>
                </div>

                <div className="p-5 bg-white border border-neutral-200 rounded-xl">
                  <div className="text-xs text-neutral-500">
                    Pending Verifications
                  </div>
                  <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                    {stats.pendingCount}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Awaiting TrxID approval
                  </div>
                </div>

                <div className="p-5 bg-white border border-neutral-200 rounded-xl">
                  <div className="text-xs text-neutral-500">
                    Verified Enrollments
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                    {stats.verifiedCount}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Confirmed students
                  </div>
                </div>

                <div className="p-5 bg-white border border-neutral-200 rounded-xl">
                  <div className="text-xs text-neutral-500">
                    Active Packages
                  </div>
                  <div className="text-2xl font-bold text-neutral-900 mt-1 tabular-nums">
                    {stats.activePkgs}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 tabular-nums">
                    {stats.newInquiries} new inquiries
                  </div>
                </div>
              </div>

              {/* Pending Queue */}
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Pending Payment Verifications
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-medium text-[#0F4C3A] hover:underline"
                  >
                    View all orders
                  </button>
                </div>

                {orders.filter((o) => o.status === 'pending').length === 0 ? (
                  <div className="p-8 text-center text-sm text-neutral-500">
                    No pending payments right now. New student orders will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 text-xs text-neutral-500 bg-neutral-50">
                          <th className="py-3 px-6 font-medium">Order Code</th>
                          <th className="py-3 px-4 font-medium">Student</th>
                          <th className="py-3 px-4 font-medium">Package</th>
                          <th className="py-3 px-4 font-medium">Method & TrxID</th>
                          <th className="py-3 px-4 font-medium text-right">Amount</th>
                          <th className="py-3 px-6 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {orders
                          .filter((o) => o.status === 'pending')
                          .slice(0, 8)
                          .map((o) => (
                            <tr key={o.id} className="hover:bg-neutral-50">
                              <td className="py-3 px-6 font-mono text-xs font-semibold">
                                {o.orderCode}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-neutral-900">
                                  {o.studentName}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {o.studentPhone}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-neutral-700">
                                {o.packageTitle}
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-neutral-900">
                                  {o.paymentMethod}
                                </div>
                                <div className="text-xs font-mono text-neutral-500">
                                  {o.trxId}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold tabular-nums">
                                {o.currency}
                                {o.finalPrice.toLocaleString()}
                              </td>
                              <td className="py-3 px-6 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={orderUpdating}
                                  onClick={() =>
                                    handleOrderDecision(
                                      o,
                                      'verified',
                                      'Payment verified. Batch access active.'
                                    )
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F4C3A] rounded-md hover:bg-[#0B3A2C]"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingOrder(o);
                                    setAdminNoteInput(o.adminNote);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-white border border-neutral-200 rounded-lg self-start">
                  {(['all', 'pending', 'verified', 'rejected'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                          orderStatusFilter === st
                            ? 'bg-[#0F4C3A] text-white'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search code, phone, TrxID..."
                      className="pl-9 pr-3.5 py-2 text-xs bg-white border border-neutral-300 rounded-lg w-56 focus:outline-none focus:border-[#0F4C3A]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                  </button>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                {filteredOrders.length === 0 ? (
                  <div className="p-10 text-center text-sm text-neutral-500">
                    No matching orders found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 text-xs text-neutral-500 bg-neutral-50">
                          <th className="py-3 px-5 font-medium">Order</th>
                          <th className="py-3 px-4 font-medium">Student</th>
                          <th className="py-3 px-4 font-medium">Package & Batch</th>
                          <th className="py-3 px-4 font-medium">Payment</th>
                          <th className="py-3 px-4 font-medium text-right">Amount</th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-5 font-medium text-right">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {filteredOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-neutral-50">
                            <td className="py-3 px-5 font-mono text-xs font-semibold">
                              {o.orderCode}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-neutral-900">
                                {o.studentName}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {o.studentPhone} · {o.studentEmail}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-neutral-900">{o.packageTitle}</div>
                              <div className="text-xs text-neutral-500">
                                {o.batchPreference}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-neutral-900">{o.paymentMethod}</div>
                              <div className="text-xs font-mono text-neutral-500">
                                {o.senderNumber} · {o.trxId}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold tabular-nums">
                              {o.currency}
                              {o.finalPrice.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-semibold capitalize ${
                                  o.status === 'verified'
                                    ? 'text-emerald-700'
                                    : o.status === 'rejected'
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectingOrder(o);
                                  setAdminNoteInput(o.adminNote);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-neutral-800 bg-neutral-100 rounded-md hover:bg-neutral-200"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PACKAGES TAB (STORE CONTROL) */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col"
                  >
                    <div className="flex gap-4 p-5">
                      <div className="w-28 h-24 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                        <ImageWithFallback
                          src={pkg.imageUrl}
                          alt={pkg.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-[#0F4C3A]">
                            {pkg.level} · {pkg.duration}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              pkg.active ? 'text-emerald-700' : 'text-neutral-500'
                            }`}
                          >
                            {pkg.active ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-neutral-900 truncate">
                          {pkg.title}
                        </h3>
                        <p className="text-xs text-neutral-600 line-clamp-2">
                          {pkg.subtitle}
                        </p>
                        <div className="pt-1 text-sm font-bold text-neutral-900 tabular-nums">
                          {storefront.currencySymbol}
                          {pkg.price.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-neutral-400 line-through">
                            {storefront.currencySymbol}
                            {pkg.originalPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-[#F8F9FA] border-t border-neutral-200 flex items-center justify-between gap-2">
                      <span className="text-xs text-neutral-500">
                        Order #{pkg.sortOrder} · {pkg.seatsLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPackageModal(pkg)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deletePackageById(pkg.id);
                            notify('Package deleted.');
                          }}
                          aria-label={`Delete ${pkg.title}`}
                          className="p-1.5 text-red-600 bg-white border border-neutral-300 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAYMENT SYSTEM TAB */}
          {activeTab === 'payments' && (
            <form onSubmit={handleSavePayments} className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-neutral-900">
                      Payment Methods & Gateways
                    </h2>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      Control which mobile wallets (bKash, Nagad, Rocket) or bank accounts appear at student checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomPaymentMethod}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 rounded-lg hover:bg-neutral-200 self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Payment Gateway
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentDraft.methods.map((method, idx) => (
                    <div
                      key={method.id}
                      className="p-5 border border-neutral-200 rounded-xl bg-[#F8F9FA] space-y-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-neutral-900">
                            <input
                              type="checkbox"
                              checked={method.enabled}
                              onChange={(e) =>
                                updatePaymentMethodField(
                                  idx,
                                  'enabled',
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 accent-[#0F4C3A]"
                            />
                            <span>{method.name}</span>
                          </label>
                          <span
                            className={`text-xs font-medium ${
                              method.enabled
                                ? 'text-emerald-700'
                                : 'text-neutral-500'
                            }`}
                          >
                            {method.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPaymentDraft((prev) => ({
                              ...prev,
                              methods: prev.methods.filter((_, i) => i !== idx),
                            }))
                          }
                          aria-label={`Remove ${method.name}`}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-neutral-600 mb-1">
                            Gateway Name
                          </label>
                          <input
                            type="text"
                            value={method.name}
                            onChange={(e) =>
                              updatePaymentMethodField(idx, 'name', e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-600 mb-1">
                            Account Type
                          </label>
                          <input
                            type="text"
                            value={method.accountType}
                            onChange={(e) =>
                              updatePaymentMethodField(
                                idx,
                                'accountType',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-600 mb-1">
                            Account / Wallet Number
                          </label>
                          <input
                            type="text"
                            value={method.accountNumber}
                            onChange={(e) =>
                              updatePaymentMethodField(
                                idx,
                                'accountNumber',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-600 mb-1">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            value={method.accountName}
                            onChange={(e) =>
                              updatePaymentMethodField(
                                idx,
                                'accountName',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">
                          Student Checkout Instructions
                        </label>
                        <input
                          type="text"
                          value={method.instructions}
                          onChange={(e) =>
                            updatePaymentMethodField(
                              idx,
                              'instructions',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Checkout Confirmation Note
                  </label>
                  <textarea
                    rows={2}
                    value={paymentDraft.autoConfirmNote}
                    onChange={(e) =>
                      setPaymentDraft((prev) => ({
                        ...prev,
                        autoConfirmNote: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={paymentSaving}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C]"
                  >
                    {paymentSaving ? 'Saving...' : 'Save Payment Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* COUPONS TAB */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleCreateCoupon}
                className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 self-start"
              >
                <h2 className="text-base font-semibold text-neutral-900">
                  Create Promo Code
                </h2>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EID25"
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Type
                    </label>
                    <select
                      value={couponType}
                      onChange={(e) =>
                        setCouponType(e.target.value as 'percent' | 'fixed')
                      }
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={couponValue}
                      onChange={(e) => setCouponValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={couponDesc}
                    onChange={(e) => setCouponDesc(e.target.value)}
                    placeholder="e.g. 25% Batch Discount"
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={couponSaving}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C]"
                >
                  {couponSaving ? 'Saving...' : 'Create Coupon'}
                </button>
              </form>

              <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <h2 className="text-base font-semibold text-neutral-900">
                    Active & Saved Coupons
                  </h2>
                </div>
                {coupons.length === 0 ? (
                  <div className="p-8 text-center text-sm text-neutral-500">
                    No coupons stored in Firestore yet. Create one on the left or publish starter store data from Overview.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200">
                    {coupons.map((c) => (
                      <div
                        key={c.code}
                        className="px-6 py-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-neutral-900">
                              {c.code}
                            </span>
                            <span className="text-xs text-neutral-500">
                              ·{' '}
                              {c.discountType === 'percent'
                                ? `${c.discountValue}% off`
                                : `${storefront.currencySymbol}${c.discountValue} off`}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-600 mt-0.5">
                            {c.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              saveCoupon({ ...c, active: !c.active }, false)
                            }
                            className={`px-3 py-1 text-xs font-medium rounded-md border ${
                              c.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                            }`}
                          >
                            {c.active ? 'Active' : 'Paused'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCouponById(c.code)}
                            aria-label={`Delete ${c.code}`}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STORE CONTROL / SETTINGS TAB */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveStorefront} className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
                <h2 className="text-base font-semibold text-neutral-900">
                  Storefront Branding & Hero Controls
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Website / Academy Name
                    </label>
                    <input
                      type="text"
                      value={storefrontDraft.storeName}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          storeName: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={storefrontDraft.currencySymbol}
                        onChange={(e) =>
                          setStorefrontDraft((p) => ({
                            ...p,
                            currencySymbol: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Currency Code
                      </label>
                      <input
                        type="text"
                        value={storefrontDraft.currencyCode}
                        onChange={(e) =>
                          setStorefrontDraft((p) => ({
                            ...p,
                            currencyCode: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storefrontDraft.enrollmentOpen}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          enrollmentOpen: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#0F4C3A]"
                    />
                    <span>Enrollment Open (Accepting Checkout Orders)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storefrontDraft.announcementEnabled}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          announcementEnabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-[#0F4C3A]"
                    />
                    <span>Show Top Announcement Banner</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Top Announcement Banner Text
                  </label>
                  <input
                    type="text"
                    value={storefrontDraft.announcementText}
                    onChange={(e) =>
                      setStorefrontDraft((p) => ({
                        ...p,
                        announcementText: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={storefrontDraft.heroHeadline}
                    onChange={(e) =>
                      setStorefrontDraft((p) => ({
                        ...p,
                        heroHeadline: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Hero Subheadline
                  </label>
                  <textarea
                    rows={2}
                    value={storefrontDraft.heroSubheadline}
                    onChange={(e) =>
                      setStorefrontDraft((p) => ({
                        ...p,
                        heroSubheadline: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-neutral-200">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Support Phone
                    </label>
                    <input
                      type="text"
                      value={storefrontDraft.supportPhone}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          supportPhone: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={storefrontDraft.whatsappNumber}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          whatsappNumber: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={storefrontDraft.supportEmail}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          supportEmail: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-200">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Lead Instructor Name
                    </label>
                    <input
                      type="text"
                      value={storefrontDraft.instructorName}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          instructorName: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Instructor Bio
                    </label>
                    <input
                      type="text"
                      value={storefrontDraft.instructorBio}
                      onChange={(e) =>
                        setStorefrontDraft((p) => ({
                          ...p,
                          instructorBio: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={storefrontSaving}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C]"
                  >
                    {storefrontSaving ? 'Saving...' : 'Save Storefront Settings'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* INQUIRIES TAB */}
          {activeTab === 'inquiries' && (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h2 className="text-base font-semibold text-neutral-900">
                  Student Assessment & Callback Inquiries
                </h2>
              </div>
              {inquiries.length === 0 ? (
                <div className="p-10 text-center text-sm text-neutral-500">
                  No student inquiries submitted yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900">
                            {inq.name}
                          </span>
                          <span className="text-xs text-neutral-500">
                            · {inq.phone}
                            {inq.email ? ` · ${inq.email}` : ''}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[#0F4C3A]">
                          {inq.currentLevel}
                        </div>
                        {inq.goal && (
                          <p className="text-sm text-neutral-600">{inq.goal}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={inq.status}
                          onChange={(e) =>
                            updateInquiryStatus(
                              inq.id,
                              e.target.value as InquiryStatus
                            )
                          }
                          aria-label={`Status for ${inq.name}`}
                          className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg bg-white"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="enrolled">Enrolled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteInquiryById(inq.id)}
                          aria-label={`Delete inquiry from ${inq.name}`}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Order Inspection Modal */}
      {inspectingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-[#0F4C3A] font-semibold">
                  {inspectingOrder.orderCode}
                </p>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {inspectingOrder.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-lg bg-[#F8F9FA] border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Package</span>
                <span className="font-medium text-neutral-900">
                  {inspectingOrder.packageTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Phone / Email</span>
                <span className="text-neutral-900">
                  {inspectingOrder.studentPhone} · {inspectingOrder.studentEmail}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Batch</span>
                <span className="text-neutral-900">
                  {inspectingOrder.batchPreference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Method</span>
                <span className="text-neutral-900">
                  {inspectingOrder.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Sender Number</span>
                <span className="font-mono text-neutral-900">
                  {inspectingOrder.senderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Transaction ID</span>
                <span className="font-mono font-semibold text-neutral-900">
                  {inspectingOrder.trxId}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200">
                <span className="font-medium text-neutral-900">Total Paid</span>
                <span className="font-bold text-neutral-900 tabular-nums">
                  {inspectingOrder.currency}
                  {inspectingOrder.finalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Admissions Note (Visible on Student Order Tracker)
              </label>
              <textarea
                rows={2}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="e.g. Payment confirmed. Zoom invite sent to WhatsApp."
                className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  void deleteOrderById(inspectingOrder);
                  setInspectingOrder(null);
                  notify('Order removed.');
                }}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                Delete Order
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={orderUpdating}
                  onClick={() =>
                    handleOrderDecision(
                      inspectingOrder,
                      'rejected',
                      adminNoteInput || 'Transaction ID could not be verified.'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={orderUpdating}
                  onClick={() =>
                    handleOrderDecision(
                      inspectingOrder,
                      'verified',
                      adminNoteInput ||
                        'Payment verified. Batch onboarding link sent.'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C]"
                >
                  <Check className="w-3.5 h-3.5" />
                  Verify & Enroll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Add / Edit Modal */}
      {editingPkg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSavePackage}
            className="bg-white border border-neutral-200 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-xl my-auto max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-lg font-semibold text-neutral-900">
                {isNewPkg ? 'Create New Package' : `Edit: ${editingPkg.title}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="p-1.5 text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Package Title *
                </label>
                <input
                  type="text"
                  required
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Level *
                </label>
                <select
                  value={pkgLevel}
                  onChange={(e) => setPkgLevel(e.target.value as PackageLevel)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                >
                  {LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Subtitle / Summary *
              </label>
              <textarea
                rows={2}
                required
                value={pkgSubtitle}
                onChange={(e) => setPkgSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Price ({storefront.currencySymbol}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Original Price
                </label>
                <input
                  type="number"
                  min="0"
                  value={pkgOriginalPrice}
                  onChange={(e) => setPkgOriginalPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Duration *
                </label>
                <input
                  type="text"
                  required
                  value={pkgDuration}
                  onChange={(e) => setPkgDuration(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={pkgSortOrder}
                  onChange={(e) => setPkgSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Format Label *
                </label>
                <input
                  type="text"
                  required
                  value={pkgFormat}
                  onChange={(e) => setPkgFormat(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Seats Availability Text
                </label>
                <input
                  type="text"
                  value={pkgSeatsLabel}
                  onChange={(e) => setPkgSeatsLabel(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Preset Studio Cover Image
                </label>
                <select
                  value={pkgImageUrl}
                  onChange={(e) => setPkgImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white"
                >
                  {PRESET_IMAGES.map((img) => (
                    <option key={img.url} value={img.url}>
                      {img.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Or Custom Image URL
                </label>
                <input
                  type="text"
                  value={pkgImageUrl}
                  onChange={(e) => setPkgImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Package Features / Curriculum (One per line)
              </label>
              <textarea
                rows={4}
                value={pkgFeaturesText}
                onChange={(e) => setPkgFeaturesText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgActive}
                  onChange={(e) => setPkgActive(e.target.checked)}
                  className="w-4 h-4 accent-[#0F4C3A]"
                />
                <span>Active on Storefront</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgFeatured}
                  onChange={(e) => setPkgFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#0F4C3A]"
                />
                <span>Featured Package</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pkgSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C]"
              >
                {pkgSaving ? 'Saving...' : 'Save Package'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
