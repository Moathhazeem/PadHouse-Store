import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import {
  adminFetchAnalyticsInventoryValuationApi,
  adminFetchAnalyticsOrdersApi,
  adminFetchAnalyticsProductPerformanceApi,
  adminFetchCategoriesApi,
  type AdminInventoryValuationResult,
  type AdminOrdersAnalyticsResult,
  type AdminProductPerformanceResult,
} from '../../services/adminApi';

type Props = { onOpenOrder?: (id: string) => void };
type Section = 'inventory' | 'orders' | 'products';
const money = (value: number, currency = 'ILS') => new Intl.NumberFormat('ar', { style: 'currency', currency }).format(value || 0);
const number = (value: number) => new Intl.NumberFormat('ar').format(value || 0);

export const AdminInventoryOrdersAnalytics: React.FC<Props> = ({ onOpenOrder }) => {
  const [section, setSection] = useState<Section>('inventory');
  const [inventory, setInventory] = useState<AdminInventoryValuationResult | null>(null);
  const [orders, setOrders] = useState<AdminOrdersAnalyticsResult | null>(null);
  const [performance, setPerformance] = useState<AdminProductPerformanceResult | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; nameAr: string }>>([]);
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('revenue');
  const [statusFilter, setStatusFilter] = useState('');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = { categoryId: categoryId || undefined, startDate: startDate || undefined, endDate: endDate || undefined, sortBy: sort, limit: 25 };
      const [i, o, p, categoryOptions] = await Promise.all([
        adminFetchAnalyticsInventoryValuationApi({ categoryId: query.categoryId, limit: 25, page: inventoryPage }),
        adminFetchAnalyticsOrdersApi({ startDate: query.startDate, endDate: query.endDate, limit: 25, page: ordersPage }),
        adminFetchAnalyticsProductPerformanceApi({ ...query, page: productsPage }),
        adminFetchCategoriesApi().catch(() => []),
      ]);
      setInventory(i); setOrders(o); setPerformance(p);
      setCategories(categoryOptions.length ? categoryOptions.map((c) => ({ id: c.id, nameAr: c.nameAr })) : i.byCategory.map((c) => ({ id: c.categoryId, nameAr: c.nameAr })));
    } catch (e: any) { setError(e?.message || 'تعذر تحميل التحليلات'); }
    finally { setLoading(false); }
  }, [categoryId, startDate, endDate, sort, inventoryPage, ordersPage, productsPage]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setInventoryPage(1);
    setOrdersPage(1);
    setProductsPage(1);
    setStatusFilter('');
  }, [categoryId, startDate, endDate, sort]);

  const statuses = useMemo(() => orders?.statusDistribution ?? [], [orders]);
  const allOrderCount = statuses.reduce((sum, row) => sum + row.count, 0);
  const statusNames: Record<string, string> = { PENDING: 'قيد الانتظار', CONFIRMED: 'مؤكد', PROCESSING: 'قيد التجهيز', PREPARING: 'قيد التجهيز', SHIPPED: 'تم الشحن', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي', REFUNDED: 'مسترد' };
  const statusColor: Record<string, string> = { PENDING: 'bg-amber-500', CONFIRMED: 'bg-blue-500', PROCESSING: 'bg-indigo-500', SHIPPED: 'bg-violet-500', DELIVERED: 'bg-emerald-500', CANCELLED: 'bg-red-500', REFUNDED: 'bg-slate-500' };
  const metric = (label: string, value: React.ReactNode, tone = 'text-ph-ink') => <div className="rounded-2xl border border-ph-border bg-white p-4"><div className="text-xs text-ph-muted font-bold">{label}</div><div className={`mt-2 text-xl font-black ${tone}`}>{value}</div></div>;

  return <div className="space-y-5" dir="rtl">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2 overflow-x-auto">{([['inventory','تقييم المخزون'],['orders','تحليل الطلبات'],['products','أداء المنتجات']] as const).map(([id,label]) => <button key={id} onClick={() => setSection(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${section===id?'bg-ph-brand text-white':'bg-white border border-ph-border text-ph-muted'}`}>{label}</button>)}</div>
      <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-ph-border bg-white px-3 py-2 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>تحديث</button>
    </div>
    <div className="flex flex-wrap gap-3 rounded-2xl border border-ph-border bg-white p-4">
      <label className="text-xs font-bold text-ph-muted">التصنيف<select className="mr-2 rounded-lg border border-ph-border px-3 py-2 text-ph-ink" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">كل التصنيفات</option>{categories.map(c=><option key={c.id} value={c.id}>{c.nameAr}</option>)}</select></label>
      {section !== 'inventory' && <><label className="text-xs font-bold text-ph-muted">من<input type="date" className="mr-2 rounded-lg border border-ph-border px-3 py-2 text-ph-ink" value={startDate} max={endDate || undefined} onChange={e=>setStartDate(e.target.value)}/></label><label className="text-xs font-bold text-ph-muted">إلى<input type="date" className="mr-2 rounded-lg border border-ph-border px-3 py-2 text-ph-ink" value={endDate} min={startDate || undefined} onChange={e=>setEndDate(e.target.value)}/></label></>}
      {section === 'products' && <label className="text-xs font-bold text-ph-muted">الترتيب<select className="mr-2 rounded-lg border border-ph-border px-3 py-2 text-ph-ink" value={sort} onChange={e=>setSort(e.target.value)}><option value="revenue">أعلى الإيرادات</option><option value="profit">أعلى إجمالي ربح</option><option value="unitsSold">أعلى الوحدات مبيعاً</option><option value="marginPct">أعلى هامش ربح</option><option value="revenueAsc">أقل المبيعات</option><option value="stockAsc">أقل مخزون</option></select></label>}
    </div>
    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4"/>{error}</div>}
    {section === 'inventory' && inventory && <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{metric('قيمة المخزون',money(inventory.totals.costValue, inventory.currency.code))}{metric('إجمالي المنتجات',number(inventory.totals.productCount))}{metric('وحدات متاحة',number(inventory.totals.totalUnits))}{metric('مخزون منخفض / نافد',`${number(inventory.totals.lowStockCount)} / ${number(inventory.totals.outOfStockCount)}`,'text-amber-700')}{metric('مخزون زائد',number(inventory.totals.overstockCount),'text-blue-700')}</div>
      <section className="rounded-2xl border border-ph-border bg-white p-4"><h3 className="mb-3 font-black">قيمة المخزون حسب التصنيف</h3><div className="space-y-2">{inventory.byCategory.map(c=><div key={c.categoryId} className="flex items-center gap-3 text-sm"><span className="w-40 truncate">{c.nameAr}</span><div className="h-2 flex-1 rounded bg-slate-100"><div className="h-2 rounded bg-ph-brand" style={{width:`${c.share}%`}}/></div><b>{money(c.costValue,inventory.currency.code)}</b></div>)}</div></section>
      <Table title="تقييم المخزون حسب المنتج" headers={['المنتج','SKU','التصنيف','متاح','محجوز','تكلفة الوحدة','قيمة المخزون','الحد الأدنى','الحد الأعلى','الحالة']} rows={inventory.items.map(i=>[<b>{i.nameAr}</b>,i.productSku || i.variantSku,i.categoryNameAr || '—',number(i.availableStock),number(i.reservedStock),money(i.costPrice,inventory.currency.code),money(i.costValue,inventory.currency.code),number(i.minThreshold),number(i.maxStock),i.availableStock<=0?'نفد':i.isOverstocked?'زائد':i.isLowStock?'منخفض':'متوفر'])}/>
      <Pager page={inventory.pagination.page} pages={inventory.pagination.totalPages} onChange={setInventoryPage}/>
      <p className="text-xs text-ph-muted">الكمية المتاحة من سجل المخزون الحالي؛ لا يوجد في نموذج البيانات الحالي حقل حجز مستقل، لذلك المحجوز صفر والمتاح يساوي الرصيد الحالي.</p>
    </>}
    {section === 'orders' && orders && <>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">{metric('إجمالي الطلبات',number(allOrderCount))}{...['PENDING','CONFIRMED','PREPARING','SHIPPED','DELIVERED','CANCELLED'].map(s=>metric(statusNames[s],number(statuses.find(x=>x.status===s)?.count||0),s==='CANCELLED'?'text-red-700':'text-ph-ink'))}{metric('مستردة',number(orders.paymentDistribution.find(x=>x.status==='REFUNDED')?.count||0),'text-slate-600')}{metric('متوسط قيمة الطلب',money(orders.summary.averageOrderValue,orders.currency.code))}</div>
      <section className="rounded-2xl border border-ph-border bg-white p-4"><h3 className="mb-4 font-black">توزيع حالات الطلبات</h3><div className="flex h-5 overflow-hidden rounded-full bg-slate-100">{statuses.map(s=><button key={s.status} title={`${statusNames[s.status]||s.status}: ${s.count}`} onClick={()=>setStatusFilter(statusFilter===s.status?'':s.status)} className={`${statusColor[s.status]||'bg-slate-400'} h-full`} style={{width:`${allOrderCount ? s.count/allOrderCount*100 : 0}%`,opacity:statusFilter && statusFilter!==s.status?0.35:1}} aria-label={`${statusNames[s.status]||s.status}: ${s.count}`}/>)}</div><div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">{statuses.map(s=><button key={s.status} onClick={()=>setStatusFilter(statusFilter===s.status?'':s.status)} className={`flex items-center gap-2 rounded-lg p-1 text-sm ${statusFilter===s.status?'bg-slate-100':''}`}><i className={`h-2.5 w-2.5 rounded-full ${statusColor[s.status]||'bg-slate-400'}`}/>{statusNames[s.status]||s.status}<b className="mr-auto">{number(s.count)}</b></button>)}</div></section>
      <Table title="أحدث الطلبات" headers={['رقم الطلب','الحالة','الدفع','القيمة','عدد الأصناف','التاريخ','فتح']} rows={orders.recentOrders.filter(o=>!statusFilter||o.status===statusFilter).map(o=>[o.orderNumber,statusNames[o.status]||o.status,o.paymentStatus,money(o.grandTotal,orders.currency.code),number(o.itemsCount),new Date(o.createdAt).toLocaleDateString('ar'),<button onClick={()=>onOpenOrder?.(o.id)} className="inline-flex items-center gap-1 text-ph-brand font-bold" title="فتح الطلب"><ExternalLink className="h-4 w-4"/>فتح</button>])}/>
      <Pager page={orders.pagination.page} pages={orders.pagination.totalPages} onChange={setOrdersPage}/>
    </>}
    {section === 'products' && performance && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metric('المنتجات المعروضة',number(performance.pagination.total))}{metric('الوحدات المباعة',number(performance.products.reduce((n,p)=>n+p.unitsSold,0)))}{metric('إجمالي الإيرادات',money(performance.products.reduce((n,p)=>n+p.revenue,0),performance.currency.code))}{metric('إجمالي الربح',performance.products.some(p=>p.profit===null&&p.unitsSold>0)?'غير مكتمل':money(performance.products.reduce((n,p)=>n+(p.profit||0),0),performance.currency.code))}</div>
      <Table title="أداء المنتجات" headers={['المنتج','SKU','الوحدات المباعة','الإيرادات','تكلفة البضاعة','إجمالي الربح','هامش الربح','المخزون الحالي','قيمة المخزون']} rows={performance.products.map(p=>[<span className="flex items-center gap-2"><img src={p.imageUrl || '/placeholder.png'} alt="" className="h-9 w-9 rounded-lg object-cover bg-slate-100" onError={e=>{e.currentTarget.style.visibility='hidden';}}/><b>{p.nameAr}</b></span>,p.sku || '—',number(p.unitsSold),money(p.revenue,performance.currency.code),p.costKnown?money(p.cogs,performance.currency.code):'غير مكتمل',p.profit===null?'غير مكتمل':money(p.profit,performance.currency.code),p.marginPct===null?'غير مكتمل':`${number(p.marginPct)}%`,number(p.currentStock),money(p.inventoryValue,performance.currency.code)])}/>
      <Pager page={performance.pagination.page} pages={performance.pagination.totalPages} onChange={setProductsPage}/>
    </>}
    {loading && <div className="animate-pulse rounded-xl bg-white p-8 text-center text-sm text-ph-muted">جارٍ تحميل البيانات الفعلية…</div>}
  </div>;
};

function Table({title,headers,rows}:{title:string;headers:string[];rows:React.ReactNode[][]}) { return <section className="overflow-hidden rounded-2xl border border-ph-border bg-white"><h3 className="p-4 font-black">{title}</h3><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-xs text-ph-muted"><tr>{headers.map(h=><th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r,i)=><tr key={i} className="border-t border-ph-border">{r.map((cell,j)=><td key={j} className="whitespace-nowrap px-4 py-3">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-8 text-center text-sm text-ph-muted">لا توجد بيانات للفلاتر المحددة.</td></tr>}</tbody></table></div></section>; }

function Pager({page,pages,onChange}:{page:number;pages:number;onChange:(page:number)=>void}) { return <div className="flex items-center justify-center gap-3 text-sm"><button disabled={page<=1} onClick={()=>onChange(page-1)} className="rounded-lg border border-ph-border bg-white px-3 py-1.5 disabled:opacity-40">السابق</button><span className="text-ph-muted">صفحة {number(page)} من {number(Math.max(1,pages))}</span><button disabled={page>=pages} onClick={()=>onChange(page+1)} className="rounded-lg border border-ph-border bg-white px-3 py-1.5 disabled:opacity-40">التالي</button></div>; }
