# PadHouse — Phase 4: Flutter Mobile Application Redesign

## 1. Scope

This phase improves the **existing** PadHouse Flutter application
(`padhouse_mobile/`). No new application was created, no screen was rewritten
from scratch, and the shared backend/data source was not changed.

Guiding constraints honored:

- **Preserve existing implementation** — existing architecture, API services,
  authentication, and backend integration were reused and only extended.
- **Arabic-only, RTL throughout** — no English UI was added and no language
  switcher exists.
- **Light visual identity** — White `#FFFFFF`, Turquoise `#2EC4B6`, Navy
  `#0F172A`, Light Gray `#F8FAFC`.
- **Same backend as the Website** — the mobile app keeps consuming the same
  NestJS API (`/api/v1`) and the same product/customer/cart/order/inventory
  fields; no second data source was introduced.
- **No Website changes** — the shared API contract required no coordinated
  change, so `src/` was left untouched.

---

## 2. Pre-existing State (preserved)

The application already had a functioning structure that was kept as-is:

| Layer | Location |
| --- | --- |
| App entry / theming | `lib/main.dart` — `MaterialApp.router`, `ThemeMode.light`, `Locale('ar','PS')` |
| Theme tokens | `lib/core/theme/app_colors.dart`, `app_theme.dart`, `app_typography.dart` |
| Routing | `lib/core/router/app_router.dart` — `GoRouter` with 46 declared routes |
| Networking | `lib/core/network/api_client.dart` — `dio`, JWT refresh interceptor, `baseUrl` `http://127.0.0.1:4000/api/v1` |
| State | `lib/state/padhouse_controller.dart` — `ChangeNotifier` exposed via `padhouseProvider` |
| Models / catalog | `lib/data/catalog.dart` — `Product.fromJson` maps the same fields as the website `src/services/api.ts` |
| Auth UI | `lib/ui/auth_screen.dart` |

---

## 3. Modified Files

### 3.1 `lib/state/padhouse_controller.dart`

Central `ChangeNotifier` controller. Changes:

- Added `import 'dart:async';`.
- Extended `enum CustomerTab` to `{ home, categories, search, ai, wishlist, cart, profile }` (added `search` and `cart`).
- Extended `enum CustomerStack` to `{ productDetails, checkout, orderConfirmation, tracking, orders, wishlist, support, notifications, addresses, settings }` (added `wishlist`).
- In `bootstrap()`, made the non-blocking sync explicit: `unawaited(syncWithBackend());` (satisfies `unawaited_futures`).

These enum additions were required because existing call sites in
`app_router.dart`, `store_screen.dart`, and `stack_and_admin.dart` already
referenced `CustomerTab.search`, `CustomerTab.cart`, and
`CustomerStack.wishlist` — the app previously did not compile.

### 3.2 `lib/ui/widgets.dart`

Shared widget library. Changes:

- Added `import '../state/padhouse_controller.dart';`.
- Added public **`ProductCard`** (`ProductCard({required store, required product})`):
  - `NetImage` product image, out-of-stock overlay `نفدت الكمية`, discount badge `خصم`.
  - Wishlist heart toggle (`store.toggleWishlist`).
  - Name (2 lines, ellipsis), rating + review count, price with strikethrough original.
  - Teal add-to-cart `+` button (disabled when out of stock); tap opens `store.openProduct(product)`.
- Added public **`EmptyState`** (`EmptyState({required icon, required title, required subtitle, ctaLabel, onCta})`):
  - Circular turquoise icon, Arabic title/subtitle, optional CTA `FilledButton`.

Both were previously missing while being referenced from the store screen,
which was the source of several analyzer errors.

### 3.3 `lib/ui/store_screen.dart`

Main customer UI. Changes:

- Removed an unnecessary `import 'dart:ui';`.
- `CustomerTabBody` switch now renders the two new tabs:
  - `CustomerTab.search` → `_SearchTab`
  - `CustomerTab.cart` → `_CartTab`
- Header navigation fixed: `nav-cart` now opens `CustomerTab.cart`; `nav-search` now opens `CustomerTab.search`.
- Home search bar (`home-search`) now opens the Search tab; placeholder `ابحث عن منتجات بادهاوس...`.
- Home section header label reconciled to the widget test: `قائمة المنتجات (n)` (key `product-count`).
- **New `_SearchTab` / `_SearchTabState`** — Arabic search field (key `search-field`) matching name / SKU / compatibility, an `EmptyState` for the empty-query and no-results cases (with a `تصفح الأقسام` CTA), header `نتائج البحث (n)`, and a 2-column `ProductCard` grid.
- **New `_CartTab`** — cart line list (`NetImage`, `_QtyStepper`, `trash2` delete) plus a sticky summary: المجموع الفرعي / التوصيل / الخصم / الإجمالي, and `PrimaryButton('متابعة إلى الدفع')` → `setStack(CustomerStack.checkout)`. Renders `EmptyState` when the cart is empty.
- **New `_QtyStepper`** — plus/minus quantity stepper wired to `store.updateCartQty`.
- Fixed a `const Text(_welcomeMessage, ...)` compile error.

### 3.4 `lib/ui/stack_and_admin.dart`

Customer stack + admin screens. Changes (mostly compile fixes onto the shared symbols):

- `widget.store.setCustomerStack(CustomerStack.checkout)` → `widget.store.setStack(...)`.
- `store.cartTotal` → `store.subtotal`.
- `'${order.city} - ${order.street}'` → `order.address`.
- `order.payment` → `order.paymentMethod`.
- `LucideIcons.instagram` (not in `lucide_icons_flutter ^4.0.3`) → `LucideIcons.globe`.
- Lint cleanup: `_EmptyState`, the three `_SupportCard`s, and the `_SettingsTile`s made `const`; inner `const Color(...)` removed where now redundant.
- `CustomerStackBody` switch now includes `case CustomerStack.wishlist: return _Wishlist(store: store);`.

### 3.5 `test/widget_test.dart`

Added a 5th widget test: **"Guest can open the Cart tab and run a Product Search"**

- Continues as guest, taps `nav-cart` and asserts `سلة التسوق` / `متابعة إلى الدفع`.
- Taps `nav-search`, asserts `search-field` and `ابحث في متجر بادهاوس`.
- Enters `قلم` in the search field and asserts `نتائج البحث`.

The four pre-existing tests were left unchanged.

---

## 4. Screens Coverage (spec §4)

| Screen | Status |
| --- | --- |
| Splash / Onboarding | Present via router (`/splash`, `/onboarding`) |
| Home | `_HomeTab` (improved header/search/label) |
| Categories | `_CategoriesTab` |
| Search / Search Results | **Implemented** this phase (`_SearchTab`) |
| Product Listing | Category/search grids via `ProductCard` |
| Product Details | `ProductDetails` (image gallery via `PageView`) |
| Cart | **Implemented** this phase (`_CartTab` + `_QtyStepper`) |
| Checkout | `CheckoutView` |
| Wishlist | `_WishlistTab` / `CustomerStack.wishlist` |
| Login / Registration | `AuthScreen` |
| Customer Profile | `_ProfileTab` |
| Addresses | `_Addresses` |
| Order History | `_Orders` (tap opens tracking) |
| Order Details / Order Tracking | `_Tracking` |
| Notifications | `_Notifications` |
| AI Shopping Assistant | `_AiTab` |
| Customer Support | `_Support` |
| Settings | `_Settings` |

---

## 5. Navigation (spec §5)

- Bottom navigation preserved with the required Arabic destinations:
  الرئيسية، التصنيفات، المساعد الذكي، المفضلة، حسابي.
- The shopping cart remains one tap away via the header `nav-cart` action and
  the dedicated `CustomerTab.cart` tab.
- Navigation continues to use the existing controller-driven
  stack + tab model (`customerStack` / `customerTab`) with `go_router` used for
  route entry through `RouteStoreScreen`.

---

## 6. Backend Integration (spec §8)

- No new API base or mock data source was added.
- `syncWithBackend()` continues to `GET /products` from the same
  `ApiClient` (`baseUrl` `/api/v1`) used by the website.
- `Product.fromJson` maps the same fields consumed by the website
  `src/services/api.ts`; product, customer, cart, order, and inventory data
  remain the single shared backend source.

---

## 7. Verification

Commands run inside `padhouse_mobile/`:

```text
flutter analyze --no-pub   →  No issues found!
flutter test               →  All tests passed! (5 tests)
```

Main user journeys exercised:

1. App opens into the Arabic Auth screen (admin quick-fill + guest option).
2. Admin credential autofill.
3. Continue as Guest → store renders products and 6 categories.
4. Admin flow: login → Profile → enter Admin OS → back to Store.
5. Guest → Cart tab → Search tab → live product search.

---

## 8. Follow-ups

- Waiting for approval before starting **Phase 5**.
- No Website files were modified in this phase.
