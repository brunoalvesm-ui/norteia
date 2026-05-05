"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCard } from "@/components/alert-card";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import {
  calculateDailyAverageTicket,
  calculateDailyCmv,
  calculateDailyEstimatedGrossProfit,
  calculateDailySalesCount,
  calculateDailySalesTotal,
  generateRestaurantInsights,
  getSaleGrossProfit,
  getSaleItemGrossProfit,
  getSaleItemSubtotal,
  getSalesByDay,
  type Sale,
} from "@/lib/financial-calculations";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { SALES_STORAGE_KEY } from "@/lib/storage-keys";

type ProductRankingItem = {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  grossProfit: number;
  marginPercent: number;
};

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function readSales() {
  const storedSales = localStorage.getItem(SALES_STORAGE_KEY);

  if (!storedSales) {
    return [];
  }

  try {
    return JSON.parse(storedSales) as Sale[];
  } catch {
    return [];
  }
}

function getSaleTime(sale: Sale) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(sale.closedAt));
}

function getSaleItemsQuantity(sale: Sale) {
  return sale.items.reduce((total, item) => total + item.quantity, 0);
}

function buildProductRanking(sales: Sale[]) {
  const ranking = new Map<string, ProductRankingItem>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const current = ranking.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        category: item.category ?? "Sem categoria",
        quantity: 0,
        revenue: 0,
        grossProfit: 0,
        marginPercent: 0,
      };
      const revenue = getSaleItemSubtotal(item);
      const grossProfit = getSaleItemGrossProfit(item);
      const nextRevenue = current.revenue + revenue;
      const nextGrossProfit = current.grossProfit + grossProfit;

      ranking.set(item.productId, {
        ...current,
        quantity: current.quantity + item.quantity,
        revenue: nextRevenue,
        grossProfit: nextGrossProfit,
        marginPercent: nextRevenue > 0 ? nextGrossProfit / nextRevenue : 0,
      });
    });
  });

  return Array.from(ranking.values());
}

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedDay, setSelectedDay] = useState(getTodayValue());

  useEffect(() => {
    setSales(readSales());
  }, []);

  const daySales = useMemo(
    () => getSalesByDay(sales, selectedDay),
    [sales, selectedDay],
  );
  const salesTotal = calculateDailySalesTotal(sales, selectedDay);
  const salesCount = calculateDailySalesCount(sales, selectedDay);
  const averageTicket = calculateDailyAverageTicket(sales, selectedDay);
  const grossProfit = calculateDailyEstimatedGrossProfit(sales, selectedDay);
  const cmv = calculateDailyCmv(sales, selectedDay);
  const productRanking = useMemo(
    () => buildProductRanking(daySales),
    [daySales],
  );
  const byQuantity = [...productRanking].sort(
    (first, second) => second.quantity - first.quantity,
  );
  const byRevenue = [...productRanking].sort(
    (first, second) => second.revenue - first.revenue,
  );
  const byProfit = [...productRanking].sort(
    (first, second) => second.grossProfit - first.grossProfit,
  );
  const insights = generateRestaurantInsights(sales, selectedDay);
  const ticketIsLow = salesCount > 0 && averageTicket < 30;

  return (
    <PageShell
      eyebrow="Vendas"
      title="Acompanhamento de vendas"
      description="Veja o resultado do restaurante por dia, com faturamento, ticket, CMV e produtos que mais puxam lucro."
    >
      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            Filtrar por data
          </span>
          <input
            type="date"
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
            className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none focus:border-norteia-primary"
          />
        </label>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Faturamento"
          value={formatCurrency(salesTotal)}
          hint="Total vendido no dia filtrado"
          tone="primary"
        />
        <MetricCard
          label="Vendas"
          value={String(salesCount)}
          hint="Contas fechadas no dia"
          tone="support"
        />
        <MetricCard
          label="Ticket medio"
          value={formatCurrency(averageTicket)}
          hint="Valor medio por venda"
          tone={ticketIsLow ? "alert" : "primary"}
        />
        <MetricCard
          label="Lucro bruto"
          value={formatCurrency(grossProfit)}
          hint="Estimativa antes das despesas fixas"
          tone="primary"
        />
        <div className="col-span-2">
          <MetricCard
            label="CMV do dia"
            value={`${formatPercent(cmv)}%`}
            hint="Percentual do faturamento consumido por custo dos produtos"
            tone={cmv > 0.55 ? "risk" : cmv > 0.45 ? "alert" : "primary"}
          />
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            Gatilhos inteligentes
          </p>
          <h2 className="mt-1 font-title text-2xl font-bold text-norteia-text">
            Recomendacoes praticas
          </h2>
        </div>
        {insights.map((insight) => (
          <AlertCard
            key={`${insight.title}-${insight.description}`}
            title={insight.title}
            description={insight.description}
            tone={insight.tone}
          />
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            Vendas do dia
          </p>
          <h2 className="mt-1 font-title text-2xl font-bold text-norteia-text">
            Contas fechadas
          </h2>
        </div>

        {daySales.length > 0 ? (
          daySales.map((sale) => (
            <article
              key={sale.id}
              className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft"
            >
              <div>
                <p className="text-sm font-bold text-norteia-text">
                  Mesa {sale.tableNumber} | {getSaleTime(sale)}
                </p>
                <p className="mt-1 text-xs text-norteia-muted">
                  {getSaleItemsQuantity(sale)} itens | Lucro bruto{" "}
                  {formatCurrency(getSaleGrossProfit(sale))}
                </p>
              </div>
              <strong className="text-right font-title text-xl font-bold text-norteia-primary">
                {formatCurrency(sale.total)}
              </strong>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-norteia-line bg-norteia-card p-4 text-sm text-norteia-muted shadow-soft">
            Nenhuma venda encontrada para esta data.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            Ranking do dia
          </p>
          <h2 className="mt-1 font-title text-2xl font-bold text-norteia-text">
            Produtos que puxaram o resultado
          </h2>
        </div>

        <RankingBlock
          title="Mais vendidos"
          items={byQuantity}
          valueLabel={(item) => `${item.quantity} un.`}
        />
        <RankingBlock
          title="Maiores faturamentos"
          items={byRevenue}
          valueLabel={(item) => formatCurrency(item.revenue)}
        />
        <RankingBlock
          title="Maiores lucros estimados"
          items={byProfit}
          valueLabel={(item) => formatCurrency(item.grossProfit)}
        />
      </section>
    </PageShell>
  );
}

function RankingBlock({
  title,
  items,
  valueLabel,
}: {
  title: string;
  items: ProductRankingItem[];
  valueLabel: (item: ProductRankingItem) => string;
}) {
  return (
    <article className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <div
            key={item.productId}
            className="flex items-center justify-between gap-3 rounded-2xl border border-norteia-line bg-norteia-card-2 p-3"
          >
            <div>
              <p className="text-sm font-bold text-norteia-text">
                {index + 1}. {item.name}
              </p>
              <p className="mt-1 text-xs text-norteia-muted">
                {item.category} | margem {formatPercent(item.marginPercent)}%
              </p>
            </div>
            <strong className="text-right text-sm font-bold text-norteia-primary">
              {valueLabel(item)}
            </strong>
          </div>
        ))}

        {items.length === 0 ? (
          <p className="rounded-2xl border border-norteia-line bg-norteia-card-2 p-3 text-sm text-norteia-muted">
            Sem produtos vendidos nesta data.
          </p>
        ) : null}
      </div>
    </article>
  );
}
