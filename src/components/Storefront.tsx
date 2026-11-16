import {
  ArrowRight,
  BookOpen,
  Check,
  Mail,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  HERO_IMAGE_URL,
  LAB_IMAGE_URL,
} from '../defaults';
import { lookupOrderByCode, submitInquiry } from '../lib/storeService';
import {
  CoursePackage,
  OrderLookup,
  PackageLevel,
  PaymentSettings,
  StorefrontSettings,
} from '../types';
import { CheckoutModal } from './CheckoutModal';
import { ImageWithFallback } from './ImageWithFallback';

interface StorefrontProps {
  packages: CoursePackage[];
  loadingPackages: boolean;
  storefront: StorefrontSettings;
  paymentSettings: PaymentSettings;
  onNavigateAdmin: () => void;
}

const LEVELS: Array<'All' | PackageLevel> = [
  'All',
  'Beginner',
  'Intermediate',
  'IELTS & Career',
  '1-on-1 Coaching',
];

export function Storefront({
  packages,
  loadingPackages,
  storefront,
  paymentSettings,
  onNavigateAdmin,
}: StorefrontProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'All' | PackageLevel>('All');
  const [checkoutPkg, setCheckoutPkg] = useState<CoursePackage | null>(null);
  const [syllabusPkg, setSyllabusPkg] = useState<CoursePackage | null>(null);

  // Order Tracker state
  const [trackCode, setTrackCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<OrderLookup | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Free Assessment Inquiry state
  const [inqName, setInqName] = useState('');
  const [inqPhone, setInqPhone] = useState('');
  const [inqEmail, setInqEmail] = useState('');
  const [inqLevel, setInqLevel] = useState('Beginner — Hesitate while speaking');
  const [inqGoal, setInqGoal] = useState('');
  const [inqSubmitting, setInqSubmitting] = useState(false);
  const [inqSuccess, setInqSuccess] = useState(false);
  const [inqError, setInqError] = useState<string | null>(null);

  const activePackages = useMemo(
    () => packages.filter((p) => p.active),
    [packages]
  );

  const filteredPackages = useMemo(() => {
    if (selectedLevel === 'All') return activePackages;
    return activePackages.filter((p) => p.level === selectedLevel);
  }, [activePackages, selectedLevel]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('track');
    if (code) {
      setTrackCode(code);
      void executeLookup(code);
    }
  }, []);

  async function executeLookup(codeToCheck: string) {
    if (!codeToCheck.trim()) return;
    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const res = await lookupOrderByCode(codeToCheck);
      if (res) {
        setTrackResult(res);
      } else {
        setTrackError(
          'No enrollment found with that tracking code. Please verify your code.'
        );
      }
    } catch {
      setTrackError('Unable to check order status right now.');
    } finally {
      setTrackLoading(false);
    }
  }

  async function handleTrackSubmit(e: FormEvent) {
    e.preventDefault();
    await executeLookup(trackCode);
  }

  async function handleInquirySubmit(e: FormEvent) {
    e.preventDefault();
    setInqError(null);
    if (!inqName.trim() || !inqPhone.trim()) {
      setInqError('Please enter your name and phone/WhatsApp number.');
      return;
    }
    setInqSubmitting(true);
    try {
      await submitInquiry({
        name: inqName,
        phone: inqPhone,
        email: inqEmail,
        currentLevel: inqLevel,
        goal: inqGoal,
      });
      setInqSuccess(true);
      setInqName('');
      setInqPhone('');
      setInqEmail('');
      setInqGoal('');
    } catch {
      setInqError('Could not submit your request. Please try again.');
    } finally {
      setInqSubmitting(false);
    }
  }

  function handleOrderSuccess(code: string) {
    setTrackCode(code);
    void executeLookup(code);
    const el = document.getElementById('track-order');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#111827]">
      {/* Slim Dismissible Announcement Bar (<= 40px) */}
      {storefront.announcementEnabled &&
        storefront.announcementText &&
        !bannerDismissed && (
          <div className="bg-[#0F4C3A] text-white text-xs py-2 px-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <p className="font-medium truncate mx-auto">
                {storefront.announcementText}
              </p>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss announcement"
                className="text-white/80 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      {/* Top Bar Contract: 3 Zones Separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-[#F8F9FA]/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 font-editorial"
          >
            {storefront.storeName}
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            <a
              href="#packages"
              className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0"
            >
              Packages
            </a>
            <a
              href="#curriculum"
              className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0"
            >
              Curriculum
            </a>
            <a
              href="#results"
              className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0"
            >
              Results
            </a>
            <a
              href="#track-order"
              className="hover:text-neutral-900 transition-colors whitespace-nowrap shrink-0"
            >
              Track Order
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <a
              href="#packages"
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] transition-colors whitespace-nowrap shrink-0"
            >
              Enroll Now
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Section 1: Hero Split + 4-Column KPI Strip */}
        <section className="max-w-6xl mx-auto px-6 pt-12 pb-14 lg:pt-16 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium text-[#0F4C3A] tracking-wide">
                Spoken English Coaching · Live Practice Labs · Dhaka & Online
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 leading-[1.12] font-editorial">
                {storefront.heroHeadline}
              </h1>
              <p className="text-base text-neutral-600 leading-relaxed max-w-xl">
                {storefront.heroSubheadline}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#packages"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] transition-colors whitespace-nowrap"
                >
                  View Speaking Packages
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#track-order"
                  className="inline-flex items-center px-5 py-3 text-sm font-medium text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
                >
                  Free Level Assessment
                </a>
              </div>
              {!storefront.enrollmentOpen && (
                <p className="text-xs font-medium text-amber-700">
                  Note: Cohort registration is currently paused. Submit an assessment inquiry below to join the priority waitlist.
                </p>
              )}
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] lg:min-h-[420px] rounded-xl overflow-hidden border border-neutral-200 bg-white">
                <ImageWithFallback
                  src={HERO_IMAGE_URL}
                  alt="ABY HAYAT EDUCATION Spoken English live conversation seminar"
                  fallbackTitle="ABY HAYAT EDUCATION Studio"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-Column Metric Strip */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border border-neutral-200 rounded-xl bg-white divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
            <div className="p-6">
              <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
                1,400+
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Graduates Trained Since 2018
              </div>
            </div>
            <div className="p-6">
              <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
                80%
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Active Speaking Time Per Class
              </div>
            </div>
            <div className="p-6">
              <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
                4 Tracks
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Beginner to Executive & IELTS
              </div>
            </div>
            <div className="p-6">
              <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
                4.9 / 5
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Verified Cohort Satisfaction
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Spoken English Packages Catalog */}
        <section id="packages" className="border-t border-neutral-200 bg-white py-16">
          <div className="max-w-6xl mx-auto px-6 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <p className="text-xs font-medium text-[#0F4C3A]">
                  Course Packages
                </p>
                <h2 className="text-3xl font-semibold text-neutral-900 font-editorial">
                  Choose the speaking track matched to your goal
                </h2>
                <p className="text-sm text-neutral-600">
                  Every package includes live coach feedback, structured conversation frameworks, and recorded session access.
                </p>
              </div>

              {/* Segmented Filter Control */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 rounded-lg border border-neutral-200 self-start">
                {LEVELS.map((level) => {
                  const active = selectedLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedLevel(level)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {level === 'All' ? 'All Tracks' : level}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingPackages ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-[460px] rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-12 text-center border border-neutral-200 rounded-xl bg-[#F8F9FA]">
                <p className="text-sm font-medium text-neutral-900">
                  No active packages in this level right now.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedLevel('All')}
                  className="mt-3 text-xs font-medium text-[#0F4C3A] underline"
                >
                  Show all available packages
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredPackages.map((pkg) => {
                  const hasDiscount = pkg.originalPrice > pkg.price;
                  const discountPct = hasDiscount
                    ? Math.round(
                        ((pkg.originalPrice - pkg.price) / pkg.originalPrice) *
                          100
                      )
                    : 0;

                  return (
                    <article
                      key={pkg.id}
                      className="flex flex-col border border-neutral-200 rounded-xl bg-white overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100 border-b border-neutral-200">
                        <ImageWithFallback
                          src={pkg.imageUrl}
                          alt={pkg.title}
                          fallbackTitle={pkg.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                        <div className="space-y-3">
                          {/* Clean Unboxed Metadata */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                            <span className="font-medium text-[#0F4C3A]">
                              {pkg.level}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{pkg.duration}</span>
                            <span aria-hidden="true">·</span>
                            <span>{pkg.seatsLabel}</span>
                          </div>

                          <h3 className="text-xl font-semibold text-neutral-900">
                            {pkg.title}
                          </h3>
                          <p className="text-sm text-neutral-600 leading-relaxed">
                            {pkg.subtitle}
                          </p>

                          <ul className="pt-2 space-y-2 border-t border-neutral-100">
                            {pkg.features.slice(0, 4).map((feat, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-sm text-neutral-700"
                              >
                                <Check
                                  className="w-4 h-4 text-[#0F4C3A] shrink-0 mt-0.5"
                                  strokeWidth={2}
                                />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                                {storefront.currencySymbol}
                                {pkg.price.toLocaleString()}
                              </span>
                              {hasDiscount && (
                                <span className="text-sm text-neutral-400 line-through tabular-nums">
                                  {storefront.currencySymbol}
                                  {pkg.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {pkg.format}
                              {hasDiscount ? ` · Save ${discountPct}%` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSyllabusPkg(pkg)}
                              className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors whitespace-nowrap"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              disabled={!storefront.enrollmentOpen}
                              onClick={() => setCheckoutPkg(pkg)}
                              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {storefront.enrollmentOpen
                                ? 'Enroll Now'
                                : 'Waitlist Only'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Curriculum Method & Attributable Results */}
        <section id="curriculum" className="max-w-6xl mx-auto px-6 py-16 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#0F4C3A]">
                  How You Learn
                </p>
                <h2 className="text-3xl font-semibold text-neutral-900 font-editorial">
                  Built for speaking confidence, not passive grammar slides
                </h2>
              </div>

              <div className="divide-y divide-neutral-200 border-y border-neutral-200">
                <div className="py-5 space-y-1">
                  <h3 className="text-base font-semibold text-neutral-900">
                    01. Sentence-Frame Fluency Drills
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Instead of translating word-by-word from Bengali in your head, you master 60+ high-frequency spoken frameworks for instant response.
                  </p>
                </div>
                <div className="py-5 space-y-1">
                  <h3 className="text-base font-semibold text-neutral-900">
                    02. Phonetics & Connected Speech Lab
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Targeted articulation practice eliminates common pronunciation barriers and helps you sound clear on international Zoom calls and IELTS tests.
                  </p>
                </div>
                <div className="py-5 space-y-1">
                  <h3 className="text-base font-semibold text-neutral-900">
                    03. Personal Voice-Note Audits
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    Every learner receives weekly recorded feedback from {storefront.instructorName} pinpointing tone, pacing, and phrasing upgrades.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-neutral-200">
                <div className="text-xs font-medium text-neutral-500">
                  Lead Instructor
                </div>
                <div className="text-base font-semibold text-neutral-900 mt-0.5">
                  {storefront.instructorName}
                </div>
                <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                  {storefront.instructorBio}
                </p>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-neutral-200 bg-white">
                <ImageWithFallback
                  src={LAB_IMAGE_URL}
                  alt="ABY HAYAT EDUCATION phonetics and pronunciation recording studio"
                  fallbackTitle="Phonetics & Pronunciation Studio"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Adjacent Proof: Student Testimonials */}
          <div id="results" className="space-y-8 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#0F4C3A]">
                  Student Outcomes
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 font-editorial mt-1">
                  Measurable speaking progress across cohorts
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {storefront.testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-6 rounded-xl bg-white border border-neutral-200 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-[#0F4C3A]">
                      {t.outcome}
                    </p>
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                    <div className="text-sm font-semibold text-neutral-900">
                      {t.name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {t.role} · {t.organization}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Order Tracker & Free Speaking Assessment */}
        <section
          id="track-order"
          className="border-t border-neutral-200 bg-white py-16"
        >
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Status Lookup */}
            <div className="p-6 sm:p-8 rounded-xl border border-neutral-200 bg-[#F8F9FA] space-y-5">
              <div>
                <p className="text-xs font-medium text-[#0F4C3A]">
                  Enrollment Verification
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 font-editorial mt-1">
                  Track your package order
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Enter your tracking code (e.g. <span className="font-mono">AHE-2026-4821</span>) to view live payment verification status.
                </p>
              </div>

              <form onSubmit={handleTrackSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                  placeholder="Enter Tracking Code"
                  aria-label="Order tracking code"
                  className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                />
                <button
                  type="submit"
                  disabled={trackLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  {trackLoading ? 'Checking...' : 'Check Status'}
                </button>
              </form>

              {trackError && (
                <div className="p-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {trackError}
                </div>
              )}

              {trackResult && (
                <div className="p-5 bg-white border border-neutral-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      {trackResult.orderCode}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        trackResult.status === 'verified'
                          ? 'text-emerald-700'
                          : trackResult.status === 'rejected'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {trackResult.status === 'verified'
                        ? 'Verified & Enrolled'
                        : trackResult.status === 'rejected'
                        ? 'Verification Failed'
                        : 'Pending Admin Verification'}
                    </span>
                  </div>
                  <div className="h-px bg-neutral-100" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-neutral-500">Package</span>
                    <span className="text-right font-medium text-neutral-900">
                      {trackResult.packageTitle}
                    </span>
                    <span className="text-neutral-500">Batch</span>
                    <span className="text-right text-neutral-900">
                      {trackResult.batchPreference}
                    </span>
                    <span className="text-neutral-500">Payment</span>
                    <span className="text-right text-neutral-900 tabular-nums">
                      {trackResult.paymentMethod} · {trackResult.currency}
                      {trackResult.finalPrice.toLocaleString()}
                    </span>
                  </div>
                  {trackResult.adminNote && (
                    <div className="pt-2 border-t border-neutral-100 text-xs text-neutral-700">
                      <span className="font-semibold">Admissions Note: </span>
                      {trackResult.adminNote}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Free Assessment / Callback Request */}
            <div className="p-6 sm:p-8 rounded-xl border border-neutral-200 bg-white space-y-5">
              <div>
                <p className="text-xs font-medium text-[#0F4C3A]">
                  Guidance Desk
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 font-editorial mt-1">
                  Not sure which package fits you?
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Request a free 10-minute speaking level check and batch recommendation from our academic team.
                </p>
              </div>

              {inqSuccess ? (
                <div className="p-5 rounded-lg bg-[#0F4C3A]/5 border border-[#0F4C3A]/20 space-y-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    Assessment Request Received
                  </p>
                  <p className="text-xs text-neutral-600">
                    Thank you. An advisor from {storefront.storeName} will contact you on WhatsApp or phone shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInqSuccess(false)}
                    className="text-xs font-medium text-[#0F4C3A] underline"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <input
                      type="text"
                      required
                      value={inqName}
                      onChange={(e) => setInqName(e.target.value)}
                      placeholder="Your Full Name *"
                      className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                    />
                    <input
                      type="tel"
                      required
                      value={inqPhone}
                      onChange={(e) => setInqPhone(e.target.value)}
                      placeholder="Phone / WhatsApp *"
                      className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <input
                      type="email"
                      value={inqEmail}
                      onChange={(e) => setInqEmail(e.target.value)}
                      placeholder="Email (Optional)"
                      className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                    />
                    <select
                      value={inqLevel}
                      onChange={(e) => setInqLevel(e.target.value)}
                      aria-label="Current English speaking level"
                      className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                    >
                      <option>Beginner — Hesitate while speaking</option>
                      <option>Intermediate — Need workplace fluency</option>
                      <option>IELTS Candidate — Targeting Band 7+</option>
                      <option>Executive — Presentations & Interviews</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={inqGoal}
                    onChange={(e) => setInqGoal(e.target.value)}
                    placeholder="Briefly describe your goal or preferred schedule..."
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/20 focus:border-[#0F4C3A]"
                  />
                  {inqError && (
                    <p className="text-xs text-red-600">{inqError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={inqSubmitting}
                    className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C] disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {inqSubmitting
                      ? 'Submitting...'
                      : 'Request Free Assessment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-200 bg-[#F8F9FA] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-sm font-bold text-neutral-900 font-editorial">
              {storefront.storeName}
            </div>
            <p className="text-xs text-neutral-500">
              Spoken English Coaching & Fluency Labs · {new Date().getFullYear()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {storefront.supportPhone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {storefront.supportEmail}
            </span>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onNavigateAdmin();
              }}
              className="font-medium text-neutral-800 hover:text-[#0F4C3A] underline underline-offset-4"
            >
              Admin Portal
            </a>
          </div>
        </div>
      </footer>

      {/* Package Details / Syllabus Modal */}
      {syllabusPkg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[#0F4C3A] font-medium">
                  {syllabusPkg.level} · {syllabusPkg.duration}
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mt-0.5">
                  {syllabusPkg.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSyllabusPkg(null)}
                aria-label="Close package details"
                className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {syllabusPkg.subtitle}
            </p>
            <div className="space-y-2 border-t border-neutral-200 pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                <BookOpen className="w-4 h-4 text-[#0F4C3A]" />
                What Is Included
              </div>
              <ul className="space-y-2">
                {syllabusPkg.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-neutral-700"
                  >
                    <Check className="w-4 h-4 text-[#0F4C3A] shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <div className="text-lg font-bold text-neutral-900 tabular-nums">
                {storefront.currencySymbol}
                {syllabusPkg.price.toLocaleString()}
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = syllabusPkg;
                  setSyllabusPkg(null);
                  setCheckoutPkg(target);
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0F4C3A] rounded-lg hover:bg-[#0B3A2C]"
              >
                Enroll in Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {checkoutPkg && (
        <CheckoutModal
          pkg={checkoutPkg}
          storefront={storefront}
          paymentSettings={paymentSettings}
          onClose={() => setCheckoutPkg(null)}
          onOrderSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}
