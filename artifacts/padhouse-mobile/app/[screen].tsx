import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, formatShekel, PRODUCTS } from '@/constants/products';
import {
  AppHeader,
  Button,
  Card,
  Chip,
  EmptyState,
  Notice,
  Page,
  PHText,
  ProductCard,
  ProductGrid,
  SectionTitle,
  TextField,
} from '@/components/PadHouseUI';
import { useStore } from '@/store/StoreContext';

function normalize(value: string) {
  return value.toLocaleLowerCase('ar').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim();
}

function SearchScreen() {
  const colors = useColors();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useStore();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const term = normalize(query);
    if (!term) return [];
    return PRODUCTS.filter((product) =>
      normalize(`${product.name} ${product.category} ${product.description} ${product.compatibility} ${product.specs.join(' ')}`).includes(term),
    );
  }, [query]);
  const suggestions = ['قلم الآيباد', 'كفر شفاف', 'كيبورد', 'موديل 2018'];

  return (
    <Page>
      <AppHeader title="البحث" subtitle="ابحث في الكتالوج المرجعي" />
      <TextField
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => addRecentSearch(query)}
        returnKeyType="search"
        placeholder="ابحث عن منتج أو فئة أو توافق منشور"
        autoCorrect={false}
      />
      {query.trim() ? (
        <>
          <SectionTitle title={`${results.length} نتائج`} action="مسح" onAction={() => setQuery('')} />
          {results.length ? <ProductGrid products={results} /> : <EmptyState title="لا توجد نتائج" detail="جرّب اسمًا أو فئة أخرى. لا تتضمن النتائج مخزونًا أو موديلات غير منشورة." icon="search-outline" />}
        </>
      ) : (
        <>
          <SectionTitle title="عمليات البحث الأخيرة" action={recentSearches.length ? 'مسح' : undefined} onAction={clearRecentSearches} />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {recentSearches.length
              ? recentSearches.map((item) => <Chip key={item} title={item} onPress={() => setQuery(item)} />)
              : <PHText color={colors.mutedForeground} style={{ fontSize: 12 }}>لا توجد عمليات بحث محفوظة بعد.</PHText>}
          </View>
          <SectionTitle title="اقتراحات" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map((item) => <Chip key={item} title={item} onPress={() => setQuery(item)} />)}
          </View>
        </>
      )}
      <Notice>البحث محلي في البيانات المتاحة على التطبيق؛ لا يوجد اتصال مباشر بمخزون المتجر.</Notice>
    </Page>
  );
}

function FavoritesScreen() {
  const colors = useColors();
  const { favorites } = useStore();
  const items = PRODUCTS.filter((product) => favorites.includes(product.id));
  return (
    <Page>
      <AppHeader title="المفضلة" subtitle="محفوظة محليًا على هذا الجهاز" />
      {items.length ? <ProductGrid products={items} /> : <EmptyState title="لا توجد منتجات محفوظة" detail="اضغط على رمز القلب في أي منتج لإضافته إلى المفضلة." icon="heart-outline" />}
      <Notice>لن تتم مزامنة المفضلة قبل ربط حسابات العملاء.</Notice>
      <Button title="تصفح الكتالوج" icon="grid-outline" kind="secondary" onPress={() => router.push('/categories' as any)} style={{ marginTop: 12 }} />
    </Page>
  );
}

function CompareScreen() {
  const colors = useColors();
  const { compareIds, toggleCompare } = useStore();
  const selected = PRODUCTS.filter((product) => compareIds.includes(product.id));
  const options = PRODUCTS.filter((product) => !compareIds.includes(product.id));
  const rows: Array<[string, (product: typeof PRODUCTS[number]) => string]> = [
    ['السعر المرجعي', (product) => formatShekel(product.price)],
    ['التصنيف', (product) => product.category],
    ['المواصفات', (product) => product.specs.join('، ')],
    ['التوافق المنشور', (product) => product.compatibility],
    ['الكفالة', (product) => product.warranty],
  ];
  return (
    <Page>
      <AppHeader title="مقارنة المنتجات" subtitle="معلومات منشورة فقط؛ غير المتوفر موضح" />
      <Notice>يمكن اختيار حتى أربعة منتجات. لا تعرض المقارنة التقييمات أو المخزون أو بيانات غير متصلة.</Notice>
      <SectionTitle title={`المنتجات المختارة (${selected.length}/4)`} />
      {selected.length ? selected.map((product) => (
        <Card key={product.id}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 }}>
            <Pressable onPress={() => router.push(`/product/${product.id}` as any)} style={{ flex: 1 }} accessibilityRole="button">
              <PHText weight="bold">{product.name}</PHText>
            </Pressable>
            <Pressable onPress={() => toggleCompare(product.id)} accessibilityRole="button" accessibilityLabel="إزالة من المقارنة">
              <Ionicons name="close-circle-outline" size={21} color={colors.destructive} />
            </Pressable>
          </View>
          {rows.map(([label, getValue]) => (
            <View key={label} style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 9 }}>
              <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>{label}</PHText>
              <PHText style={{ fontSize: 12, lineHeight: 19, marginTop: 2 }}>{getValue(product)}</PHText>
            </View>
          ))}
        </Card>
      )) : <EmptyState title="اختر منتجين للمقارنة" detail="استخدم زر المقارنة في بطاقة المنتج أو تفاصيله." icon="git-compare-outline" />}
      {selected.length < 4 && options.length ? (
        <>
          <SectionTitle title="إضافة منتج" />
          <View style={{ gap: 7 }}>
            {options.map((product) => (
              <Pressable key={product.id} onPress={() => toggleCompare(product.id)} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <PHText weight="semibold">{product.name}</PHText>
                  <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>{formatShekel(product.price)}</PHText>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Button title="العودة للتصنيفات" kind="secondary" onPress={() => router.push('/categories' as any)} style={{ marginTop: 12 }} />
    </Page>
  );
}

function FinderScreen() {
  const colors = useColors();
  const { compareIds, toggleCompare } = useStore();
  const [step, setStep] = useState(0);
  const [model, setModel] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState(200);
  const [feature, setFeature] = useState('');
  const [error, setError] = useState('');
  const options = ['دراسة', 'رسم وتصميم', 'الكتابة والعمل', 'الحماية والتنقل'];
  const recommended = useMemo(() => {
    let found = PRODUCTS.filter((product) =>
      (!category || product.category === category) &&
      product.price <= budget &&
      (!feature || feature === 'لا تفضيل' || normalize(`${product.name} ${product.specs.join(' ')}`).includes(normalize(feature))),
    );
    if (!found.length) {
      found = PRODUCTS.filter((product) => (!category || product.category === category) && product.price <= budget);
    }
    return found;
  }, [category, budget, feature]);

  const progress = Math.min(step, 5) / 5;
  const advance = () => {
    if (step === 0 && !model.trim()) {
      setError('اكتب موديل جهازك أو اختر «لا أعرف».');
      return;
    }
    setError('');
    setStep((current) => Math.min(5, current + 1));
  };

  return (
    <Page>
      <AppHeader title="مستشار اختيار الإكسسوار" subtitle="مرشد محلي تجريبي من بيانات الكتالوج" />
      <View style={{ height: 7, borderRadius: 99, backgroundColor: colors.muted, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ height: 7, width: `${progress * 100}%`, backgroundColor: colors.primary, alignSelf: 'flex-end' }} />
      </View>
      {step < 5 ? (
        <>
          <Card>
            <PHText color={colors.primary} weight="bold" style={{ fontSize: 12 }}>الخطوة {step + 1} من 5</PHText>
            {step === 0 ? <>
              <PHText weight="bold" style={{ fontSize: 19, marginTop: 6 }}>ما موديل iPad الذي تستخدمه؟</PHText>
              <TextField value={model} onChangeText={setModel} placeholder="اكتب الاسم أو القياس كما يظهر على الجهاز" style={{ marginTop: 12 }} />
              <Button title="لا أعرف الموديل" kind="ghost" onPress={() => { setModel('غير معروف'); setError(''); }} style={{ marginTop: 8 }} />
            </> : null}
            {step === 1 ? <>
              <PHText weight="bold" style={{ fontSize: 19, marginTop: 6 }}>ما استخدامك الأساسي؟</PHText>
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
                {options.map((item) => <Chip key={item} title={item} selected={purpose === item} onPress={() => setPurpose(item)} />)}
              </View>
            </> : null}
            {step === 2 ? <>
              <PHText weight="bold" style={{ fontSize: 19, marginTop: 6 }}>أي نوع من الإكسسوارات تحتاج؟</PHText>
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
                <Chip title="أي نوع" selected={!category} onPress={() => setCategory('')} />
                {CATEGORIES.map((item) => <Chip key={item.id} title={item.name} selected={category === item.name} onPress={() => setCategory(item.name)} />)}
              </View>
            </> : null}
            {step === 3 ? <>
              <PHText weight="bold" style={{ fontSize: 19, marginTop: 6 }}>ما الحد الأعلى لميزانيتك؟</PHText>
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
                {[30, 50, 120, 200].map((amount) => <Chip key={amount} title={`حتى ${amount}₪`} selected={budget === amount} onPress={() => setBudget(amount)} />)}
              </View>
            </> : null}
            {step === 4 ? <>
              <PHText weight="bold" style={{ fontSize: 19, marginTop: 6 }}>هل لديك تفضيل محدد؟</PHText>
              <PHText color={colors.mutedForeground} style={{ fontSize: 12, marginTop: 4 }}>اختياري؛ الخيارات مقتصرة على ما ورد في الكتالوج.</PHText>
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
                {['لا تفضيل', 'شفاف', 'كيبورد', 'كاربون'].map((item) => <Chip key={item} title={item} selected={feature === item} onPress={() => setFeature(item === 'لا تفضيل' ? '' : item)} />)}
              </View>
            </> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}
          </Card>
          <View style={{ flexDirection: 'row-reverse', gap: 9 }}>
            {step > 0 ? <View style={{ flex: 1 }}><Button title="السابق" kind="secondary" onPress={() => { setError(''); setStep((current) => current - 1); }} /></View> : null}
            <View style={{ flex: 1 }}><Button title={step === 4 ? 'عرض الاقتراحات' : 'متابعة'} icon="arrow-back" onPress={advance} /></View>
          </View>
        </>
      ) : (
        <>
          <Notice tone="warning">هذه اقتراحات محلية حسب نوع المنتج والميزانية فقط، وليست توصية ذكاء اصطناعي. لا يمكن التحقق من الموديل الدقيق أو المخزون.</Notice>
          <SectionTitle title="النتائج من الكتالوج" />
          {recommended.length ? recommended.map((product) => (
            <Card key={product.id}>
              <PHText weight="bold">{product.name}</PHText>
              <PHText weight="semibold" color={colors.primary} style={{ marginTop: 4 }}>{formatShekel(product.price)}</PHText>
              <PHText color={colors.mutedForeground} style={{ fontSize: 12, lineHeight: 20, marginTop: 6 }}>
                {purpose ? `مناسب للفئة التي اخترتها (${purpose}) وفقًا لاسم المنتج؛ ` : ''}{product.compatibility}
              </PHText>
              <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 11 }}>
                <View style={{ flex: 1 }}><Button title="تفاصيل المنتج" kind="secondary" onPress={() => router.push(`/product/${product.id}` as any)} /></View>
                <View style={{ flex: 1 }}><Button title="أضف للمقارنة" kind="ghost" onPress={() => {
                  if (!compareIds.includes(product.id) && !toggleCompare(product.id)) {
                    setError('يمكن مقارنة أربعة منتجات كحد أقصى.');
                    return;
                  }
                  router.push('/compare' as any);
                }} /></View>
              </View>
            </Card>
          )) : <EmptyState title="لا توجد نتيجة ضمن الميزانية" detail="وسّع الميزانية أو غيّر نوع الإكسسوار. لا يتم اختراع منتجات غير مدرجة." />}
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button title="تعديل الإجابات" kind="secondary" onPress={() => setStep(0)} />
        </>
      )}
    </Page>
  );
}

function ChatScreen() {
  const colors = useColors();
  const { chatMessages, sendChatMessage } = useStore();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [chatMessages]);
  const suggestions = ['هل قلم PadHouse متوافق؟', 'كم رسوم التوصيل؟', 'ما كفالة القلم؟'];
  const send = (value = message) => {
    if (!value.trim()) return;
    sendChatMessage(value);
    setMessage('');
  };

  return (
    <Page scroll={false}>
      <AppHeader title="مساعد PadHouse التجريبي" subtitle="ردود محلية من معلومات الكتالوج المنشورة" />
      <Notice tone="warning">خدمة الذكاء الاصطناعي غير متصلة. الردود محدودة ولا تؤكد المخزون أو حالة الطلب.</Notice>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={{ flex: 1, marginTop: 8 }} contentContainerStyle={{ gap: 9, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
          {chatMessages.map((item) => (
            <View key={item.id} style={{ alignSelf: item.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '91%' }}>
              <View style={{ borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: item.role === 'user' ? colors.primary : colors.card, borderWidth: item.role === 'user' ? 0 : 1, borderColor: colors.border }}>
                <PHText style={{ fontSize: 13, lineHeight: 21 }}>{item.text}</PHText>
              </View>
              {item.productIds?.length ? item.productIds.map((productId) => {
                const product = PRODUCTS.find((candidate) => candidate.id === productId);
                if (!product) return null;
                return <Pressable key={product.id} onPress={() => router.push(`/product/${product.id}` as any)} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 7, padding: 8, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: product.image }} contentFit="contain" style={{ width: 48, height: 48 }} />
                  <View style={{ flex: 1 }}><PHText weight="semibold" numberOfLines={1} style={{ fontSize: 12 }}>{product.name}</PHText><PHText color={colors.primary} weight="bold">{formatShekel(product.price)}</PHText></View>
                  <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
                </Pressable>;
              }) : null}
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7, paddingVertical: 7 }}>
          {suggestions.map((item) => <Chip key={item} title={item} onPress={() => send(item)} />)}
        </View>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="اكتب سؤالك"
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            style={{ flex: 1, minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.input, paddingHorizontal: 12, color: colors.foreground, fontFamily: 'Cairo_400Regular', textAlign: 'right', writingDirection: 'rtl' }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="إرسال" onPress={() => send()} style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="send" size={19} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <Button title="التواصل مع المتجر" kind="ghost" icon="help-circle-outline" onPress={() => router.push('/support' as any)} style={{ marginBottom: 7 }} />
      </KeyboardAvoidingView>
    </Page>
  );
}

function OrdersScreen() {
  const colors = useColors();
  const { orders } = useStore();
  return (
    <Page>
      <AppHeader title="طلباتي" subtitle="السجل التجريبي على هذا الجهاز" />
      <Notice tone="warning">هذه ليست طلبات المتجر. لن تظهر حالة توصيل أو دفع حقيقية حتى يتصل نظام الطلبات.</Notice>
      {orders.length ? orders.map((order) => (
        <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}` as any)} accessibilityRole="button" style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 14, marginTop: 10 }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <PHText weight="bold">{order.id}</PHText>
            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
          </View>
          <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 5 }}>{new Date(order.createdAt).toLocaleDateString('ar-PS')} · {order.items.length} منتجات</PHText>
          <PHText color={colors.warning} weight="semibold" style={{ marginTop: 7, fontSize: 12 }}>محفوظ محليًا — غير مرسل للمتجر</PHText>
          <PHText weight="bold" style={{ marginTop: 6 }}>{formatShekel(order.total)}</PHText>
        </Pressable>
      )) : <EmptyState title="لا توجد طلبات محفوظة" detail="تجربة الطلب المحلية تظهر هنا بعد إتمامها." icon="receipt-outline" />}
      <Button title="تصفح المنتجات" kind="secondary" onPress={() => router.push('/categories' as any)} style={{ marginTop: 14 }} />
    </Page>
  );
}

async function openStoreWebsite(onError: () => void) {
  try {
    await Linking.openURL('https://padhouse.ps');
  } catch {
    onError();
  }
}

function SupportScreen() {
  const colors = useColors();
  const [error, setError] = useState(false);
  return (
    <Page>
      <AppHeader title="المساعدة والدعم" subtitle="خيارات واضحة دون ادعاء اتصال مباشر" />
      <Notice tone="warning">لا يوجد ربط مع نظام التذاكر أو خدمة دعم آلية. المحادثة داخل التطبيق تجريبية.</Notice>
      <Card>
        <PHText weight="bold" style={{ fontSize: 16 }}>محادثة المتجر التجريبية</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 12, lineHeight: 20, marginTop: 4 }}>تجيب محليًا عن بعض معلومات المنتجات المنشورة فقط.</PHText>
        <Button title="فتح المحادثة" icon="chatbubble-ellipses-outline" onPress={() => router.push('/chat' as any)} style={{ marginTop: 10 }} />
      </Card>
      <Card>
        <PHText weight="bold" style={{ fontSize: 16 }}>الأسئلة الشائعة</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 12, lineHeight: 20, marginTop: 4 }}>راجع بيانات التوصيل والكفالة وما لم يتم التحقق منه.</PHText>
        <Button title="عرض الأسئلة" icon="help-circle-outline" kind="secondary" onPress={() => router.push('/faq' as any)} style={{ marginTop: 10 }} />
      </Card>
      <Card>
        <PHText weight="bold" style={{ fontSize: 16 }}>التواصل عبر الموقع الرسمي</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 12, lineHeight: 20, marginTop: 4 }}>سيفتح موقع المتجر في المتصفح؛ لن تتم مشاركة بيانات هذا التطبيق.</PHText>
        {error ? <Notice tone="error">تعذر فتح الموقع على هذا الجهاز.</Notice> : null}
        <Button title="فتح padhouse.ps" icon="open-outline" kind="secondary" onPress={() => { setError(false); void openStoreWebsite(() => setError(true)); }} style={{ marginTop: 10 }} />
      </Card>
      <Button title="طلب متابعة تجريبي" kind="ghost" icon="paper-plane-outline" onPress={() => router.push('/escalation' as any)} />
    </Page>
  );
}

function FAQScreen() {
  const colors = useColors();
  const faqs = [
    ['ما توافق قلم PadHouse؟', 'صفحة المنتج تذكر أجهزة iPad من إصدار 2018 فما بعد. تحقّق من رقم الموديل مع المتجر قبل الشراء.'],
    ['ما المقاسات المنشورة للكفرات؟', 'تظهر خيارات 10.2، و10.9/11، و12.9/13 إنش. الموديلات المحددة غير مؤكدة.'],
    ['كم رسوم التوصيل؟', 'المعلومات المنشورة التي راجعناها: الضفة 20₪، القدس 30₪، مناطق 48 70₪، واستلام نابلس 0₪. أكّد الرسوم الحالية مع المتجر.'],
    ['ما وسائل الدفع المتاحة؟', 'لم يتم التحقق من إعداد الدفع. هذا التطبيق لا يقبل مدفوعات.'],
    ['كيف أتابع طلبي؟', 'سجل الطلب في التطبيق تجريبي ومحلي فقط. افتح موقع المتجر للتأكد من أي طلب حقيقي.'],
    ['ما سياسة الإرجاع؟', 'لم تتوفر لنا سياسة مؤكدة. تواصل مع المتجر قبل الشراء.'],
  ];
  return (
    <Page>
      <AppHeader title="الأسئلة الشائعة" />
      {faqs.map(([question, answer]) => (
        <Card key={question}>
          <PHText weight="bold">{question}</PHText>
          <PHText color={colors.mutedForeground} style={{ lineHeight: 21, marginTop: 7 }}>{answer}</PHText>
        </Card>
      ))}
      <Button title="تواصل مع المتجر" icon="open-outline" onPress={() => router.push('/support' as any)} />
    </Page>
  );
}

function EscalationScreen() {
  const colors = useColors();
  const [details, setDetails] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <Page>
      <AppHeader title="متابعة مع المتجر" />
      <Notice tone="warning">لا يوجد نظام تذاكر متصل. حفظ هذه الرسالة لا يرسلها إلى المتجر.</Notice>
      {saved ? (
        <EmptyState title="تم حفظ مسودة محلية" detail="لم يتم إرسالها. افتح موقع المتجر للتواصل مباشرة." icon="save-outline" />
      ) : (
        <>
          <TextField label="ملاحظة لنفسك (اختياري)" value={details} onChangeText={setDetails} placeholder="اكتب ما تريد تذكره عند التواصل" multiline />
          <Button title="حفظ مسودة على الجهاز" icon="save-outline" onPress={() => setSaved(true)} style={{ marginTop: 13 }} />
        </>
      )}
      <Button title="فتح موقع المتجر" icon="open-outline" kind="secondary" onPress={() => { void openStoreWebsite(() => setSaved(false)); }} style={{ marginTop: 9 }} />
    </Page>
  );
}

function SettingsScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useStore();
  return (
    <Page>
      <AppHeader title="الإعدادات والخصوصية" />
      <Card>
        <PHText weight="bold">تفضيلات الإشعارات</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 12, lineHeight: 20, marginTop: 4 }}>هذا التفضيل محلي فقط؛ لا يتم طلب إذن إشعارات أو إرسال رسائل.</PHText>
        <Button title={profile.notificationsEnabled ? 'الإشعارات المحلية مفعّلة' : 'الإشعارات المحلية متوقفة'} icon={profile.notificationsEnabled ? 'notifications-outline' : 'notifications-off-outline'} kind="secondary" onPress={() => updateProfile({ notificationsEnabled: !profile.notificationsEnabled })} style={{ marginTop: 11 }} />
      </Card>
      <Notice tone="warning">الحسابات ومزامنة البيانات وحذف الحساب غير متصلة. البيانات التجريبية محفوظة على هذا الجهاز.</Notice>
      <Button title="معلومات الخصوصية" kind="ghost" onPress={() => router.push('/support' as any)} />
    </Page>
  );
}

function AuthScreen({ mode }: { mode: string }) {
  const title = mode === 'register' ? 'إنشاء حساب' : mode === 'forgot' || mode === 'forgot-password' ? 'استعادة كلمة المرور' : 'تسجيل الدخول';
  return (
    <Page>
      <AppHeader title={title} />
      <Notice tone="warning">خدمة حسابات المتجر غير متصلة. لم يتم إنشاء حساب أو إرسال كلمة مرور، ولا تدخل بيانات سرية هنا.</Notice>
      <Card>
        <PHText weight="bold" style={{ fontSize: 17 }}>يمكنك التسوق كضيف</PHText>
        <PHText style={{ lineHeight: 22, marginTop: 5 }}>تصفح المنتجات، أضفها إلى السلة، واحفظ تجربة الطلب محليًا. بيانات الضيف لا تتم مزامنتها مع المتجر.</PHText>
      </Card>
      <Button title="متابعة كضيف" icon="arrow-back" onPress={() => router.replace('/' as any)} />
      <Button title="زيارة موقع المتجر" icon="open-outline" kind="secondary" onPress={() => { void openStoreWebsite(() => {}); }} style={{ marginTop: 9 }} />
    </Page>
  );
}

export default function DynamicScreen() {
  const params = useLocalSearchParams<{ screen?: string }>();
  const screen = typeof params.screen === 'string' ? params.screen : '';
  console.log('[PadHouse] dynamic route rendered', screen);
  if (screen === 'search') return <SearchScreen />;
  if (screen === 'favorites') return <FavoritesScreen />;
  if (screen === 'compare') return <CompareScreen />;
  if (screen === 'finder') return <FinderScreen />;
  if (screen === 'chat') return <ChatScreen />;
  if (screen === 'orders') return <OrdersScreen />;
  if (screen === 'support') return <SupportScreen />;
  if (screen === 'faq') return <FAQScreen />;
  if (screen === 'escalation') return <EscalationScreen />;
  if (screen === 'settings') return <SettingsScreen />;
  if (screen === 'signin' || screen === 'register' || screen === 'forgot' || screen === 'forgot-password') return <AuthScreen mode={screen} />;
  return <Page><EmptyState title="الشاشة غير متاحة" detail="لم يتم العثور على هذه الوجهة." /><Button title="العودة للرئيسية" onPress={() => router.replace('/' as any)} /></Page>;
}
