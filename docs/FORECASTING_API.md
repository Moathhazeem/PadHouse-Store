# Demand Forecasting API

All routes use the global prefix `/api/v1`, require a bearer JWT, and are limited to `SUPER_ADMIN`, `ADMIN`, or `INVENTORY_MANAGER`. Responses are JSON; list responses use `{ data, total, limit, offset }`.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/forecasting/overview` | Counts and freshness for the latest saved run |
| GET | `/forecasting/demand` | Latest saved product forecasts; supports limit, offset, productId, categoryId, search |
| GET | `/forecasting/stockout-predictions` | Stock cover falling within configured lead time |
| GET | `/forecasting/recommendations` | Replenishment quantities from saved daily demand and current stock |
| GET | `/forecasting/overstock` | Current coverage above configured days |
| GET | `/forecasting/trends` | Historical daily, weekly, monthly, seasonal, product and category demand analysis |
| GET | `/forecasting/accuracy` | Realized completed-period MAE, RMSE and WAPE by product and algorithm |
| POST | `/forecasting/evaluate` | Evaluate saved daily forecasts whose forecast dates have completed |
| GET | `/forecasting/products/:productId` | Up to 10 saved forecasts for a product |
| GET | `/forecasting/configuration` | Current defaults and thresholds |
| PATCH | `/forecasting/configuration` | Update generation defaults, lead time, and overstock coverage |
| POST | `/forecasting/generate` | Compute and persist a new run (existing generation DTO) |
| POST | `/forecasting/recommendations/:id/create-purchase-order` | Create a draft PO for product id; body: supplierId, unitCost |
| GET | `/forecasting/runs`, `/forecasting/runs/:id` | Existing run history/detail endpoints |
| GET | `/ai/inventory/forecast-tools` | Admin-only provider-neutral assistant tool definitions |
| POST | `/ai/inventory/forecast-tools/:toolName` | Admin-only execution against live forecasting services; draft PO requires `{"confirmed":true}` |

The forecasting assistant tools are `get_demand_forecast`, `get_stockout_predictions`, `get_at_risk_products`, `get_replenishment_recommendations`, `get_overstocked_products`, `get_forecast_accuracy`, and `create_draft_purchase_order`. Tool results are returned directly from backend forecast, stockout, replenishment, and accuracy services. Draft PO creation returns DRAFT orders only and requires administrator confirmation; approval and sending remain separate manual purchase-order actions.

Daily generation is configurable through `PATCH /forecasting/configuration` using `scheduledForecastingEnabled` and `scheduledForecastingTime` (`HH:mm`, server local time). The backend checks the configured schedule every minute and atomically claims each day before generating, preventing duplicate scheduled runs across instances. The schedule is disabled by default. Historical sales are re-read on every scheduled/manual run so new order data is included. `alertStockoutDays`, `alertAccuracyWapeThreshold`, and `alertOverstockDays` configure admin alerts. Unread alerts with the same type/product remain unresolved and suppress duplicates; marking them read allows a later alert for a new occurrence.

## Storage and indexes

- `DemandForecastRun` and `DemandForecast` keep immutable run summaries and product metrics.
- `ForecastProductResult` stores one normalized daily prediction per product and lead day, including point estimate, bounds, algorithm, confidence, quality status, model version, and realized evaluation results after the date completes.
- `ForecastConfiguration` is a singleton and its history/window defaults are used by generation unless request values override them.
- Product/run foreign keys cascade on deletion. Unique key `(runId, productId, forecastDate, horizonDays)` prevents duplicate horizon rows. Date/product/run indexes support list and drill-down access.

## Limitations

Trend and evaluation metrics use actual non-cancelled orders that are paid or delivered. Evaluations are written only after a forecast date ends; WAPE is suppressed when actual demand is zero, and accuracy percentages are omitted for fewer than five actual units. Seasonal patterns require at least 730 days of product history. The order schema has no partial return quantities or historical stock-on-hand snapshots, so returns and stockout censoring remain data-quality caveats; confidence is reduced when history is short or intermittent. The rolling backtest uses an expanding training window and never includes the target date in training. Generation remains synchronous; use a durable worker/queue for large all-catalog jobs. PO unit cost must come from a supplier quote; retail price is never substituted.
