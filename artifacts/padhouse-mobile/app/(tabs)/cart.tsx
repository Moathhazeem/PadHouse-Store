import React from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { formatShekel, PRODUCTS } from '@/constants/products';
import { Button, EmptyState, Page, PHText, QuantityControl, SectionTitle, Notice } from '@/components/PadHouseUI';
import { useStore } from '@/store/StoreContext';

export default function CartScreen() {
  const colors = useColors();
  const { cart, updateQuantity, removeFromCart } = useStore();
  const lines = cart.map((line) => ({ line, product: PRODUCTS.find((product) => product.id === line.productId) })).filter((item) => item.product);
  const subtotal = lines.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.line.quantity, 0);

  return (
    <Page tabbed>
      <PHText weight="bold" style={{ fontSize: 24 }}>السلة</PHText>
      <PHText color={colors.mutedForeground} style={{ fontSize: 12, marginTop: 2 }}>الأسعار مرجعية؛ سيتم تأكيدها مع المتجر.</PHText>
      {lines.length === 0 ? (
        <View style={{ marginTop: 22 }}>
          <EmptyState title="السلة فارغة" detail="أضف منتجًا من الكتالوج لتظهر تفاصيله هنا." icon="cart-outline" />
          <Button title="تصفح التصنيفات" icon="grid-outline" onPress={() => router.push('/categories' as any)} style={{ marginTop: 10 }} />
        </View>
      ) : (
        <>
          <View style={{ marginTop: 15 }}>
            {lines.map(({ line, product }) => product ? (
              <View key={`${line.productId}-${line.variant ?? ''}-${line.color ?? ''}`} style={{ flexDirection: 'row-reverse', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Pressable onPress={() => router.push(`/product/${product.id}` as any)} accessibilityRole="button" style={{ width: 82, height: 82, borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={{ uri: product.image }} contentFit="contain" style={{ width: '100%', height: '100%' }} />
                </Pressable>
                <View style={{ flex: 1, gap: 4 }}>
                  <PHText weight="bold" numberOfLines={2} style={{ fontSize: 13 }}>{product.name}</PHText>
                  {line.variant ? <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>المقاس: {line.variant}</PHText> : null}
                  {line.color ? <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>اللون: {line.color}</PHText> : null}
                  <PHText weight="bold" style={{ fontSize: 14 }}>{formatShekel(product.price * line.quantity)}</PHText>
                  <QuantityControl value={line.quantity} onChange={(quantity) => updateQuantity(product.id, quantity, line.variant, line.color)} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="إزالة المنتج" onPress={() => removeFromCart(product.id, line.variant, line.color)} style={{ padding: 6, alignSelf: 'flex-start' }}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            ) : null)}
          </View>
          <Notice tone="warning">التوفر والسعر الحالي غير متصلين. لن يتم إرسال الطلب أو تحصيل مبلغ من هذه الشاشة.</Notice>
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <PHText>المجموع الفرعي</PHText><PHText weight="bold">{formatShekel(subtotal)}</PHText>
            </View>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <PHText color={colors.mutedForeground}>التوصيل</PHText><PHText color={colors.mutedForeground}>يُحدد بعد اختيار المنطقة</PHText>
            </View>
            <SectionTitle title="المجموع قبل التوصيل" />
            <PHText weight="bold" style={{ fontSize: 22 }}>{formatShekel(subtotal)}</PHText>
          </View>
          <Button title="متابعة التسوق" icon="arrow-back" kind="secondary" onPress={() => router.push('/categories' as any)} style={{ marginTop: 14 }} />
          <Button title="إتمام تجربة الطلب" icon="receipt-outline" disabled={!lines.length} onPress={() => router.push('/checkout' as any)} style={{ marginTop: 9 }} />
        </>
      )}
    </Page>
  );
}
