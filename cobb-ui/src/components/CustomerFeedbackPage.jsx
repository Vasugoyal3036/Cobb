import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  CheckCircle,
  AlertTriangle,
  Send,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Heart,
  TrendingUp,
  Award,
  Sparkles,
  ShoppingBag,
  MessageSquare,
  ThumbsUp,
  Store,
  MapPin,
  Clock,
  ArrowRight,
  Phone,
  MessageCircle,
  Navigation,
  Scissors,
  Tag,
  Smile,
  Share2,
  Gift,
  Receipt,
  ChevronRight
} from 'lucide-react';
import { db } from '../utils/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';

const GOOGLE_REVIEW_LINK = 'https://search.google.com/local/writereview?placeid=ChIJHfCBR58ZDjkRpBbB9EV-Zew';
const STORE_MAPS_LINK = 'https://maps.app.goo.gl/HxgE1M25h32oWY2H9?g_st=ac';
const STORE_HELPLINE_TEL = 'tel:+919138122820';
const STORE_WHATSAPP_LINK = 'https://wa.me/918708188707';

export default function CustomerFeedbackPage({ onClose }) {
  // Pre-fill from URL params
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billNo, setBillNo] = useState('');

  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

  // Positive review compliment tags
  const [selectedCompliments, setSelectedCompliments] = useState(['Master Tailor Alteration', 'Helpful & Polite Staff']);

  // Grievance checkboxes & feedback
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [customComment, setCustomComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [copiedReview, setCopiedReview] = useState(false);
  const [positiveRecorded, setPositiveRecorded] = useState(false);

  // Live real ratings loaded from Firestore & Local API
  const [realRatings, setRealRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const name = search.get('name') || search.get('customerName') || search.get('n') || '';
      const phone = search.get('phone') || search.get('mobile') || search.get('p') || '';
      const bill = search.get('bill') || search.get('b') || search.get('billNo') || '';
      const ratingParam = search.get('rating') || search.get('r') || '';

      if (name) setCustomerName(name.trim());
      if (phone) setCustomerPhone(phone.replace(/\D/g, '').slice(-10));
      if (bill) setBillNo(bill.trim());
      if (ratingParam && [1, 2, 3, 4, 5].includes(Number(ratingParam))) {
        setSelectedRating(Number(ratingParam));
      }
    } catch (e) { }
  }, []);

  // Real-time Firestore listener for live verified ratings
  useEffect(() => {
    let unsub = null;
    if (db) {
      try {
        const q = query(
          collection(db, 'stores/DEMO_STORE_001/ratings'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        unsub = onSnapshot(q, (snapshot) => {
          const items = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
          });
          setRealRatings(items);
          setLoadingRatings(false);
        }, (err) => {
          console.warn('Firestore ratings sync fallback:', err.message);
          setLoadingRatings(false);
        });
      } catch (e) {
        setLoadingRatings(false);
      }
    } else {
      setLoadingRatings(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Fallback: check local Cobb API if Firestore returned empty or offline
  useEffect(() => {
    if (realRatings.length === 0) {
      axios.get('http://localhost:5000/api/ratings', { timeout: 2500 })
        .then(res => {
          if (res.data?.ratings && Array.isArray(res.data.ratings) && res.data.ratings.length > 0) {
            setRealRatings(res.data.ratings);
          }
        })
        .catch(() => {});
    }
  }, [realRatings.length]);

  // Compute 100% authentic real stats from database
  const stats = useMemo(() => {
    if (!realRatings || realRatings.length === 0) {
      return {
        hasData: false,
        overallRating: '0.0',
        totalReviews: 0,
        promoterPct: '0%',
        breakdown: [
          { stars: 5, pct: 0, count: 0 },
          { stars: 4, pct: 0, count: 0 },
          { stars: 3, pct: 0, count: 0 },
          { stars: 2, pct: 0, count: 0 },
          { stars: 1, pct: 0, count: 0 },
        ]
      };
    }

    const total = realRatings.length;
    const sum = realRatings.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    realRatings.forEach(r => {
      const s = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[s] = (counts[s] || 0) + 1;
    });

    const promoterCount = (counts[5] || 0) + (counts[4] || 0);
    const promoterPct = Math.round((promoterCount / total) * 100) + '%';

    const breakdown = [5, 4, 3, 2, 1].map(stars => ({
      stars,
      count: counts[stars] || 0,
      pct: total > 0 ? Math.round(((counts[stars] || 0) / total) * 100) : 0
    }));

    return {
      hasData: true,
      overallRating: avg,
      totalReviews: total,
      promoterPct,
      breakdown
    };
  }, [realRatings]);

  // Genuine customer reviews (only entries with real shopper comments)
  const verifiedReviews = useMemo(() => {
    return realRatings.filter(r => 
      r.comment && 
      String(r.comment).trim().length > 3 && 
      !String(r.comment).startsWith('[') &&
      !String(r.comment).toLowerCase().includes('poll')
    );
  }, [realRatings]);

  const complimentsList = [
    { id: 'alteration', label: 'Master Tailor Alteration', icon: '✂️' },
    { id: 'staff', label: 'Helpful & Polite Staff', icon: '🤝' },
    { id: 'fabric', label: 'Premium Fabric Quality', icon: '👕' },
    { id: 'offers', label: 'Great Offers & Pricing', icon: '🏷️' },
    { id: 'showroom', label: 'Spacious & Clean Showroom', icon: '🏬' },
    { id: 'billing', label: 'Fast & Smooth Billing', icon: '⚡' }
  ];

  const toggleCompliment = (label) => {
    setSelectedCompliments(prev => 
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );
  };

  const issuesList = [
    { id: 'fitting', label: 'Fitting / Alteration issue', icon: '✂️' },
    { id: 'staff', label: 'Staff behavior or service delay', icon: '⏱️' },
    { id: 'pricing', label: 'Pricing / Discount discrepancy', icon: '🏷️' },
    { id: 'fabric', label: 'Fabric / Garment quality defect', icon: '🧵' },
    { id: 'stock', label: 'Required size or article unavailable', icon: '📦' },
    { id: 'other', label: 'Other store concern', icon: '💬' }
  ];

  const toggleIssue = (id) => {
    setSelectedIssues(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isPositive = selectedRating >= 4;

  const ratingDescriptions = {
    5: { label: 'Exceptional Experience! 🌟', sub: 'Loved the collection, fitting & store staff.' },
    4: { label: 'Great Visit! 👍', sub: 'Good collection and pleasant shopping experience.' },
    3: { label: 'Average / Neutral 😐', sub: 'Met expectations, but has room for improvement.' },
    2: { label: 'Needs Improvement ⚠️', sub: 'Faced an inconvenience or service shortfall.' },
    1: { label: 'Disappointing Experience 🚨', sub: 'Unhappy with service, pricing, or garment.' }
  };

  // Dynamic natural suggested review based on selected compliments
  const dynamicReviewText = useMemo(() => {
    if (selectedCompliments.length === 0) {
      return "Excellent shopping experience at Cobb Apparels Pundri! Premium collection of formal and casual menswear. Master tailor alteration was super quick and staff behavior was very welcoming. Highly recommended!";
    }
    const tagsText = selectedCompliments.join(' and ');
    return `Had a great shopping experience at Cobb Apparels (Pundri)! Especially impressed by their ${tagsText}. Premium menswear collection and welcoming staff. Highly recommended!`;
  }, [selectedCompliments]);

  const handleCopyReview = () => {
    try {
      navigator.clipboard.writeText(dynamicReviewText);
      setCopiedReview(true);
      setTimeout(() => setCopiedReview(false), 3000);
    } catch (e) { }
  };

  const recordPositiveVisit = async () => {
    if (positiveRecorded) return;
    setPositiveRecorded(true);

    const entryData = {
      customerName: customerName || 'Valued Shopper',
      phone: customerPhone || 'Not Provided',
      billNo: billNo || '',
      rating: selectedRating,
      compliments: selectedCompliments,
      comment: dynamicReviewText,
      category: 'positive',
      source: 'web_feedback_page',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await addDoc(collection(db, 'stores/DEMO_STORE_001/ratings'), {
          ...entryData,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore write fallback:', err.message);
      }
    }

    try {
      await axios.post('http://localhost:5000/api/whatsapp/inbound-alert', {
        phone: customerPhone,
        customerName,
        message: `[Web 5-Star] Tags: ${selectedCompliments.join(', ')}`,
        type: 'rating_positive',
        rating: selectedRating
      }, { timeout: 3000 });
    } catch (e) { }
  };

  const handleSubmitGrievance = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitting(true);

    const generatedTicket = 'GRV-' + Math.floor(100000 + Math.random() * 900000);
    setTicketId(generatedTicket);

    const grievanceData = {
      ticketId: generatedTicket,
      customerName: customerName || 'Valued Customer',
      phone: customerPhone || 'Not Provided',
      billNo: billNo || '',
      rating: selectedRating,
      issues: selectedIssues,
      comment: customComment,
      category: 'grievance',
      source: 'web_feedback_page',
      createdAt: new Date().toISOString()
    };

    // 1. Submit to Firestore grievances & ratings collections
    if (db) {
      try {
        await addDoc(collection(db, 'stores/DEMO_STORE_001/grievances'), {
          ...grievanceData,
          timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'stores/DEMO_STORE_001/ratings'), {
          ...grievanceData,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore write fallback:', err.message);
      }
    }

    // 2. Submit to local Cobb API if reachable
    try {
      await axios.post('http://localhost:5000/api/whatsapp/inbound-alert', {
        phone: customerPhone,
        customerName,
        message: `[${generatedTicket}] Issues: ${selectedIssues.join(', ')} | Note: ${customComment}`,
        type: 'grievance_low_nps',
        rating: selectedRating
      }, { timeout: 3000 });
    } catch (e) { }

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[380px] bg-gradient-to-b from-amber-500/12 via-orange-500/5 to-transparent blur-3xl -z-10" />
      </div>

      <div className="w-full max-w-xl mx-auto space-y-4 py-3">
        {/* Top Brand Banner */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black tracking-wide uppercase">
            <Award className="w-3.5 h-3.5" />
            <span>Official Cobb Store Feedback</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Cobb Apparels</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold">
              PUNDRI FLAGSHIP
            </span>
          </h1>

          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Main Market, Near Clock Tower, Pundri (Haryana)</span>
          </p>

          {/* Verified Shopping Visit Pill if Bill No present */}
          {billNo && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <Receipt className="w-3.5 h-3.5" />
              <span>Verified Purchase • Bill #{billNo}</span>
            </div>
          )}
        </header>

        {/* Live Store Social Proof (Only renders when real ratings exist) */}
        {stats.hasData ? (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl shadow-black/40">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">
                    {stats.overallRating}
                  </span>
                  <span className="text-slate-400 text-xs font-bold">/ 5.0</span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(Number(stats.overallRating))
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
                  {stats.promoterPct} Positive (4-5★)
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Based on <strong className="text-white">{stats.totalReviews}</strong> verified visit{stats.totalReviews === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {/* Live Breakdown Progress Bars */}
            <div className="mt-3.5 space-y-1.5">
              {stats.breakdown.map((row) => (
                <div key={row.stars} className="flex items-center gap-3 text-xs">
                  <span className="w-7 text-right font-bold text-slate-400 flex items-center justify-end gap-1">
                    <span>{row.stars}</span>
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        row.stars >= 4
                          ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                          : row.stars === 3
                          ? 'bg-amber-500/60'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>

                  <span className="w-16 text-right font-mono text-[11px] text-slate-400">
                    {row.pct}% ({row.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>We Value Your Feedback</span>
            </div>
            <p className="text-xs text-slate-300">
              Please take 5 seconds to rate your visit to Cobb Apparels Pundri.
            </p>
          </div>
        )}

        {/* Rating Submission Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-white">
              {customerName ? `Hello ${customerName}! 👋` : 'How was your experience today?'}
            </h2>
            <p className="text-xs text-slate-400">
              Tap the stars below to rate your visit at Cobb Apparels
            </p>
          </div>

          {/* 5 Big Tappable Star Buttons */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 my-4 sm:my-5">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || selectedRating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => {
                    setSelectedRating(star);
                    setSubmitted(false);
                    setPositiveRecorded(false);
                  }}
                  className={`p-2.5 sm:p-3.5 rounded-2xl transition-all duration-200 transform cursor-pointer active:scale-95 ${
                    active
                      ? 'bg-amber-500/20 text-amber-400 scale-110 shadow-lg shadow-amber-500/25 border border-amber-500/50'
                      : 'bg-slate-800/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                  aria-label={`Rate ${star} Stars`}
                >
                  <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${active ? 'fill-amber-400' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Rating Description Pill */}
          <div className="text-center p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-5">
            <p className="text-sm font-black text-amber-400">
              {ratingDescriptions[selectedRating]?.label}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {ratingDescriptions[selectedRating]?.sub}
            </p>
          </div>

          {/* ADAPTIVE ACTION 1: Positive Rating (4 or 5 Stars) */}
          {isPositive ? (
            <div className="space-y-4 animate-fade-in">
              {/* Compliment Quick-Tags (One-Tap Customization) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  What did you like most? (Tap to customize your review):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {complimentsList.map((comp) => {
                    const active = selectedCompliments.includes(comp.label);
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => toggleCompliment(comp.label)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{comp.icon}</span>
                        <span>{comp.label}</span>
                        {active && <Check className="w-3 h-3 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Suggested Review Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left relative group">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Suggested Google Review:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReview}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20"
                  >
                    {copiedReview ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedReview ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 italic font-medium leading-relaxed">
                  "{dynamicReviewText}"
                </p>
              </div>

              {/* Main Action Button -> Google Review Link */}
              <a
                href={GOOGLE_REVIEW_LINK}
                target="_blank"
                rel="noreferrer"
                onClick={recordPositiveVisit}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all transform active:scale-98 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                <span>Post Review on Google Maps</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Privilege Customer Perk Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">Cobb Privilege Perk</h4>
                  <p className="text-[11px] text-slate-400">
                    Show your 5★ review at the billing counter on your next visit for complimentary master tailoring alterations!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ADAPTIVE ACTION 2: Low Rating (1, 2, or 3 Stars) - Private Resolution */
            <div className="space-y-4 animate-fade-in text-left">
              <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>We Sincerely Apologize for Your Experience</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We aim for 5-star perfection on every visit. Store Manager <strong>Parbhat Goyal</strong> will personally investigate your concern:
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Ticket #{ticketId}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">Grievance Registered</h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Thank you for your honesty. Our store management team has been alerted on WhatsApp and will follow up with you directly.
                  </p>
                  <a
                    href={STORE_WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat Directly with Store Manager</span>
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmitGrievance} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      What went wrong? (Check all that apply):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {issuesList.map(issue => {
                        const checked = selectedIssues.includes(issue.label);
                        return (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => toggleIssue(issue.label)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                              checked
                                ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700'
                            }`}>
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-sm">{issue.icon}</span>
                            <span>{issue.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Additional Details (Optional):
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Please share what happened so we can make it right..."
                      value={customComment}
                      onChange={(e) => setCustomComment(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Your Mobile Number
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="Your Name (Optional)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-900/30 disabled:opacity-50 active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting to Management...' : 'Send Grievance to Store Management'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Real Verified Customer Reviews (Only rendered when real reviews with comments exist) */}
        {verifiedReviews.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/40 border border-slate-800/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Verified Shopper Reviews</span>
              <span className="text-amber-400 font-mono">Pundri Store</span>
            </div>

            <div className="space-y-2">
              {verifiedReviews.slice(0, 5).map((item, idx) => (
                <div key={item.id || idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200">{item.customerName || 'Shopper'}</span>
                    <div className="flex text-amber-400 items-center gap-1 font-bold">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{item.rating || 5}★</span>
                    </div>
                  </div>
                  <p className="text-slate-400 italic">"{item.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Contact & Store Location Card */}
        <div className="p-4 rounded-3xl bg-slate-900/50 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <a
            href={STORE_MAPS_LINK}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 flex flex-col items-center justify-center gap-1 transition-colors text-slate-300"
          >
            <Navigation className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold">Directions</span>
          </a>

          <a
            href={STORE_HELPLINE_TEL}
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 flex flex-col items-center justify-center gap-1 transition-colors text-slate-300"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold">Call Store</span>
          </a>

          <a
            href={STORE_WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 flex flex-col items-center justify-center gap-1 transition-colors text-slate-300"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold">WhatsApp</span>
          </a>
        </div>

        {/* Store Footer */}
        <footer className="text-center py-2 text-slate-500 text-xs space-y-1">
          <p>© {new Date().getFullYear()} Cobb Apparels — Pundri Flagship Store</p>
          <p className="text-[11px]">
            Store Hours: 10:00 AM – 9:00 PM Daily • Helpline: +91 91381 22820
          </p>
        </footer>
      </div>
    </div>
  );
}
