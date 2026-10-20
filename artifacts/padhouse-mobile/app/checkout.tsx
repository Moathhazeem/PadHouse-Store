import React, { useMemo, useState } from 'react';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, Notice, Page, PHText, SectionTitle, TextField } from '@/components/PadHouseUI';
import { useColors } from '@/hooks/useColors';
import { DELIVERY_FEES, formatShekel, PRODUCTS } from '@/constants/products';
import { useStore } from '@/store/StoreContext';

export default function CheckoutScreen() {
  const colors = useColors();
  const { cart, profile, updateProfile, createDemoOrder } = useStore();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [area, setArea] = useState(profile.area || 'الضفة الغربية');
  const [address, setAddress] = useState(profile.address);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const subtotal = useMemo(() => cart.reduce((sum, line) => {
    const product = PRODUCTS.find((item) => item.id === line.productId);
    return sum + (product?.price ?? 0) * line.quantity;
  }, 0), [cart]);
  const fee = DELIVERY_FEES[area] ?? 0;
  const pickup = area === 'استلام من نابلس';

  const submit = () => {
    if (!cart.length) { setError('السلة فارغة. أضف منتجًا قبل المتابعة.'); return; }
    if (name.trim().length < 2) { setError('اكتب الاسم الكامل.'); return; }
    if (phone.replace(/\D/g, '').length < 8) { setError('تحقق من رقم الهاتف.'); return; }
    if (!pickup && address.trim().length < 4) { setError('أضف عنوان التوصيل بالتفصيل.'); return; }
    updateProfile({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), area });
    const order = createDemoOrder({
      customer: { name: name.trim(), phone: phone.trim(), email: email.trim() },
      area,
      address: pickup ? 'استلام من نابلس' : address.trim(),
      note: note.trim(),
      deliveryFee: fee,
    });
    if (!order) { setError('تعذر إنشاء سجل الطلب المحلي. حاول تحديث السلة.'); return; }
    router.replace(`/order/${order.id}` as any);
  };

  return (
    <Page scroll={false}>
      <KeyboardAwareScrollViewCompat style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" bottomOffset={24}>
        <PHText weight="bold" style={{ fontSize: 23 }}>إتمام تجربة الطلب</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 12, marginTop: 2 }}>المعلومات لا تُرسل إلى المتجر؛ هذا سجل محلي تجريبي.</PHText>
        <Notice tone="warning">لا يوجد تكامل للطلبات أو الدفع. لن يُرسل طلب حقيقي ولن يتم تحصيل مبلغ.</Notice>

        <SectionTitle title="معلومات التواصل" />
        <View style={{ gap: 11 }}>
          <TextField label="الاسم الكامل" value={name} onChangeText={setName} placeholder="اكتب اسمك" />
          <TextField label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="رقم للتواصل" keyboardType="phone-pad" />
          <TextField label="البريد الإلكتروني (اختياري)" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
        </View>

        <SectionTitle title="منطقة التوصيل" />
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
          {Object.keys(DELIVERY_FEES).map((destination) => <Chip key={destination} title={destination} selected={area === destination} onPress={() => setArea(destination)} />)}
        </View>
        <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 7 }}>الرسوم مأخوذة من معلومات منشورة وقد تتغير؛ يلزم تأكيدها من المتجر.</PHText>
        {!pickup ? <View style={{ marginTop: 12, gap: 11 }}>
          <TextField label="العنوان بالتفصيل" value={address} onChangeText={setAddress} placeholder="المدينة، الحي، الشارع، وأقرب نقطة" />
          <TextField label="ملاحظات التوصيل (اختياري)" value={note} onChangeText={setNote} placeholder="أي تعليمات إضافية" multiline />
        </View> : <Notice>الاستلام من نابلس برسوم منشورة قدرها 0₪؛ تفاصيل نقطة الاستلام غير متصلة.</Notice>}

        <SectionTitle title="طريقة الدفع" />
        <Notice tone="warning">طرق الدفع غير معروفة أو متصلة. لا تخترع وسيلة دفع؛ لن يتم تحصيل أي مبلغ في هذه التجربة.</Notice>

        <SectionTitle title="مراجعة المجموع" />
        <View style={{ gap: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><PHText>المجموع الفرعي</PHText><PHText weight="bold">{formatShekel(subtotal)}</PHText></View>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><PHText>رسوم التوصيل المنشورة</PHText><PHText weight="semibold">{formatShekel(fee)}</PHText></View>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border }}><PHText weight="bold">المجموع المرجعي</PHText><PHText weight="bold" style={{ fontSize: 18 }}>{formatShekel(subtotal + fee)}</PHText></View>
        </View>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button title="حفظ طلب تجريبي على الجهاز" icon="save-outline" onPress={submit} />
        <Button title="العودة إلى السلة" kind="ghost" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </KeyboardAwareScrollViewCompat>
    </Page>
  );
}
