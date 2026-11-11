# PadHouse Platform — Stage 1: System Architecture & Project Foundation

## 1. System Architecture Overview

PadHouse is a Palestinian e-commerce enterprise specialized in premium iPad accessories (smart magnetic keyboards, tempered screen protectors, stylus pens, magnetic paper-feel foils, protective cases, and USB-C multifunctional hubs).

The platform architecture is designed to fulfill two critical objectives:
1. **Flawless Customer Mobile Experience**: High-speed, bilingual (Arabic RTL / English LTR), offline-resilient shopping, cart, checkout, Palestinian payment workflows (Cash on Delivery, PalPay / Mahfazati, Bank Transfer), and real-time order tracking.
2. **Comprehensive Administrator Operating System**: Complete mobile and tablet administrative interface for inventory tracking, competitor pricing & promotion intelligence, social media analytics & scheduled publishing calendar, and Gemini-powered business insights.

```
+-----------------------------------------------------------------------------------+
|                            PADHOUSE ECOSYSTEM LAYER                               |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-------------------------------------+   +------------------------------------+ |
|  |     Customer Mobile Experience      |   |   Administrator Management App     | |
|  |  (Flutter M3, Riverpod, GoRouter)   |   |  (Role-Guarded Admin Routes)       | |
|  +------------------+------------------+   +-----------------+------------------+ |
|                     |                                        |                    |
|                     +--------------------+-------------------+                    |
|                                          |                                        |
|                          HTTPS / JSON REST API (v1)                               |
|                          Bearer JWT + Refresh Rotation                            |
|                                          v                                        |
|  +------------------------------------------------------------------------------+ |
|  |                    PADHOUSE NESTJS BACKEND API GATEWAY                       | |
|  |                                                                              | |
|  |  - AuthModule (RBAC, JWT, Refresh Token Rotation, Audit Log)                 | |
|  |  - ProductsModule & InventoryModule (ACID Transaction Stock Management)      | |
|  |  - OrdersModule (Multi-status order lifecycle, PalPay/COD)                  | |
|  |  - CompetitorsModule (Competitor price watch, promotions, variance analysis) | |
|  |  - SocialModule (Instagram/Facebook Insights API integration)                | |
|  |  - ContentPlannerModule (Multi-platform calendar & workflow engine)          | |
|  |  - AiAssistantModule (Gemini 2.5/Flash Secure Business Intelligence)         | |
|  |  - WebhooksModule (HMAC-SHA256 authenticated n8n triggers & ingress)         | |
|  +-------------------+--------------------+-------------------+-----------------+ |
|                      |                    |                   |                   |
|                      v                    v                   v                   v
|         +----------------------+ +-----------------+ +---------------+ +---------+
|         | PostgreSQL Database  | | Gemini API      | | n8n Webhook   | | Supabase|
|         | (Prisma 6.x ORM)     | | (Business Intel | | Automation    | | Storage |
|         | - 18 Normalized Rel  | | & Copywriting)  | | Workflows     | | CDN     |
|         +----------------------+ +-----------------+ +---------------+ +---------+
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Proposed Flutter Mobile Folder Structure

Following Clean Architecture with a **feature-first** organization:

```text
padhouse_mobile/
├── pubspec.yaml
├── analysis_options.yaml
├── assets/
│   ├── images/
│   ├── icons/
│   ├── fonts/
│   └── mock_data/
├── lib/
│   ├── main.dart                          # App bootstrap, ProviderScope, initialization
│   ├── core/                              # Cross-cutting foundational modules
│   │   ├── constants/
│   │   │   ├── app_constants.dart
│   │   │   └── api_endpoints.dart
│   │   ├── errors/
│   │   │   ├── exceptions.dart
│   │   │   └── failures.dart
│   │   ├── network/
│   │   │   ├── api_client.dart            # Dio client, baseUrl, timeouts
│   │   │   └── auth_interceptor.dart      # JWT token injection & refresh rotation
│   │   ├── router/
│   │   │   ├── app_router.dart            # GoRouter with role redirection & sub-routes
│   │   │   └── route_names.dart
│   │   ├── storage/
│   │   │   └── secure_storage_service.dart # Keystore/Keyring encrypted tokens
│   │   ├── theme/
│   │   │   ├── app_colors.dart            # Turquoise, Navy, Off-White palette
│   │   │   ├── app_typography.dart        # English (Inter/Poppins) & Arabic (Tajawal)
│   │   │   ├── app_spacing.dart           # 4px 8pt grid system
│   │   │   ├── app_radius.dart            # Uniform curvature specs
│   │   │   ├── app_shadows.dart           # Soft modern elevation
│   │   │   └── app_theme.dart             # Material 3 Light & Dark ThemeData
│   │   ├── utils/
│   │   │   ├── currency_formatter.dart    # ILS (Shekels) & USD formatting
│   │   │   └── date_formatter.dart
│   │   └── widgets/                       # Reusable Design System components
│   │       ├── buttons/
│   │       │   ├── primary_button.dart
│   │       │   └── outline_button.dart
│   │       ├── cards/
│   │       │   ├── product_card.dart
│   │       │   └── metric_card.dart
│   │       ├── feedback/
│   │       │   ├── app_snackbar.dart
│   │       │   ├── empty_state_view.dart
│   │       │   └── loading_indicator.dart
│   │       ├── inputs/
│   │       │   ├── app_text_field.dart
│   │       │   └── search_bar_field.dart
│   │       └── navigation/
│   │           ├── customer_bottom_nav.dart
│   │           └── admin_nav_drawer.dart
│   └── features/                          # Feature-First Modules
│       ├── auth/
│       │   ├── data/
│       │   ├── domain/
│       │   └── presentation/              # Login, Register, Forgot Password
│       ├── customer_home/                 # Banners, Flash Deals, Categories, Featured
│       ├── customer_catalog/              # Search, Filtering, Categories, iPad Compatibility
│       ├── customer_product/              # Detail, Image Carousel, Variants, Stock, Reviews
│       ├── customer_cart/                 # Cart list, Quantity mutation, Coupon code
│       ├── customer_checkout/             # Address, Shipping, COD / PalPay / Bank Transfer
│       ├── customer_orders/               # Tracking timeline, History, Reorder
│       ├── customer_profile/              # Addresses, Notifications, Language Switcher
│       ├── admin_dashboard/               # Executive KPIs, Revenue chart, Quick actions
│       ├── admin_inventory/               # Stock levels, Low-stock alerts, Stock movements
│       ├── admin_orders/                  # Order status flow, fulfillment, notes
│       ├── competitor_intelligence/       # Competitors list, price tracker, variance charts
│       ├── social_intelligence/           # IG/FB metrics, reach, engagement, benchmark
│       ├── social_planner/                # Calendar view, Drafts, Scheduled, AI Caption
│       └── ai_business_assistant/         # Conversational business analysis & insights
└── test/
    ├── unit/
    ├── widget/
    └── integration/
```

---

## 3. Proposed NestJS Backend Folder Structure

```text
padhouse_backend/
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── .env.example
├── prisma/
│   ├── schema.prisma                      # Full 18-model normalized schema
│   └── migrations/                        # Versioned SQL migrations
├── src/
│   ├── main.ts                            # Bootstrap, Swagger, ValidationPipe, CORS
│   ├── app.module.ts                      # Root aggregation module
│   ├── common/
│   │   ├── decorators/                    # @CurrentUser(), @Roles()
│   │   ├── filters/                       # HttpExceptionFilter
│   │   ├── guards/                        # JwtAuthGuard, RolesGuard
│   │   ├── interceptors/                  # TransformResponseInterceptor, Logging
│   │   └── interfaces/                    # ApiResponse<T>, PaginatedResponse<T>
│   ├── config/
│   │   └── configuration.ts               # Typed config validation (Joi/Zod)
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts              # Lifecycle connection & transactions
│   └── modules/
│       ├── auth/                          # JWT, Refresh tokens, Password bcrypt
│       ├── users/                         # User & Customer entities
│       ├── products/                      # Products, Categories, Variants, iPad models
│       ├── inventory/                     # Stock movements, alerts, audit log
│       ├── orders/                        # Cart, Checkout, Order state machine
│       ├── payments/                      # COD, PalPay gateway adapter interface
│       ├── competitors/                   # Competitor profiles, Price tracking, Promotions
│       ├── social/                        # Meta Graph API adapter, Account analytics
│       ├── content-calendar/              # Social media post workflow
│       ├── ai-assistant/                  # Gemini integration & safe DB analytics query
│       ├── webhooks/                      # Inbound/Outbound n8n automation webhooks
│       └── notifications/                 # FCM push & transactional emails
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

---

## 4. Communication Architecture: Flutter, Backend, Database, n8n, and Gemini

### Flow 1: Client to Backend (REST + JWT Rotation)
1. **Flutter app** makes requests via `Dio` to `https://api.padhouse.ps/api/v1/...`.
2. `AuthInterceptor` injects the short-lived `Authorization: Bearer <AccessToken>` (15m expiry).
3. If a 401 is received, `AuthInterceptor` queues pending requests, issues a call to `/auth/refresh` using the secure `RefreshToken` (7d expiry, stored in Keystore/Keychain), rotates both tokens, and re-executes the failed call.

### Flow 2: ACID Transactions & Inventory Integrity
1. When a customer confirms an order at `/orders/checkout`, NestJS starts an **interactive Prisma transaction** (`prisma.$transaction`).
2. Each item's current stock in `Inventory` is locked with row verification:
   - If `stock < requestedQuantity`, the transaction aborts with `InsufficientStockException`.
   - If stock is adequate, `stock` is decremented and an `InventoryMovement` entry is logged (`TYPE: ORDER_FULFILLMENT`).
   - The `Order` and `OrderItems` records are created.

### Flow 3: n8n Workflow Automation
1. **Outbound Event Dispatch**: Upon order creation or when inventory drops below `minThreshold`, NestJS dispatches a signed webhook payload (`X-PadHouse-Signature: HMAC-SHA256(payload, secret)`) to n8n.
2. **n8n Orchestration**:
   - Sends Telegram/WhatsApp/Slack notification to warehouse staff in Ramallah/Nablus.
   - Pushes an FCM notification payload back to the customer's phone.
   - Runs scheduled cron jobs for competitor price verification and daily sales summaries.
3. **Inbound Webhook Verification**: When n8n triggers actions (e.g. updating a scheduled post status or syncing competitor manual review), NestJS `WebhooksGuard` validates the HMAC header before permitting writes.

### Flow 4: Gemini AI Business Intelligence Integration
1. The admin asks a natural language business query in the app: *"Which iPad 10th Gen cases have lower margins than competitors?"*
2. Request passes to NestJS `AiAssistantService`.
3. The backend does **not** expose raw PII or raw customer records. Instead, it queries aggregated read-only views (sales volume, competitor price records, inventory count).
4. Prompt is synthesized with verified business facts and sent server-side to the Gemini API (`gemini-2.5-flash`).
5. Structured JSON responses are returned to Flutter with actionable recommendations, citation of known data, and flags for any missing external data.

---

## 5. Main Application Modules

| Module | Primary Role | Key Features |
|---|---|---|
| **M1: Customer Experience** | Shopper | Bilingual catalog, iPad model filter (Pro, Air, Mini, Standard), Cart, PalPay/COD Checkout, Order Tracking |
| **M2: Business Operations** | Admin | Executive KPI dashboard, Sales trend graphs, Revenue & Average Order Value metrics |
| **M3: Inventory Control** | Admin / Staff | Stock counts, batch updates, low-stock warnings, inventory valuation, audit logs |
| **M4: Order Lifecycle** | Admin / Staff | 6-stage order state machine (Pending -> Confirmed -> Preparing -> Shipped -> Delivered -> Cancelled) |
| **M5: Competitor Market Intel**| Admin | Competitor registry, product price tracking, percentage variances, active competitor promotions |
| **M6: Social Media Analytics** | Admin / Marketing | Follower count, engagement rate, top performing posts, competitor public metric comparison |
| **M7: Content Calendar & Planner**| Marketing | Multi-view calendar (month/week/list), stage pipeline (Idea -> Draft -> Approved -> Scheduled -> Published) |
| **M8: Gemini AI Copilot** | Admin / Marketing | Conversational analytics, Restock advisory, Competitor price analysis, Arabic/English caption writer |
| **M9: n8n Automation Engine** | System | Asynchronous webhooks, notification routing, cron digests, external sync pipelines |

---

## 6. Implementation Roadmap (11 Stages)

- **Stage 1 (Current)**: Architecture & Project Foundation (Clean Architecture, design tokens, folder structure, configuration files).
- **Stage 2**: Database Design & Backend Foundation (Prisma schema, migrations, seed data, NestJS base modules).
- **Stage 3**: Flutter Design System & Navigation (Brand theme, Typography, Components, GoRouter routes, Customer/Admin shell).
- **Stage 4**: Customer Authentication & Shopping Experience (Auth flow, Catalog, Categories, Search, iPad filters, Product detail).
- **Stage 5**: Cart, Checkout, Payments, & Orders (Cart state, Coupon engine, PalPay/COD payment methods, Order tracking timeline).
- **Stage 6**: Admin Dashboard & Inventory (Executive metrics, Stock management, Restock alerts, Order status processing).
- **Stage 7**: Competitor Intelligence (Competitor management, Price scraper/manual data entry, Variance analysis).
- **Stage 8**: Social Media Analytics (Meta Graph API data sync, Engagement charts, Competitor social benchmarking).
- **Stage 9**: Social Media Planner (Visual calendar, post approval workflow, Gemini AI copywriting assistant).
- **Stage 10**: Gemini AI Business Intelligence & n8n Automation (Natural language business insights, automated n8n webhooks).
- **Stage 11**: Testing, Security Hardening, & Production Deployment (Unit/Widget tests, E2E tests, rate limiting, Docker configs).

---

## 7. Technical Risks & External Dependencies

| Dependency / Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Meta Graph API Rate Limits & Token Expiry** | Medium | Implement Redis/Cache layer with token refresh scheduler; store historical snapshot data in PostgreSQL. |
| **Competitor Anti-Scraping / Dynamic Pages** | Medium-High | Respect robots.txt & terms; provide an easy manual data entry & bulk CSV import interface with audit tags (Verified vs Estimated). |
| **Palestinian Payment Gateways (PalPay/Mahfazati)** | Medium | Implement Gateway Strategy Pattern: abstract `PaymentProviderInterface` allowing COD, Bank Transfer, and PalPay with webhook reconciliation. |
| **Stock Race Conditions during High Traffic** | High | Use PostgreSQL row-level locks within NestJS Prisma interactive transactions (`SELECT ... FOR UPDATE` equivalent). |
| **Offline Connectivity on Mobile** | Low-Medium | Flutter Hive/Isar cache for catalog browsing; queue mutations in Riverpod with optimistic UI updates. |
| **Gemini AI Hallucination on Financials** | Low | Provide strict system instructions, calculate numerical metrics on the backend via SQL/Prisma, pass exact figures to Gemini as grounded context. |
