import {
  Coupon,
  CoursePackage,
  PaymentSettings,
  StorefrontSettings,
} from './types';

export const PRESET_IMAGES = [
  {
    label: 'Foundation Fluency Desk',
    url: '/src/assets/images/pkg_foundation_fluency_1794844761090.jpg',
  },
  {
    label: 'Executive & IELTS Studio',
    url: '/src/assets/images/pkg_ielts_executive_1794844762425.jpg',
  },
  {
    label: '1-on-1 Personal Mentoring',
    url: '/src/assets/images/pkg_one_on_one_coaching_1794844762672.jpg',
  },
  {
    label: 'Pronunciation & Phonetics Lab',
    url: '/src/assets/images/pkg_pronunciation_lab_1794844763199.jpg',
  },
  {
    label: 'Spoken Academy Classroom',
    url: '/src/assets/images/hero_spoken_academy_1794844760933.jpg',
  },
];

export const HERO_IMAGE_URL =
  '/src/assets/images/hero_spoken_academy_1794844760933.jpg';
export const LAB_IMAGE_URL =
  '/src/assets/images/pkg_pronunciation_lab_1794844763199.jpg';

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  storeName: 'ABY HAYAT EDUCATION',
  announcementEnabled: true,
  announcementText:
    'New Spoken English Cohort starts next Monday — Use code FLUENT20 for 20% off any package.',
  heroHeadline: 'Speak English with clarity, calm confidence, and natural fluency.',
  heroSubheadline:
    'ABY HAYAT EDUCATION trains professionals, university students, and IELTS candidates through structured speaking labs, live conversation drills, and direct instructor feedback.',
  enrollmentOpen: true,
  currencySymbol: '৳',
  currencyCode: 'BDT',
  supportPhone: '+880 1700-000000',
  supportEmail: 'admissions@abyhayateducation.com',
  whatsappNumber: '+880 1700-000000',
  instructorName: 'Aby Hayat',
  instructorBio:
    'Lead Spoken English & Phonetics Coach with 9+ years guiding 1,400+ learners from hesitation to natural workplace and IELTS fluency.',
  testimonials: [
    {
      id: 't1',
      name: 'Nadia Rahman',
      role: 'Product Analyst',
      organization: 'Dhaka FinTech Group',
      outcome: 'Cleared international client interviews in 8 weeks',
      quote:
        'Before joining ABY HAYAT EDUCATION, I understood English well but froze during live team calls. Daily guided roleplays removed my hesitation completely.',
    },
    {
      id: 't2',
      name: 'Tanvir Ahmed',
      role: 'Graduate Applicant',
      organization: 'BRAC University Alumni',
      outcome: 'IELTS Speaking Band 6.0 to 7.5',
      quote:
        'The pronunciation lab and mock interview recordings showed me the exact filler words and grammar slips holding back my score.',
    },
    {
      id: 't3',
      name: 'Sadia Chowdhury',
      role: 'Operations Lead',
      organization: 'Global Apparel Sourcing',
      outcome: 'Promoted to lead overseas buyer meetings',
      quote:
        'Every class is 80% active speaking. Having structured sentence frames for negotiations made an immediate difference at work.',
    },
  ],
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  autoConfirmNote:
    'Submit your Transaction ID (TrxID) after sending payment. Our admissions desk verifies and activates batch access within 30 minutes.',
  methods: [
    {
      id: 'bkash',
      name: 'bKash',
      type: 'mobile_wallet',
      enabled: true,
      accountType: 'Merchant / Personal',
      accountNumber: '01700-000001',
      accountName: 'ABY HAYAT EDUCATION',
      instructions:
        'Open bKash App -> Send Money or Payment -> Enter our number -> Reference your Name -> Copy the 10-digit TrxID below.',
    },
    {
      id: 'nagad',
      name: 'Nagad',
      type: 'mobile_wallet',
      enabled: true,
      accountType: 'Personal',
      accountNumber: '01800-000002',
      accountName: 'ABY HAYAT EDUCATION',
      instructions:
        'Open Nagad App -> Send Money -> Enter our Nagad number -> Enter package total -> Paste the Transaction ID below.',
    },
    {
      id: 'rocket',
      name: 'Rocket (DBBL)',
      type: 'mobile_wallet',
      enabled: true,
      accountType: 'Personal',
      accountNumber: '01900-000003-8',
      accountName: 'ABY HAYAT EDUCATION',
      instructions:
        'Send Money via Rocket app or *322# -> Enter the exact package amount -> Paste your TrxID below.',
    },
    {
      id: 'bank',
      name: 'Bank Transfer / NPSB',
      type: 'bank',
      enabled: true,
      accountType: 'Current Account',
      accountNumber: '1234-5678-90123 (Dutch-Bangla Bank, Banani Branch)',
      accountName: 'ABY HAYAT EDUCATION',
      instructions:
        'Transfer via BEFTN, NPSB, or bank deposit -> Enter your bank reference/receipt number in the TrxID field.',
    },
  ],
};

export const DEFAULT_PACKAGES: CoursePackage[] = [
  {
    id: 'pkg-foundation-fluency',
    title: 'Foundation Spoken Fluency',
    subtitle:
      'Build everyday conversational confidence, core sentence structures, and hesitation-free speaking from day one.',
    level: 'Beginner',
    duration: '8 Weeks',
    format: '24 Live Classes + Audio Drills',
    price: 3500,
    originalPrice: 5000,
    imageUrl: '/src/assets/images/pkg_foundation_fluency_1794844761090.jpg',
    features: [
      'Live small-group speaking sessions (3 days/week)',
      'Core grammar-in-speech framework without rote memorization',
      'Weekly 1-on-1 pronunciation & fluency check-ins',
      'Printable conversation cue cards and vocabulary bank',
    ],
    featured: false,
    active: true,
    seatsLabel: '12 seats remaining',
    sortOrder: 1,
  },
  {
    id: 'pkg-workplace-fluency',
    title: 'Everyday & Workplace Fluency',
    subtitle:
      'Speak naturally in meetings, job interviews, presentations, and spontaneous daily conversations.',
    level: 'Intermediate',
    duration: '10 Weeks',
    format: '30 Live Labs + Speaking Club',
    price: 4800,
    originalPrice: 6500,
    imageUrl: '/src/assets/images/pkg_pronunciation_lab_1794844763199.jpg',
    features: [
      'Real-world roleplays: interviews, client calls, and presentations',
      'Phonetics & connected speech training for crisp clarity',
      'Daily guided WhatsApp voice-note feedback from coaches',
      'Full session recordings and executive phrasebook PDF',
    ],
    featured: true,
    active: true,
    seatsLabel: '8 seats remaining',
    sortOrder: 2,
  },
  {
    id: 'pkg-ielts-executive',
    title: 'IELTS & Executive Speaking',
    subtitle:
      'Targeted Band 7.5+ IELTS speaking preparation and high-stakes communication strategy.',
    level: 'IELTS & Career',
    duration: '8 Weeks',
    format: '24 Intensive Sessions + 6 Mocks',
    price: 6500,
    originalPrice: 8500,
    imageUrl: '/src/assets/images/pkg_ielts_executive_1794844762425.jpg',
    features: [
      '6 full-length recorded IELTS Speaking mock interviews',
      'Band-by-band rubric breakdown (Fluency, Lexical, Grammar, Pronunciation)',
      'Part 2 cue-card structuring and Part 3 abstract discussion mastery',
      'Personalized error log and weekly improvement targets',
    ],
    featured: true,
    active: true,
    seatsLabel: '6 seats remaining',
    sortOrder: 3,
  },
  {
    id: 'pkg-one-on-one',
    title: '1-on-1 Private Fluency Coaching',
    subtitle:
      'Fully customized schedule and curriculum tailored to your career goals, accent clarity, and pace.',
    level: '1-on-1 Coaching',
    duration: '6 Weeks',
    format: '18 Private 1-on-1 Sessions',
    price: 9500,
    originalPrice: 12000,
    imageUrl: '/src/assets/images/pkg_one_on_one_coaching_1794844762672.jpg',
    features: [
      'Flexible morning, evening, or weekend private booking slots',
      'Custom syllabus built around your industry or upcoming exam',
      'Speech recording analysis and individualized accent coaching',
      'Direct priority WhatsApp access to lead instructor Aby Hayat',
    ],
    featured: false,
    active: true,
    seatsLabel: '4 private slots open',
    sortOrder: 4,
  },
];

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'FLUENT20',
    code: 'FLUENT20',
    discountType: 'percent',
    discountValue: 20,
    description: '20% Launch Cohort Scholarship',
    active: true,
  },
  {
    id: 'ABY500',
    code: 'ABY500',
    discountType: 'fixed',
    discountValue: 500,
    description: 'Flat 500 BDT Early Bird Discount',
    active: true,
  },
];
