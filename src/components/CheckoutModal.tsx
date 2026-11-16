import { Check, Copy, Lock, ShieldCheck, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { createOrderWithLookup, validateCouponCode } from '../lib/storeService';
import {
  Coupon,
  CoursePackage,
  PaymentSettings,
  StorefrontSettings,
} from '../types';

interface CheckoutModalProps {
  pkg: CoursePackage;
  storefront: StorefrontSettings;
  paymentSettings: PaymentSettings;
  onClose: () => void;
  onOrderSuccess: (orderCode: string) => void;
}

const BATCH_OPTIONS = [
  'Morning Batch (9:00 AM - 10:30 AM)',
  'Evening Batch (7:30 PM - 9:00 PM)',
  'Late Night Professionals (9:30 PM - 11:00 PM)',
  'Weekend Intensive (Fri & Sat)',
];

export function CheckoutModal({
  pkg,
  storefront,
  paymentSettings,
  onClose,
  onOrderSuccess,
}: CheckoutModalProps) {
  const enabledMethods = useMemo(
    () => paymentSettings.methods.filter((m) => m.enabled),
    [paymentSettings.methods]
  );

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    enabledMethods[0]?.id || 'bkash'
  );
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [batchPreference, setBatchPreference] = useState(BATCH_OPTIONS[1]);
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  const activeMethod =
    enabledMethods.find((m) => m.id === selectedMethodId) || enabledMethods[0];

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percent') {
      return Math.round((pkg.price * appliedCoupon.discountValue) / 100);
    }
    return Math.min(pkg.price, Math.round(appliedCoupon.discountValue));
  }, [appliedCoupon, pkg.price]);

  const finalPrice = Math.max(0, pkg.price - discountAmount);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const coupon = await validateCouponCode(couponInput);
      if (coupon) {
        setAppliedCoupon(coupon);
        setCouponMessage(`Applied: ${coupon.description}`);
      } else {
        setAppliedCoupon(null);
        setCouponMessage('Coupon code is invalid or expired.');
      }
    } catch {
      setCouponMessage('Could not verify coupon right now.');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!studentName.trim() || studentName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!studentEmail.trim() || !studentEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!studentPhone.trim() || studentPhone.trim().length < 6) {
      setErrorMsg('Please enter a valid phone or WhatsApp number.');
      return;
    }
    if (!activeMethod) {
      setErrorMsg('No payment method is currently available.');
      return;
    }
    if (!senderNumber.trim() || !trxId.trim()) {
      setErrorMsg(
        'Please enter both your sender number/account and Transaction ID (TrxID).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const orderCode = await createOrderWithLookup({
        packageId: pkg.id,
        packageTitle: pkg.title,
        studentName,
        studentEmail,
        studentPhone,
        batchPreference,
        paymentMethod: activeMethod.name,
        senderNumber,
        trxId,
        couponCode: appliedCoupon ? appliedCoupon.code : '',
        discountAmount,
        originalAmount: pkg.price,
        finalPrice,
        currency: storefront.currencySymbol,
      });
      setConfirmedCode(orderCode);
    } catch {
      setErrorMsg(
        'Unable to submit enrollment order. Please check your details and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-2xl shadow-xl my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <p className="text-xs font-medium text-[#0F4C3A]">
              {storefront.storeName} Enrollment
            </p>
            <h3
              id="checkout-modal-title"
              className="text-lg font-semibold text-neutral-900"
            >
              {confirmedCode ? 'Enrollment Submitted' : pkg.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedCode ? (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-[#0F4C3A]/5 border border-[#0F4C3A]/20">
              <ShieldCheck className="w-6 h-6 text-[#0F4C3A] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-neutral-900">
                  Order Received — Pending Payment Verification
                </h4>
                <p className="text-sm text-neutral-600">
                  Save your enrollment tracking code below. Once our admissions
                  team verifies your {activeMethod?.name} transaction, your
                  batch access link will be sent to{' '}
                  <span className="font-medium text-neutral-900">
                    {studentEmail}
                  </span>{' '}
                  and WhatsApp.
                </p>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg p-5 space-y-3 bg-[#F8F9FA]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-neutral-500">Tracking Code</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-semibold text-neutral-900 tabular-nums">
                    {confirmedCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(confirmedCode, 'code')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50"
                  >
                    {copiedId === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#0F4C3A]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="h-px bg-neutral-200" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Package</span>
                <span className="font-medium text-neutral-900">{pkg.title}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Batch</span>
                <span className="text-neutral-900">{batchPreference}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Payment Method</span>
                <span className="text-neutral-900">{activeMethod?.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Transaction ID</span>
                <span className="font-mono text-neutral-900">{trxId}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-neutral-200">
                <span className="font-medium text-neutral-900">Total Paid</span>
                <span className="font-semibold text-neutral-900 tabular-nums">
                  {storefront.currencySymbol}
                  {finalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  onOrderSuccess(confirmedCode);
                  onClose();
                }}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] transition-colors whitespace-nowrap"
              >
                Track Order Status
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
            {/* Order Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#F8F9FA] border border-neutral-200">
              <div>
                <div className="text-xs text-neutral-500">
                  {pkg.level} · {pkg.duration} · {pkg.format}
                </div>
                <div className="text-base font-semibold text-neutral-900 mt-0.5">
                  {pkg.title}
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                {discountAmount > 0 && (
                  <div className="text-xs text-neutral-500 line-through tabular-nums">
                    {storefront.currencySymbol}
                    {pkg.price.toLocaleString()}
                  </div>
                )}
                <div className="text-xl font-bold text-neutral-900 tabular-nums">
                  {storefront.currencySymbol}
                  {finalPrice.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Promo Coupon */}
            <div className="space-y-1.5">
              <label
                htmlFor="coupon-input"
                className="block text-xs font-medium text-neutral-700"
              >
                Promo / Scholarship Code (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon-input"
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. FLUENT20)"
                  className="flex-1 px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A] font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  className="px-4 py-2 text-sm font-medium text-neutral-900 bg-neutral-100 border border-neutral-300 rounded-lg hover:bg-neutral-200 transition-colors whitespace-nowrap"
                >
                  {couponLoading ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {couponMessage && (
                <p
                  className={`text-xs ${
                    appliedCoupon ? 'text-[#0F4C3A] font-medium' : 'text-red-600'
                  }`}
                >
                  {couponMessage}
                </p>
              )}
            </div>

            {/* Student Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="student-name"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Tariqul Islam"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                />
              </div>
              <div>
                <label
                  htmlFor="student-phone"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Phone / WhatsApp Number *
                </label>
                <input
                  id="student-phone"
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                />
              </div>
              <div>
                <label
                  htmlFor="student-email"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Email Address *
                </label>
                <input
                  id="student-email"
                  type="email"
                  required
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                />
              </div>
              <div>
                <label
                  htmlFor="batch-pref"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Preferred Batch Timing *
                </label>
                <select
                  id="batch-pref"
                  value={batchPreference}
                  onChange={(e) => setBatchPreference(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                >
                  {BATCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 pt-2 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900">
                  Select Payment Method
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <Lock className="w-3.5 h-3.5" />
                  Verified Enrollment
                </span>
              </div>

              {enabledMethods.length === 0 ? (
                <div className="p-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                  No payment gateways are currently active. Please contact{' '}
                  {storefront.supportPhone}.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {enabledMethods.map((method) => {
                      const active = method.id === activeMethod?.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`px-3 py-2.5 text-xs font-semibold rounded-lg border text-center transition-colors whitespace-nowrap truncate ${
                            active
                              ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                          }`}
                        >
                          {method.name}
                        </button>
                      );
                    })}
                  </div>

                  {activeMethod && (
                    <div className="p-4 rounded-lg bg-[#F8F9FA] border border-neutral-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs text-neutral-500 block">
                            {activeMethod.name} ({activeMethod.accountType})
                          </span>
                          <span className="font-mono text-sm font-semibold text-neutral-900">
                            {activeMethod.accountNumber}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              activeMethod.accountNumber,
                              activeMethod.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
                        >
                          {copiedId === activeMethod.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#0F4C3A]" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Number
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {activeMethod.instructions}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Account Name: {activeMethod.accountName} · Amount to
                        send:{' '}
                        <strong className="text-neutral-900 tabular-nums">
                          {storefront.currencySymbol}
                          {finalPrice.toLocaleString()}
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="sender-number"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Your Sender Number / Account *
                      </label>
                      <input
                        id="sender-number"
                        type="text"
                        required
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder="Number you paid from"
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="trx-id"
                        className="block text-xs font-medium text-neutral-700 mb-1"
                      >
                        Transaction ID (TrxID) / Reference *
                      </label>
                      <input
                        id="trx-id"
                        type="text"
                        required
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        placeholder="e.g. BL94X72K1P"
                        className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 max-w-sm">
                {paymentSettings.autoConfirmNote}
              </p>
              <button
                type="submit"
                disabled={submitting || enabledMethods.length === 0}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {submitting
                  ? 'Submitting Order...'
                  : `Confirm & Submit (${storefront.currencySymbol}${finalPrice.toLocaleString()})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
