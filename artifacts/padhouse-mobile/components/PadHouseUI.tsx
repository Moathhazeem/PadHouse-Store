import React, { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { formatShekel, type Product } from '@/constants/products';
import { useStore } from '@/store/StoreContext';

type PHTextProps = TextProps & { weight?: 'regular' | 'semibold' | 'bold'; color?: string };
const fontByWeight = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;

export function PHText({ weight = 'regular', color, style, ...props }: PHTextProps) {
  const colors = useColors();
  return (
    <RNText
      {...props}
      style={[
        { color: color ?? colors.foreground, fontFamily: fontByWeight[weight], textAlign: 'right', writingDirection: 'rtl' },
        style,
      ]}
    />
  );
}

export function Page({ children, tabbed = false, scroll = true, contentStyle }: {
  children: ReactNode;
  tabbed?: boolean;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background, direction: 'rtl' }}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { paddingHorizontal: 18, paddingTop: 10, paddingBottom: tabbed ? 112 : 28 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : children}
    </SafeAreaView>
  );
}

export function AppHeader({ title, subtitle, onBack, right }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={onBack ?? (() => router.back())}
        style={[styles.iconButton, { backgroundColor: colors.muted }]}
      >
        <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <PHText weight="bold" style={{ fontSize: 20 }}>{title}</PHText>
        {subtitle ? <PHText color={colors.mutedForeground} style={{ fontSize: 12, marginTop: 1 }}>{subtitle}</PHText> : null}
      </View>
      {right ?? <View style={{ width: 42 }} />}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, style }: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const colors = useColors();
  const backgroundColor = kind === 'primary' ? colors.primary
    : kind === 'danger' ? colors.errorSoft
    : kind === 'secondary' ? colors.secondary
    : 'transparent';
  const foreground = kind === 'danger' ? colors.destructive : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? colors.muted : backgroundColor, opacity: pressed && !disabled ? 0.82 : 1 },
        kind === 'ghost' ? { borderWidth: 1, borderColor: colors.border } : null,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={disabled ? colors.mutedForeground : foreground} /> : null}
      <PHText weight="bold" color={disabled ? colors.mutedForeground : foreground} style={{ fontSize: 14 }}>{title}</PHText>
    </Pressable>
  );
}

export function TextField({ label, style, multiline, ...props }: TextInputProps & { label?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <PHText weight="semibold" style={{ fontSize: 13 }}>{label}</PHText> : null}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.mutedForeground}
        textAlign="right"
        style={[
          styles.input,
          { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input, fontFamily: 'Cairo_400Regular' },
          multiline ? { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 } : null,
          style,
        ]}
      />
    </View>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' | 'error' }) {
  const colors = useColors();
  const accent = tone === 'warning' ? colors.warning : tone === 'success' ? colors.success : tone === 'error' ? colors.destructive : colors.primary;
  const background = tone === 'warning' ? colors.warningSoft : tone === 'success' ? colors.successSoft : tone === 'error' ? colors.errorSoft : colors.primarySoft;
  const icon: keyof typeof Ionicons.glyphMap = tone === 'warning' ? 'alert-circle-outline'
    : tone === 'success' ? 'checkmark-circle-outline'
    : tone === 'error' ? 'close-circle-outline' : 'information-circle-outline';
  return (
    <View style={[styles.notice, { backgroundColor: background, borderColor: colors.border }]}>
      <Ionicons name={icon} size={19} color={accent} />
      <PHText style={{ flex: 1, fontSize: 12, lineHeight: 20 }}>{children}</PHText>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitle}>
      <PHText weight="bold" style={{ fontSize: 18 }}>{title}</PHText>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <PHText weight="semibold" color={colors.primary} style={{ fontSize: 13 }}>{action}</PHText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ title, selected, onPress }: { title: string; selected?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.background, borderColor: selected ? colors.primary : colors.border }]}
    >
      <PHText weight={selected ? 'bold' : 'regular'} color={selected ? colors.foreground : colors.mutedForeground} style={{ fontSize: 12 }}>{title}</PHText>
    </Pressable>
  );
}

export function EmptyState({ title, detail, icon = 'file-tray-outline' }: { title: string; detail: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={25} color={colors.primary} />
      </View>
      <PHText weight="bold" style={{ fontSize: 16, marginTop: 12 }}>{title}</PHText>
      <PHText color={colors.mutedForeground} style={{ fontSize: 13, lineHeight: 21, marginTop: 5 }}>{detail}</PHText>
    </View>
  );
}

export function QuantityControl({ value, onChange }: { value: number; onChange: (quantity: number) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.quantity, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="تقليل الكمية" onPress={() => onChange(value - 1)} style={styles.quantityButton}>
        <Ionicons name="remove" size={17} color={colors.foreground} />
      </Pressable>
      <PHText weight="bold" style={{ minWidth: 24, textAlign: 'center' }}>{value}</PHText>
      <Pressable accessibilityRole="button" accessibilityLabel="زيادة الكمية" onPress={() => onChange(value + 1)} style={styles.quantityButton}>
        <Ionicons name="add" size={17} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

export function ProductCard({ product, showCompare = false }: { product: Product; showCompare?: boolean }) {
  const colors = useColors();
  const { favorites, toggleFavorite, addToCart, toggleCompare, compareIds } = useStore();
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [added, setAdded] = useState(false);
  const routerPush = () => router.push(`/product/${product.id}` as any);
  const quickAdd = () => {
    if (product.variants?.length || product.colors?.length) {
      routerPush();
      return;
    }
    if (addToCart(product.id)) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };
  return (
    <View style={[styles.productCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={[styles.productImage, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" onPress={routerPush} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          {!imageFailed ? (
            <Image source={{ uri: product.image }} contentFit="contain" transition={160} onLoad={() => setImageLoaded(true)} onError={() => setImageFailed(true)} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name="tablet-portrait-outline" size={38} color={colors.primary} />
          )}
        </Pressable>
        {!imageLoaded && !imageFailed ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Ionicons name="tablet-portrait-outline" size={34} color={colors.primary} />
            <PHText color={colors.mutedForeground} style={{ fontSize: 10 }}>صورة المنتج المنشورة</PHText>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorites.includes(product.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          onPress={() => toggleFavorite(product.id)}
          style={[styles.favorite, { backgroundColor: colors.background }]}
        >
          <Ionicons name={favorites.includes(product.id) ? 'heart' : 'heart-outline'} size={19} color={favorites.includes(product.id) ? colors.destructive : colors.foreground} />
        </Pressable>
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <PHText weight="semibold" numberOfLines={2} style={{ minHeight: 40, fontSize: 13, lineHeight: 19 }}>{product.name}</PHText>
        <PHText weight="bold" style={{ fontSize: 15 }}>{formatShekel(product.price)}</PHText>
        <PHText color={colors.mutedForeground} style={{ fontSize: 10 }}>سعر مرجعي؛ المخزون غير متصل</PHText>
        <Button title={added ? 'تمت الإضافة' : product.variants?.length || product.colors?.length ? 'اختر الخيارات' : 'أضف إلى السلة'} onPress={quickAdd} icon={added ? 'checkmark' : 'cart-outline'} style={{ paddingVertical: 9, marginTop: 2 }} />
        {showCompare ? (
          <Button
            title={compareIds.includes(product.id) ? 'إزالة من المقارنة' : 'أضف للمقارنة'}
            kind="ghost"
            onPress={() => toggleCompare(product.id)}
            style={{ paddingVertical: 8 }}
          />
        ) : null}
      </View>
    </View>
  );
}

export function ProductGrid({ products, showCompare = false }: { products: Product[]; showCompare?: boolean }) {
  return (
    <View style={styles.grid}>
      {products.map((product) => <ProductCard key={product.id} product={product} showCompare={showCompare} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconButton: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 12 },
  button: { minHeight: 42, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, fontSize: 14, writingDirection: 'rtl' },
  notice: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 9, borderWidth: 1, borderRadius: 15, padding: 12, marginVertical: 7 },
  sectionTitle: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 11 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  empty: { minHeight: 185, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 22, marginVertical: 8 },
  emptyIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quantity: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 4, height: 38 },
  quantityButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  productCard: { width: '48.5%', borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  productImage: { height: 145, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  favorite: { position: 'absolute', top: 9, right: 9, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 2 },
});
