import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronDown,
  Store,
  Target,
  Lightbulb,
  Headset,
  MessageCircle,
  Send,
  AlertCircle
} from 'lucide-react';
import { Button, useScrollReveal } from '../components/ui';

interface StaticPagesProps {
  pageType: 'about' | 'contact' | 'faq';
  onNavigate: (page: string) => void;
}

export const StaticPages: React.FC<StaticPagesProps> = ({ pageType, onNavigate }) => {
  // FAQ questions toggle
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const aboutHeroReveal = useScrollReveal<HTMLElement>();
  const aboutStoryReveal = useScrollReveal<HTMLDivElement>();
  const aboutStatsReveal = useScrollReveal<HTMLElement>();
  const aboutBenefitsReveal = useScrollReveal<HTMLDivElement>();

  const faqs = [
    {
      q: 'هل قلم بادهاوس يدعم جميع أجهزة الآيباد ويدعم راحة اليد (Palm Rejection)؟',
      a: 'نعم، قلم بادهاوس الذكي مصمم بأحدث التقنيات ليدعم جميع أجهزة الآيباد المدعومة من عام 2018 حتى موديلات 2026 (iPad Pro, iPad Air, iPad 10th/9th/8th, iPad mini). كما يدعم تقنية رفض راحة اليد التامة وحساسية الإمالة للتظليل دون أي تقطيع.'
    },
    {
      q: 'كم تستغرق مدة التوصيل، وهل الدفع عند الاستلام متاح؟',
      a: 'يتم التوصيل إلى جميع مدن ومحافظات الضفة الغربية والقدس وضواحيها خلال 24 إلى 48 ساعة كحد أقصى. الدفع عند الاستلام متاح نقداً بعد فحص ومعاينة الطرد وسلامته.'
    },
    {
      q: 'ما هي كفالة وضمان المنتجات المباعة من بادهاوس؟',
      a: 'نحن نمنح ضمان استبدال فوري لمدة 12 شهراً كاملاً على أقلام بادهاوس، كيبوردات الآيباد، وكابلات الشحن ضد أي خلل أو عيب مصنعي.'
    },
    {
      q: 'كيف أختار مقاس الكفر أو شاشة الحماية المناسبة لجهازي؟',
      a: 'يمكنك معرفة رقم موديل جهازك من خلف الآيباد أو من (الإعدادات > عام > حول). وإذا كنت غير متأكد، تواصل معنا مباشرة عبر الواتساب على 0599123456 وسنقوم بمطابقة القطعة الأنسب لجهازك فوراً.'
    },
    {
      q: 'ما هو الفرق بين شاشة الزجاج 9H وشاشة PaperFeel؟',
      a: 'شاشة الزجاج 9H توفر أقصى حماية ضد الصدمات والكسر بوضوح شاشة كريستالي. بينما شاشة PaperFeel تقدم ملمساً ورقيّاً مطفياً خشناً يمنع انعكاس الضوء ويمنح الرسامين والطلاب تجربة كتابة بالقلم مطابقة تماماً للكتابة على الورق الحقيقي.'
    }
  ];

  // Contact form (UI/UX only — submission flow unchanged)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string; message?: string }>({});
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const contactHeroReveal = useScrollReveal<HTMLElement>();
  const contactGridReveal = useScrollReveal<HTMLDivElement>();

  const contactChannels: { icon: typeof MapPin; title: string; value: React.ReactNode; href?: string; ltr?: boolean }[] = [
    { icon: MapPin, title: 'المقر والمستودعات', value: 'فلسطين — رام الله والبيرة، شارع الماصيون' },
    { icon: Phone, title: 'الهاتف المباشر والواتساب', value: '+970 59 912 3456', href: 'tel:+970599123456', ltr: true },
    { icon: Mail, title: 'البريد الإلكتروني', value: 'support@padhouse.ps', href: 'mailto:support@padhouse.ps', ltr: true },
    {
      icon: Clock,
      title: 'أوقات العمل والدعم',
      value: (
        <>
          يومياً من <span dir="ltr" className="ph-ltr">9:00</span> صباحاً حتى{' '}
          <span dir="ltr" className="ph-ltr">9:00</span> مساءً
        </>
      ),
    },
  ];

  const contactPills = ['دعم واتساب مباشر', 'رد خلال ساعات العمل', 'ضمان استبدال 12 شهراً'];

  const updateContactField = (field: 'name' | 'phone' | 'message', value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
    setContactErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactSubmitting) return;

    const nextErrors: { name?: string; phone?: string; message?: string } = {};
    if (contactForm.name.trim().length < 2) nextErrors.name = 'يرجى إدخال الاسم الكريم.';
    if (contactForm.phone.replace(/\D/g, '').length < 7) nextErrors.phone = 'يرجى إدخال رقم هاتف صحيح.';
    if (contactForm.message.trim().length < 10) nextErrors.message = 'يرجى كتابة استفسارك بما لا يقل عن 10 أحرف.';

    setContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setContactSubmitting(true);
    window.setTimeout(() => {
      setContactSubmitting(false);
      setContactSubmitted(true);
    }, 700);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-right">
      {/* 1. ABOUT US */}
      {pageType === 'about' && (
        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-ph-border shadow-xl">
          {/* Hero */}
          <header
            ref={aboutHeroReveal.ref}
            style={aboutHeroReveal.style}
            className={`${aboutHeroReveal.className} relative overflow-hidden`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-ph-brand/10 blur-3xl"
            />
            <div className="relative space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-ph-brand/25 bg-ph-brand/10 px-3 py-1 text-[11px] font-bold text-ph-brand">
                <Store className="h-3.5 w-3.5" aria-hidden="true" />
                قصة بادهاوس
              </span>
              <h1 className="text-2xl font-black leading-[1.35] text-ph-ink sm:text-3xl lg:text-[2.1rem]">
                المتجر الفلسطيني المتخصص لملحقات أجهزة الآيباد
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-ph-muted sm:text-[15px] sm:leading-8">
                بدأت حكاية بادهاوس في رام الله من حاجة بسيطة: أن يجد مستخدم الآيباد في فلسطين ملحقاً مناسباً لجهازه مع وصف واضح وخدمة محلية موثوقة. نجمع خيارات عملية للطلاب والمصممين والمهنيين، ونساعد العملاء على اختيار القطعة المتوافقة قبل الشراء.
              </p>
            </div>
          </header>

          {/* Mission & approach */}
          <section aria-labelledby="about-approach-title" className="border-t border-ph-border pt-7">
            <h2 id="about-approach-title" className="mb-4 text-sm font-bold text-ph-ink">
              رسالتنا ونهجنا
            </h2>
            <div
              ref={aboutStoryReveal.ref}
              style={aboutStoryReveal.style}
              className={`${aboutStoryReveal.className} ph-stagger-reveal grid grid-cols-1 gap-4 sm:grid-cols-2`}
            >
              {[
                {
                  icon: Target,
                  title: 'رسالتنا في فلسطين',
                  body: 'نسهّل استخدام الآيباد للدراسة والعمل والإبداع عبر ملحقات مختارة بعناية ومعلومات توافق واضحة، مع خدمة تنطلق من رام الله وتصل إلى مختلف المحافظات.',
                },
                {
                  icon: Lightbulb,
                  title: 'لماذا الملحقات المتخصصة؟',
                  body: 'اختيار القلم أو الكفر أو لوحة المفاتيح وفق موديل الجهاز يحسّن الكتابة والحماية والإنتاجية ويقلّل القطع غير المناسبة، لذلك نوضح التوافق والاستخدام قبل الطلب.',
                },
                {
                  icon: ShieldCheck,
                  title: 'كيف نراجع الجودة؟',
                  body: 'نفحص التصنيع والتشطيب ونجرّب الوظائف الأساسية مثل الاقتران والشحن واستجابة الأزرار، ثم نتحقق من بيانات التوافق والضمان قبل عرض المنتج.',
                },
                {
                  icon: MapPin,
                  title: 'محطاتنا',
                  body: 'من متجر متخصص انطلق من رام الله إلى كتالوج يضم الأقلام والكفرات ولوحات المفاتيح والحوامل والشحن والحماية، مع دعم لمطابقة الملحق مع جهازك.',
                },
              ].map(({ icon: Icon, title, body }, index) => (
                <div
                  key={title}
                  className="ph-stagger-item"
                  style={{ '--ph-stagger-index': index } as React.CSSProperties}
                >
                  <article className="group h-full rounded-2xl border border-ph-border bg-ph-surface-soft p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ph-brand/40 hover:bg-white hover:shadow-lg">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ph-brand ring-1 ring-ph-border transition-colors duration-300 group-hover:bg-ph-brand group-hover:text-white group-hover:ring-ph-brand">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-bold text-ph-ink">{title}</h3>
                    <p className="text-xs leading-6 text-ph-muted sm:text-[13px] sm:leading-7">{body}</p>
                  </article>
                </div>
              ))}
            </div>
          </section>

          {/* Quick stats */}
          <section
            ref={aboutStatsReveal.ref}
            style={aboutStatsReveal.style}
            className={`${aboutStatsReveal.className} grid grid-cols-2 gap-3 border-t border-ph-border pt-6 sm:grid-cols-4`}
          >
            {[
              ['6', 'فئات ملحقات'],
              ['رام الله', 'نقطة انطلاقنا'],
              ['iPad', 'توافق حسب الموديل'],
              ['12 شهراً', 'ضمان على المنتجات'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-ph-border bg-ph-background p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-ph-brand/40 hover:bg-white hover:shadow-md"
              >
                <strong className="block text-lg font-black text-ph-brand">{value}</strong>
                <span className="mt-1 block text-xs text-ph-muted">{label}</span>
              </div>
            ))}
          </section>

          {/* Value propositions */}
          <section aria-labelledby="about-values-title" className="border-t border-ph-border pt-7">
            <h2 id="about-values-title" className="mb-4 text-sm font-bold text-ph-ink">
              لماذا تختار بادهاوس؟
            </h2>
            <div
              ref={aboutBenefitsReveal.ref}
              style={aboutBenefitsReveal.style}
              className={`${aboutBenefitsReveal.className} ph-stagger-reveal grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`}
            >
              {[
                {
                  icon: Truck,
                  title: 'توصيل سريع وموثوق',
                  description: 'توصيل لجميع محافظات الضفة والقدس وضواحيها خلال 24-48 ساعة.',
                },
                {
                  icon: ShieldCheck,
                  title: 'ضمان أصلي حقيقي',
                  description: 'جميع المنتجات مضمونة مع استبدال فوري في حال أي عيب مصنعي.',
                },
                {
                  icon: RotateCcw,
                  title: 'استرجاع واستبدال مرن',
                  description: 'إمكانية استبدال القطع ومراجعة التوافق مع موديل جهازك بكل سهولة.',
                },
                {
                  icon: CreditCard,
                  title: 'الدفع عند الاستلام',
                  description: 'ادفع نقداً عند باب منزلك بعد فحص ومعاينة الطرد وسلامته.',
                },
              ].map(({ icon: Icon, title, description }, index) => (
                <div
                  key={title}
                  className="ph-stagger-item"
                  style={{ '--ph-stagger-index': index } as React.CSSProperties}
                >
                  <article className="group h-full rounded-2xl border border-ph-border bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-ph-brand/40 hover:shadow-lg">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ph-surface-soft text-ph-brand transition-colors duration-300 group-hover:bg-ph-brand group-hover:text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mb-1 text-xs font-bold text-ph-ink">{title}</h3>
                    <p className="text-xs leading-relaxed text-ph-muted">{description}</p>
                  </article>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 2. CONTACT US */}
      {pageType === 'contact' && (
        <div className="space-y-8 rounded-3xl border border-ph-border bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:p-10">
          <header
            ref={contactHeroReveal.ref}
            style={contactHeroReveal.style}
            className={`${contactHeroReveal.className} relative overflow-hidden`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-ph-brand/10 blur-3xl"
            />
            <div className="relative space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-ph-brand/25 bg-ph-brand/10 px-3 py-1 text-[11px] font-bold text-ph-brand">
                <Headset className="h-3.5 w-3.5" aria-hidden="true" />
                دعم ومبيعات بادهاوس
              </span>
              <h1 className="text-2xl font-black text-ph-ink sm:text-3xl">تواصل مع فريق خدمة عملاء بادهاوس</h1>
              <p className="max-w-2xl text-xs leading-6 text-ph-muted sm:text-sm">
                فريق الدعم الفني والمبيعات جاهز للرد على استفساراتكم حول التوافق والشحن واختيار الملحقات الأنسب لجهازك.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {contactPills.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ph-border bg-ph-surface-soft px-3 py-1.5 text-[11px] font-semibold text-ph-muted transition-colors duration-200 hover:border-ph-brand/30 hover:text-ph-brand"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ph-brand/70" />
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div
            ref={contactGridReveal.ref}
            style={contactGridReveal.style}
            className={`${contactGridReveal.className} grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8`}
          >
            {/* Contact Details */}
            <section aria-labelledby="contact-channels-title" className="flex h-full flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ph-brand/10 text-ph-brand">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </span>
                <h2 id="contact-channels-title" className="text-sm font-bold text-ph-ink">
                  قنوات التواصل المباشر
                </h2>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5">
                {contactChannels.map(({ icon: Icon, title, value, href, ltr }) => (
                  <li key={title} className="flex-1">
                    <div className="group flex h-full items-center gap-3 rounded-2xl border border-ph-border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-ph-brand/40 hover:shadow-[0_6px_18px_rgba(28,168,158,0.10)]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ph-surface-soft text-ph-brand transition-colors duration-300 group-hover:bg-ph-brand group-hover:text-white">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs font-bold text-ph-ink">{title}</strong>
                        {href ? (
                          <a
                            href={href}
                            className={`mt-0.5 block text-xs leading-6 text-ph-muted transition-colors duration-200 hover:text-ph-brand ${ltr ? 'ph-ltr' : ''}`}
                          >
                            {value}
                          </a>
                        ) : (
                          <span className="mt-0.5 block text-xs leading-6 text-ph-muted">{value}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Contact Form */}
            <section aria-labelledby="contact-form-title" className="flex h-full flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ph-brand/10 text-ph-brand">
                  <Send className="h-4 w-4" aria-hidden="true" />
                </span>
                <h2 id="contact-form-title" className="text-sm font-bold text-ph-ink">
                  أرسل استفسارك
                </h2>
              </div>

              <div className="flex flex-1 flex-col rounded-2xl border border-ph-border bg-ph-surface-soft/60 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:p-6">

              {contactSubmitted ? (
                <div role="status" className="flex flex-1 flex-col items-center justify-center space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <span className="ph-check-animated mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-6 w-6 text-[#16A34A]" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-bold text-emerald-900">تم إرسال رسالتك بنجاح!</h3>
                  <p className="text-xs leading-6 text-emerald-700">
                    سيقوم فريق الدعم بالتواصل معك عبر الواتساب أو الهاتف خلال ساعات قليلة.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} noValidate className="flex flex-1 flex-col gap-4">
                  {Object.values(contactErrors).some(Boolean) && (
                    <div role="alert" className="flex items-center gap-2 rounded-xl border border-ph-error/25 bg-ph-error/5 px-3 py-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-ph-error" aria-hidden="true" />
                      <p className="text-xs font-bold text-ph-error">يرجى تصحيح الحقول المطلوبة أدناه.</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="contact-name" className="ph-input-label">الاسم الكريم *</label>
                    <input
                      id="contact-name"
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => updateContactField('name', e.target.value)}
                      placeholder="أدخل اسمك"
                      className="ph-input"
                      aria-invalid={contactErrors.name ? true : undefined}
                      aria-describedby={contactErrors.name ? 'contact-name-error' : undefined}
                    />
                    {contactErrors.name && (
                      <p id="contact-name-error" role="alert" className="ph-input-error">{contactErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="ph-input-label">رقم الهاتف *</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      inputMode="tel"
                      value={contactForm.phone}
                      onChange={(e) => updateContactField('phone', e.target.value)}
                      placeholder="059xxxxxxx"
                      className="ph-input"
                      aria-invalid={contactErrors.phone ? true : undefined}
                      aria-describedby={contactErrors.phone ? 'contact-phone-error' : undefined}
                    />
                    {contactErrors.phone && (
                      <p id="contact-phone-error" role="alert" className="ph-input-error">{contactErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="ph-input-label">الرسالة أو الاستفسار *</label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => updateContactField('message', e.target.value)}
                      placeholder="اكتب استفسارك عن التوافق أو طلبك..."
                      className="ph-input resize-y"
                      aria-invalid={contactErrors.message ? true : undefined}
                      aria-describedby={contactErrors.message ? 'contact-message-error' : undefined}
                    />
                    {contactErrors.message && (
                      <p id="contact-message-error" role="alert" className="ph-input-error">{contactErrors.message}</p>
                    )}
                  </div>

                  <Button type="submit" variant="primary" loading={contactSubmitting} className="mt-auto w-full">
                    {contactSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
                  </Button>
                </form>
              )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* 3. FAQ */}
      {pageType === 'faq' && (
        <div className="space-y-6 rounded-3xl border border-ph-border bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)] sm:p-10">
          <header className="space-y-2">
            <span className="text-xs font-bold text-ph-brand">إجابات فورية</span>
            <h1 className="text-2xl font-black text-ph-ink sm:text-3xl">الأسئلة الشائعة والأكثر تكراراً</h1>
            <p className="max-w-2xl text-xs leading-6 text-ph-muted">
              كل ما تود معرفته حول ملحقات الآيباد، الشحن، الضمان والدفع.
            </p>
          </header>

          <div className="space-y-3 pt-4">
            {faqs.map((f, idx) => {
              const isOpen = openFaq === idx;
              const panelId = `ph-faq-panel-${idx}`;
              const buttonId = `ph-faq-button-${idx}`;
              return (
                <div
                  key={idx}
                  className={`overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
                    isOpen
                      ? 'border-ph-brand shadow-[0_8px_24px_rgba(28,168,158,0.12)]'
                      : 'border-ph-border hover:border-ph-brand/50 hover:shadow-[0_2px_12px_rgba(15,23,42,0.06)]'
                  }`}
                >
                  <h2>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-right sm:p-5"
                    >
                      <span
                        className={`text-xs font-bold leading-6 transition-colors duration-200 sm:text-sm ${
                          isOpen ? 'text-ph-brand' : 'text-ph-ink'
                        }`}
                      >
                        {f.q}
                      </span>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          isOpen ? 'rotate-180 bg-ph-brand text-white' : 'bg-ph-surface-soft text-ph-muted'
                        }`}
                        aria-hidden="true"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>
                  </h2>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="mx-4 border-t border-ph-border pb-4 pt-3 text-xs leading-7 text-ph-muted sm:mx-5">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

