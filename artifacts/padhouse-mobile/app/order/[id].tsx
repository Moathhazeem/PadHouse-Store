import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, EmptyState, Notice, Page, PHText, SectionTitle } from '@/components/PadHouseUI';
import { formatShekel, PRODUCTS } from '@/constants/products';
import { useStore } from '@/store/StoreContext';
import { useColors } from '@/hooks/useColors';

export default function OrderDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useStore();
  const order = orders.find((item) => item.id === id);
  if (!order) return <Page><EmptyState title="لم يتم العثور على الطلب المحلي" detail="هذا الرقم غير موجود في سجل هذا الجهاز." /><Button title="طلباتي" onPress={() => router.replace('/orders' as any)} /></Page>;

  return (
    <Page>
      <PHText weight="bold" style={{ fontSize: 23 }}>تم حفظ الطلب التجريبي</PHText>
      <PHText color={colors.mutedForeground} style={{ marginTop: 3 }}>رقم محلي: {order.id}</PHText>
      <Notice tone="warning">هذا الطلب محفوظ على جهازك فقط، ولم يُرسل إلى المتجر. لا توجد حالة شحن أو تأكيد دفع.</Notice>
      <Card>
        <PHText weight="bold" style={{ fontSize: 17 }}>الحالة</PHText>
        <PHText color={colors.warning} weight="semibold" style={{ marginTop: 5 }}>بانتظار ربط المتجر — لا توجد حالة حقيقية</PHText>
        <PHText color={colors.mutedForeground} style={{ marginTop: 5, fontSize: 12 }}>تاريخ الحفظ: {new Date(order.createdAt).toLocaleString('ar-PS')}</PHText>
      </Card>
      <SectionTitle title="المنتجات" />
      {order.items.map((line, index) => {
        const product = PRODUCTS.find((item) => item.id === line.productId);
        if (!product) return null;
        return <View key={`${line.productId}-${index}`} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <PHText weight="semibold">{product.name}</PHText>
            <PHText color={colors.mutedForeground} style={{ fontSize: 11 }}>{line.quantity} × {formatShekel(product.price)}{line.variant ? ` · ${line.variant}` : ''}{line.color ? ` · ${line.color}` : ''}</PHText>
          </View>
          <PHText weight="bold">{formatShekel(product.price * line.quantity)}</PHText>
        </View>;
      })}
      <SectionTitle title="بيانات التوصيل التجريبية" />
      <Card>
        <PHText>{order.customer.name} · {order.customer.phone}</PHText>
        <PHText color={colors.mutedForeground} style={{ marginTop: 4 }}>{order.area} · {order.address}</PHText>
        <PHText color={colors.mutedForeground} style={{ marginTop: 4 }}>الدفع: غير محدد — لا يوجد تكامل دفع</PHText>
      </Card>
      <View style={{ gap: 7, marginTop: 8 }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><PHText>المجموع الفرعي</PHText><PHText>{formatShekel(order.subtotal)}</PHText></View>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><PHText>التوصيل المرجعي</PHText><PHText>{formatShekel(order.deliveryFee)}</PHText></View>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><PHText weight="bold">المجموع</PHText><PHText weight="bold" style={{ fontSize: 18 }}>{formatShekel(order.total)}</PHText></View>
      </View>
      {order.note ? <PHText color={colors.mutedForeground} style={{ marginTop: 9 }}>ملاحظة: {order.note}</PHText> : null}
      <Button title="طلباتي" icon="receipt-outline" onPress={() => router.replace('/orders' as any)} style={{ marginTop: 15 }} />
      <Button title="العودة إلى الرئيسية" kind="secondary" onPress={() => router.replace('/' as any)} style={{ marginTop: 8 }} />
    </Page>
  );
}
