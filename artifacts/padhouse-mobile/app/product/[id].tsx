import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { CATEGORIES, formatShekel, PRODUCTS } from '@/constants/products';
import { Button, Chip, EmptyState, Notice, Page, PHText, ProductGrid, QuantityControl, SectionTitle } from '@/components/PadHouseUI';
import { useStore } from '@/store/StoreContext';

export default function ProductDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = PRODUCTS.find((item) => item.id === id);
  const { favorites, toggleFavorite, addToCart, toggleCompare } = useStore();
  const [variant, setVariant] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  if (!product) {
    return <Page><EmptyState title="المنتج غير موجود" detail="قد يكون الرابط غير صالح أو لم يعد المنتج ضمن الكتالوج المحلي." /><Button title="العودة للتصنيفات" onPress={() => router.replace('/categories' as any)} /></Page>;
  }

  const add = () => {
    if (product.variants?.length && !variant) { setError('اختر المقاس المنشور المطابق لجهازك.'); return; }
    if (product.colors?.length && !color) { setError('اختر اللون المتاح في بيانات المنتج.'); return; }
    if (addToCart(product.id, variant || undefined, color || undefined, quantity)) {
      setError('');
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };
  const related = PRODUCTS.filter((item) => item.id !== product.id && (item.category === product.category || item.category !== product.category)).slice(0, 2);

  return (
    <Page>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Ionicons name="arrow-forward" size={19} color={colors.foreground} /><PHText weight="semibold">رجوع</PHText>
        </Pressable>
        <Pressable onPress={() => toggleFavorite(product.id)} accessibilityRole="button" accessibilityLabel="تبديل المفضلة" style={{ padding: 7 }}>
          <Ionicons name={favorites.includes(product.id) ? 'heart' : 'heart-outline'} size={22} color={favorites.includes(product.id) ? colors.destructive : colors.foreground} />
        </Pressable>
      </View>

      <View style={{ height: 285, backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Image source={{ uri: product.image }} contentFit="contain" transition={200} style={{ width: '100%', height: '100%' }} />
      </View>
      <PHText color={colors.mutedForeground} style={{ fontSize: 11, marginTop: 7 }}>صورة المنتج المنشورة؛ لا تتوفر صور إضافية متصلة.</PHText>
      <View style={{ marginTop: 14, gap: 5 }}>
        <PHText color={colors.primary} weight="semibold" style={{ fontSize: 12 }}>{product.category}</PHText>
        <PHText weight="bold" style={{ fontSize: 22, lineHeight: 31 }}>{product.name}</PHText>
        <PHText weight="bold" style={{ fontSize: 21, marginTop: 3 }}>{formatShekel(product.price)}</PHText>
      </View>
      <Notice tone="warning">سعر مرجعي منشور فقط. السعر الحالي والمخزون غير متصلين بالتطبيق.</Notice>
      {product.variants?.length ? (
        <View style={{ marginTop: 10 }}>
          <SectionTitle title="اختر المقاس" />
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
            {product.variants.map((item) => <Chip key={item} title={item} selected={variant === item} onPress={() => { setVariant(item); setError(''); }} />)}
          </View>
        </View>
      ) : null}
      {product.colors?.length ? (
        <View style={{ marginTop: 5 }}>
          <SectionTitle title="اللون المنشور" />
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            {product.colors.map((item) => <Chip key={item} title={item} selected={color === item} onPress={() => { setColor(item); setError(''); }} />)}
          </View>
        </View>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <QuantityControl value={quantity} onChange={(value) => setQuantity(Math.max(1, value))} />
        <View style={{ flex: 1 }}><Button title={added ? 'تمت الإضافة' : 'أضف إلى السلة'} icon={added ? 'checkmark' : 'cart-outline'} onPress={add} /></View>
      </View>
      <Button title="قارن هذا المنتج" icon="git-compare-outline" kind="secondary" onPress={() => { if (!toggleCompare(product.id)) setError('يمكن مقارنة أربعة منتجات كحد أقصى.'); else router.push('/compare' as any); }} style={{ marginTop: 9 }} />
      <Button title="اسأل عن التوافق" icon="chatbubble-ellipses-outline" kind="ghost" onPress={() => router.push('/chat' as any)} style={{ marginTop: 9 }} />

      <SectionTitle title="وصف المنتج" />
      <PHText style={{ lineHeight: 23 }}>{product.description}</PHText>
      <SectionTitle title="المواصفات المنشورة" />
      {product.specs.map((item) => <PHText key={item} color={colors.mutedForeground} style={{ lineHeight: 22, marginBottom: 4 }}>• {item}</PHText>)}
      <SectionTitle title="التوافق" />
      <Notice>{product.compatibility}</Notice>
      <PHText weight="semibold" style={{ marginTop: 9 }}>الكفالة</PHText>
      <PHText color={colors.mutedForeground} style={{ marginTop: 3, lineHeight: 22 }}>{product.warranty}</PHText>
      <PHText weight="semibold" style={{ marginTop: 12 }}>التوصيل</PHText>
      <PHText color={colors.mutedForeground} style={{ marginTop: 3, lineHeight: 22 }}>رسوم التوصيل المنشورة تختلف حسب المنطقة، وتحتاج إلى تأكيد من المتجر. موعد التسليم غير متصل.</PHText>

      <SectionTitle title="منتجات أخرى من الكتالوج" />
      <ProductGrid products={related} />
    </Page>
  );
}
