// ─── SANGAM.AI · Central content system ─────────────────────────────
// Psychology notes:
//  - Specific numbers beat adjectives (authority + believability)
//  - Loss-aversion framing in hero/pricing (missed revenue > gained efficiency)
//  - Identity framing in use-cases ("built for clinics like yours")

export const STATS = [
  { value: '38,400+', label: 'Conversations handled', sub: 'across WhatsApp · IG · Gmail · Voice' },
  { value: '4.2×', label: 'More bookings captured', sub: 'vs. missed-call baseline' },
  { value: '< 8s', label: 'Median first reply', sub: '24/7 — even on Dashain holidays' },
  { value: '61 hrs', label: 'Saved per location / mo', sub: 'front-desk + follow-up automation' },
];

export const TICKER_ITEMS = [
  'Himal Dental just booked 3 root-canals via WhatsApp',
  'Thread & Needle recovered Rs. 84,000 in abandoned carts',
  'Sagarmatha Fitness filled 92% of morning slots',
  'Kathmandu Skin Clinic cut no-shows by 43%',
  'Pokhara Eats auto-confirmed 211 weekend tables',
  'EduBridge Nepal answered 1,940 FAQs in Nepali + English',
];

export const AI_EMPLOYEES = [
  {
    id: 'receptionist', icon: 'support_agent', color: 'cyan',
    name: 'Receptionist AI', tag: 'Front desk, never closed',
    desc: 'Greets every visitor in Nepali or English, answers FAQs, routes to the right human only when needed.',
    metric: 'Answers 87% without humans', channels: ['WhatsApp', 'Web', 'Voice'],
  },
  {
    id: 'booking', icon: 'calendar_month', color: 'violet',
    name: 'Booking Agent', tag: 'Calendar that sells',
    desc: 'Offers live slots, books, reschedules, sends reminders and fills cancellations from the waitlist.',
    metric: '+4.2× bookings captured', channels: ['Calendar', 'WhatsApp', 'SMS'],
  },
  {
    id: 'sales', icon: 'trending_up', color: 'orange',
    name: 'Sales Closer', tag: 'Follows up relentlessly',
    desc: 'Chases quotes, carts and cold leads with polite persistence — in the tone your brand uses.',
    metric: 'Recovers 31% of dead leads', channels: ['WhatsApp', 'IG', 'Email'],
  },
  {
    id: 'support', icon: 'headset_mic', color: 'emerald',
    name: 'Support Resolver', tag: 'RAG-grounded answers',
    desc: 'Resolves tickets from your knowledge base, creates escalations with full context for humans.',
    metric: '62% auto-resolved', channels: ['Gmail', 'Web', 'IG'],
  },
  {
    id: 'review', icon: 'star', color: 'amber',
    name: 'Review Booster', tag: '5-star flywheel',
    desc: 'Asks happy customers for Google reviews at the perfect moment, deflects unhappy ones privately.',
    metric: '+2.1× Google reviews', channels: ['WhatsApp', 'SMS'],
  },
  {
    id: 'payment', icon: 'payments', color: 'emerald',
    name: 'Payment Collector', tag: 'eSewa · Khalti · Stripe',
    desc: 'Sends smart payment links, nudges overdue invoices, reconciles and receipts automatically.',
    metric: '38% faster collection', channels: ['eSewa', 'Khalti', 'Stripe'],
  },
  {
    id: 'marketer', icon: 'campaign', color: 'violet',
    name: 'Campaign Marketer', tag: 'Festival-ready blasts',
    desc: 'Runs Dashain/Tihar/New-Year offers across WhatsApp + IG with segments, not spam.',
    metric: '3.8% click-to-visit', channels: ['WhatsApp', 'IG'],
  },
  {
    id: 'hr', icon: 'group', color: 'cyan',
    name: 'HR Screener', tag: 'Hiring without chaos',
    desc: 'Screens CVs, schedules interviews, sends assessments and reminders to candidates.',
    metric: 'Saves 19 hrs / hire', channels: ['Email', 'Calendar'],
  },
  {
    id: 'inventory', icon: 'inventory_2', color: 'orange',
    name: 'Inventory Watcher', tag: 'Never stock-out',
    desc: 'Tracks low stock, auto-alerts suppliers and updates the team before you run dry.',
    metric: '-44% stock-outs', channels: ['Web', 'SMS'],
  },
  {
    id: 'analyst', icon: 'insights', color: 'cyan',
    name: 'Insight Analyst', tag: 'Morning brief, daily',
    desc: 'Summarises yesterday: revenue, no-shows, top objections, and exactly what to fix today.',
    metric: 'Daily 7 AM brief', channels: ['Email', 'Dashboard'],
  },
  {
    id: 'translator', icon: 'translate', color: 'violet',
    name: 'Nepali Voice AI', tag: 'Nepali NLP pipeline',
    desc: 'Understands Roman Nepali, Devanagari and code-mixed speech. Replies naturally both ways.',
    metric: 'Nepali + English + Roman', channels: ['Voice', 'WhatsApp'],
  },
  {
    id: 'handoff', icon: 'handshake', color: 'emerald',
    name: 'Human Handoff', tag: 'Graceful escalation',
    desc: 'Detects anger, confusion or VIPs and hands off with transcript, sentiment and suggested reply.',
    metric: '< 30s escalation', channels: ['All'],
  },
];

export const INDUSTRIES = [
  {
    icon: 'local_hospital', name: 'Clinics & Hospitals',
    pain: 'Patients call at 9 PM. Nobody picks up. They book elsewhere.',
    fix: 'Receptionist + Booking + Reminders handle OPD, follow-ups and lab reports in Nepali.',
    result: '-43% no-shows · +4.2× bookings',
  },
  {
    icon: 'restaurant', name: 'Restaurants & Cafés',
    pain: 'Weekend rush = missed DMs, lost tables, angry reviews.',
    fix: 'Booking Agent confirms tables, waitlists cancellations, collects deposits via eSewa.',
    result: '211 tables auto-confirmed / weekend',
  },
  {
    icon: 'fitness_center', name: 'Gyms & Studios',
    pain: 'Trial leads go cold in 2 hours. Trainers chase instead of coach.',
    fix: 'Sales Closer + Reminders follow up trials, fill off-peak slots, renew memberships.',
    result: '92% morning occupancy',
  },
  {
    icon: 'school', name: 'Schools & Consultancies',
    pain: 'Counsellors drown in "fee? intake? IELTS?" repeats.',
    fix: 'Receptionist + Analyst answer FAQs, book counselling calls, nurture parents.',
    result: '1,940 FAQs answered / month',
  },
  {
    icon: 'checkroom', name: 'Retail & Fashion',
    pain: 'IG DMs pile up. "Price? Size? Delivery?" — sales walk away.',
    fix: 'Sales Closer + Payment Collector reply in seconds, recover carts, take Khalti.',
    result: 'Rs. 84,000 carts recovered / mo',
  },
  {
    icon: 'real_estate_agent', name: 'Real Estate & Rentals',
    pain: 'Site-visit no-shows burn agent days and fuel costs.',
    fix: 'Booking Agent qualifies, schedules, reminds and re-books no-shows automatically.',
    result: '2.6× site-visits held',
  },
];

export const PRICING = [
  {
    name: 'Starter', tagline: 'For single shops proving AI works',
    monthly: 4999, yearly: 3999, currency: 'Rs.',
    cta: 'Start 14-day free trial',
    features: [
      '1 AI Employee (choose any)',
      '1,000 conversations / mo',
      'WhatsApp + Website widget',
      'Nepali + English NLP',
      'Basic analytics',
      'Email support (< 24h)',
    ],
    notIncluded: ['Voice AI', 'eSewa / Khalti auto-collect', 'Team seats'],
    highlight: false,
  },
  {
    name: 'Growth', tagline: 'For clinics, restaurants & gyms that live on bookings',
    monthly: 12999, yearly: 9999, currency: 'Rs.',
    badge: 'MOST POPULAR · saves Rs. 36,000/yr',
    cta: 'Claim Growth trial',
    features: [
      '5 AI Employees + Handoff',
      '10,000 conversations / mo',
      'WhatsApp · IG · Gmail · Voice',
      'Bookings + reminders + waitlist',
      'eSewa · Khalti · Stripe links',
      'Review booster + campaigns',
      '3 team seats + roles',
      'Priority support (< 4h)',
    ],
    notIncluded: [],
    highlight: true,
  },
  {
    name: 'Scale', tagline: 'For chains, hospitals & high-volume teams',
    monthly: 29999, yearly: 23999, currency: 'Rs.',
    cta: 'Talk to sales',
    features: [
      'All 12 AI Employees',
      'Unlimited conversations',
      'Custom Nepali voice + RAG on your data',
      'Multi-location + API + webhooks',
      'Dedicated success manager',
      'SSO, audit logs, SLA 99.9%',
      'Onboarding + staff training',
    ],
    notIncluded: [],
    highlight: false,
  },
];

export const INTEGRATIONS = [
  { name: 'WhatsApp Business', icon: 'chat', status: 'Live', desc: 'Official API · templates approved' },
  { name: 'Instagram', icon: 'photo_camera', status: 'Live', desc: 'DMs + comments auto-reply' },
  { name: 'Gmail / Outlook', icon: 'mail', status: 'Live', desc: '2-way sync + auto-draft' },
  { name: 'Twilio Voice', icon: 'call', status: 'Live', desc: 'Nepali + English IVR' },
  { name: 'Google Calendar', icon: 'event', status: 'Live', desc: 'Real-time slots + reminders' },
  { name: 'eSewa', icon: 'wallet', status: 'Live', desc: 'Payment links + verify' },
  { name: 'Khalti', icon: 'account_balance_wallet', status: 'Live', desc: 'Collect + reconcile' },
  { name: 'Stripe', icon: 'credit_card', status: 'Live', desc: 'Cards + invoices' },
];

export const TESTIMONIALS = [
  {
    quote: 'We stopped losing evening patients. The AI books OPD slots at 11 PM in Nepali — my receptionist finally breathes.',
    name: 'Dr. Anisha Shrestha', role: 'Himal Dental, Kathmandu',
    metric: '+4.2× bookings', initials: 'AS',
  },
  {
    quote: 'Dashain campaign paid for the whole year. WhatsApp blasts filled our tables both weekends, zero extra staff.',
    name: 'Rabin Thapa', role: 'Pokhara Eats, Pokhara',
    metric: '211 tables / weekend', initials: 'RT',
  },
  {
    quote: 'Abandoned carts were dead money. Now the Sales Closer recovers them politely — Rs. 84,000 last month alone.',
    name: 'Priya Maharjan', role: 'Thread & Needle, Lalitpur',
    metric: '31% carts recovered', initials: 'PM',
  },
];

export const FAQS = [
  {
    q: 'Will it speak Nepali properly — including Roman Nepali?',
    a: 'Yes. Our Nepali NLP pipeline handles Devanagari, Roman Nepali ("hajur, appointment book garna milcha?") and code-mixed English. It replies in whatever script your customer uses.',
  },
  {
    q: 'What happens when AI can’t handle something?',
    a: 'Human Handoff triggers in under 30 seconds — with full transcript, sentiment, and a suggested reply. VIPs, anger, or medical edge-cases route instantly. You never lose control.',
  },
  {
    q: 'Do I need to change my number or Instagram?',
    a: 'No. We connect the official WhatsApp Business API to your existing number and Instagram Graph API to your page. Your followers notice faster replies, not new accounts.',
  },
  {
    q: 'How do payments work with eSewa / Khalti?',
    a: 'Payment Collector sends smart links, verifies eSewa/Khalti transactions, nudges overdue invoices and issues receipts. Stripe covers cards for international customers.',
  },
  {
    q: 'Is my customer data safe?',
    a: 'Encryption in transit + at rest, per-business data isolation, audit logs, session revocation, and rate-limited auth. Scale plan adds SSO and 99.9% SLA.',
  },
  {
    q: 'How fast can we go live?',
    a: 'Most businesses launch in 48 hours: connect channels → upload FAQs/menus/price lists → pick your AI Employees → test in Nepali + English → go live. We onboard you personally.',
  },
];

export const NAV_LINKS = [
  { label: 'Employees', href: '#employees' },
  { label: 'Industries', href: '#industries' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];
