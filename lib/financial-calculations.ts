export type BusinessType =
  | "Comercio"
  | "Servico"
  | "Industria"
  | "Restaurante"
  | "Outro";
export type TaxRegime = "MEI" | "Simples Nacional" | "Lucro Presumido" | "Nao sei";

export type BusinessProfile = {
  businessType?: string;
  monthlyRevenue?: string;
  employees?: string;
  knowsProfit?: string;
  knowsMainCost?: string;
  taxRegime?: string;
  diagnosis?: {
    level?: string;
    title?: string;
    summary?: string;
  };
};

export type FinancialRules = {
  directCost: number;
  fixedExpenses: number;
  taxes: number;
  idealDirectCost: number;
};

export type FinancialAdjustments = {
  revenue: number;
  directCost: number;
  fixedExpenses: number;
  taxes: number;
  cashBalance: number;
  updatedAt?: string;
};

export type Sale = {
  id: string;
  tableNumber: number;
  total: number;
  closedAt: string;
  saleDate?: string;
  totalCost?: number;
  grossProfit?: number;
  items: Array<{
    productId: string;
    name: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    estimatedUnitCost?: number;
    subtotal?: number;
    totalCost?: number;
    grossProfit?: number;
    total?: number;
  }>;
};

export type RestaurantInsight = {
  title: string;
  description: string;
  tone: "support" | "alert" | "risk" | "primary";
};

type RestaurantProductSummary = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  grossProfit: number;
  marginPercent: number;
};

export const financialRulesByBusinessType: Record<BusinessType, FinancialRules> = {
  Comercio: {
    directCost: 0.55,
    fixedExpenses: 0.18,
    taxes: 0.08,
    idealDirectCost: 0.45,
  },
  Servico: {
    directCost: 0.25,
    fixedExpenses: 0.22,
    taxes: 0.1,
    idealDirectCost: 0.2,
  },
  Industria: {
    directCost: 0.5,
    fixedExpenses: 0.2,
    taxes: 0.09,
    idealDirectCost: 0.42,
  },
  Restaurante: {
    directCost: 0.42,
    fixedExpenses: 0.22,
    taxes: 0.09,
    idealDirectCost: 0.35,
  },
  Outro: {
    directCost: 0.4,
    fixedExpenses: 0.2,
    taxes: 0.09,
    idealDirectCost: 0.35,
  },
};

export function normalizeText(value?: string) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeBusinessType(value?: string): BusinessType {
  const normalized = normalizeText(value);

  if (normalized === "comercio") {
    return "Comercio";
  }

  if (normalized === "servico") {
    return "Servico";
  }

  if (normalized === "industria") {
    return "Industria";
  }

  if (normalized === "restaurante" || normalized === "alimentacao") {
    return "Restaurante";
  }

  return "Outro";
}

export function normalizeTaxRegime(value?: string): TaxRegime {
  const normalized = normalizeText(value);

  if (normalized === "mei") {
    return "MEI";
  }

  if (normalized === "simples" || normalized === "simples nacional") {
    return "Simples Nacional";
  }

  if (normalized === "lucro_presumido" || normalized === "lucro presumido") {
    return "Lucro Presumido";
  }

  return "Nao sei";
}

export function getEstimatedRevenue(monthlyRevenue?: string) {
  const normalized = normalizeText(monthlyRevenue);

  if (normalized === "ate r$ 20 mil") {
    return 15000;
  }

  if (normalized === "r$ 20 mil a r$ 50 mil") {
    return 35000;
  }

  if (normalized === "r$ 50 mil a r$ 100 mil") {
    return 75000;
  }

  if (normalized === "acima de r$ 100 mil") {
    return 150000;
  }

  return 15000;
}

export function getFinancialRules(businessType?: string) {
  return financialRulesByBusinessType[normalizeBusinessType(businessType)];
}

export function calculateEstimatedTaxes(
  revenue: number,
  businessType?: string,
  taxRegime?: string,
) {
  const normalizedBusinessType = normalizeBusinessType(businessType);
  const normalizedTaxRegime = normalizeTaxRegime(taxRegime);

  if (normalizedTaxRegime === "MEI") {
    const fixedTaxByBusinessType: Record<BusinessType, number> = {
      Comercio: 82,
      Servico: 88,
      Industria: 90,
      Restaurante: 88,
      Outro: 85,
    };

    return {
      amount: fixedTaxByBusinessType[normalizedBusinessType],
      rate: 0,
      label: "DAS mensal aproximado",
      description: "Seu imposto no MEI costuma ser previsivel e fixo.",
      isFixed: true,
      regime: normalizedTaxRegime,
    };
  }

  const simplesRates: Record<BusinessType, number> = {
    Comercio: 0.06,
    Servico: 0.105,
    Industria: 0.08,
    Restaurante: 0.09,
    Outro: 0.09,
  };
  const lucroPresumidoRates: Record<BusinessType, number> = {
    Comercio: 0.135,
    Servico: 0.155,
    Industria: 0.14,
    Restaurante: 0.13,
    Outro: 0.14,
  };
  const genericRates: Record<BusinessType, number> = {
    Comercio: 0.08,
    Servico: 0.1,
    Industria: 0.09,
    Restaurante: 0.09,
    Outro: 0.09,
  };
  const rate =
    normalizedTaxRegime === "Simples Nacional"
      ? simplesRates[normalizedBusinessType]
      : normalizedTaxRegime === "Lucro Presumido"
        ? lucroPresumidoRates[normalizedBusinessType]
        : genericRates[normalizedBusinessType];

  return {
    amount: revenue * rate,
    rate,
    label:
      normalizedTaxRegime === "Nao sei"
        ? "Estimativa aproximada"
        : normalizedTaxRegime,
    description:
      normalizedTaxRegime === "Nao sei"
        ? "Estimativa aproximada. Confirme seu regime tributario para aumentar a confianca dos numeros."
        : `Estimativa inteligente para ${normalizedTaxRegime}.`,
    isFixed: false,
    regime: normalizedTaxRegime,
  };
}

export function calculateMargin(amount: number, revenue: number) {
  if (revenue === 0) {
    return 0;
  }

  return amount / revenue;
}

export function calculateMissedMoney(revenue: number, directCost: number, idealRate: number) {
  return Math.max(directCost - revenue * idealRate, 0);
}

export function getSaleDay(sale: Sale) {
  return sale.saleDate ?? sale.closedAt.slice(0, 10);
}

export function getSaleItemSubtotal(item: Sale["items"][number]) {
  return item.subtotal ?? item.total ?? item.quantity * item.unitPrice;
}

export function getSaleItemTotalCost(item: Sale["items"][number]) {
  return item.totalCost ?? (item.estimatedUnitCost ?? 0) * item.quantity;
}

export function getSaleItemGrossProfit(item: Sale["items"][number]) {
  return item.grossProfit ?? getSaleItemSubtotal(item) - getSaleItemTotalCost(item);
}

export function getSaleTotalCost(sale: Sale) {
  return (
    sale.totalCost ??
    sale.items.reduce((total, item) => total + getSaleItemTotalCost(item), 0)
  );
}

export function getSaleGrossProfit(sale: Sale) {
  return sale.grossProfit ?? sale.total - getSaleTotalCost(sale);
}

export function getSalesByDay(sales: Sale[], day: string) {
  return sales.filter((sale) => getSaleDay(sale) === day);
}

export function calculateDailySalesTotal(sales: Sale[], day: string) {
  return getSalesByDay(sales, day).reduce((total, sale) => total + sale.total, 0);
}

export function calculateDailySalesCount(sales: Sale[], day: string) {
  return getSalesByDay(sales, day).length;
}

export function calculateDailyAverageTicket(sales: Sale[], day: string) {
  const count = calculateDailySalesCount(sales, day);

  if (count === 0) {
    return 0;
  }

  return calculateDailySalesTotal(sales, day) / count;
}

export function calculateDailyEstimatedGrossProfit(sales: Sale[], day: string) {
  return getSalesByDay(sales, day).reduce(
    (total, sale) => total + getSaleGrossProfit(sale),
    0,
  );
}

export function calculateDailyCmv(sales: Sale[], day: string) {
  const salesTotal = calculateDailySalesTotal(sales, day);

  if (salesTotal === 0) {
    return 0;
  }

  const totalCost = getSalesByDay(sales, day).reduce(
    (total, sale) => total + getSaleTotalCost(sale),
    0,
  );

  return totalCost / salesTotal;
}

function formatMoneyForInsight(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentForInsight(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value * 100);
}

function summarizeRestaurantProducts(sales: Sale[]) {
  const products = new Map<string, RestaurantProductSummary>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const current = products.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        quantity: 0,
        revenue: 0,
        grossProfit: 0,
        marginPercent: 0,
      };
      const revenue = getSaleItemSubtotal(item);
      const grossProfit = getSaleItemGrossProfit(item);
      const nextRevenue = current.revenue + revenue;
      const nextGrossProfit = current.grossProfit + grossProfit;

      products.set(item.productId, {
        ...current,
        quantity: current.quantity + item.quantity,
        revenue: nextRevenue,
        grossProfit: nextGrossProfit,
        marginPercent: nextRevenue > 0 ? nextGrossProfit / nextRevenue : 0,
      });
    });
  });

  return Array.from(products.values());
}

export function generateRestaurantInsights(
  sales: Sale[],
  day: string,
): RestaurantInsight[] {
  const daySales = getSalesByDay(sales, day);
  const salesTotal = calculateDailySalesTotal(sales, day);
  const averageTicket = calculateDailyAverageTicket(sales, day);
  const cmv = calculateDailyCmv(sales, day);
  const products = summarizeRestaurantProducts(daySales);
  const bestSeller = [...products].sort(
    (first, second) => second.quantity - first.quantity,
  )[0];
  const lowMarginProduct = [...products]
    .filter((product) => product.quantity >= 2 && product.marginPercent < 0.35)
    .sort((first, second) => second.quantity - first.quantity)[0];
  const opportunityProduct = lowMarginProduct ?? bestSeller;
  const insights: RestaurantInsight[] = [];

  if (daySales.length === 0) {
    return [
      {
        title: "Sem vendas no dia",
        description:
          "Feche uma conta em Mesas para o Norteia gerar recomendacoes praticas sobre faturamento, CMV e produtos.",
        tone: "support",
      },
    ];
  }

  if (bestSeller) {
    insights.push({
      title: "Produto campeao",
      description: `${bestSeller.name} foi o mais vendido hoje, com ${bestSeller.quantity} unidades e ${formatMoneyForInsight(bestSeller.revenue)} de faturamento.`,
      tone: "primary",
    });
  }

  if (lowMarginProduct) {
    insights.push({
      title: "Produto vende bem, mas lucra pouco",
      description: `${lowMarginProduct.name} vendeu ${lowMarginProduct.quantity} unidades, mas sua margem estimada esta em ${formatPercentForInsight(lowMarginProduct.marginPercent)}%. Revise preco ou custo para proteger o lucro.`,
      tone: "alert",
    });
  }

  if (cmv > 0.55) {
    insights.push({
      title: "CMV alto",
      description: `Seu CMV de hoje esta em ${formatPercentForInsight(cmv)}%. Isso pode estar comprimindo seu lucro mesmo com ${formatMoneyForInsight(salesTotal)} em vendas.`,
      tone: "risk",
    });
  }

  if (averageTicket > 0) {
    insights.push({
      title: "Ticket medio",
      description: `Seu ticket medio foi de ${formatMoneyForInsight(averageTicket)}. Uma estrategia de combos pode elevar esse valor sem depender apenas de mais mesas.`,
      tone: averageTicket < 30 ? "alert" : "support",
    });
  }

  if (opportunityProduct) {
    const monthlyGain = opportunityProduct.quantity * 2 * 30;

    insights.push({
      title: "Oportunidade de preco",
      description: `Se aumentar R$ 2,00 no produto ${opportunityProduct.name}, o lucro mensal pode subir aproximadamente ${formatMoneyForInsight(monthlyGain)}, considerando o volume atual.`,
      tone: "primary",
    });
  }

  if (salesTotal >= 300 && cmv > 0 && cmv <= 0.45) {
    insights.push({
      title: "Dia com boa relacao venda e custo",
      description: `O faturamento chegou a ${formatMoneyForInsight(salesTotal)} com CMV de ${formatPercentForInsight(cmv)}. Mantenha esse padrao e acompanhe os produtos campeoes.`,
      tone: "primary",
    });
  }

  return insights;
}

export function calculateDre(
  profile: BusinessProfile,
  adjustments?: FinancialAdjustments | null,
  sales: Sale[] = [],
) {
  const businessType = normalizeBusinessType(profile.businessType);
  const rules = financialRulesByBusinessType[businessType];
  const estimatedRevenue = getEstimatedRevenue(profile.monthlyRevenue);
  const salesRevenue = sales.reduce((total, sale) => total + sale.total, 0);
  const revenue = (adjustments?.revenue ?? estimatedRevenue) + salesRevenue;
  const estimatedTaxes = calculateEstimatedTaxes(
    revenue,
    businessType,
    profile.taxRegime,
  );
  const directCost = adjustments?.directCost ?? revenue * rules.directCost;
  const fixedExpenses = adjustments?.fixedExpenses ?? revenue * rules.fixedExpenses;
  const taxes = adjustments?.taxes ?? estimatedTaxes.amount;
  const profit = revenue - directCost - fixedExpenses - taxes;
  const netMargin = calculateMargin(profit, revenue);
  const directCostPercent = calculateMargin(directCost, revenue);
  const missedMoney = calculateMissedMoney(revenue, directCost, rules.idealDirectCost);

  return {
    businessType,
    revenue,
    directCost,
    fixedExpenses,
    taxes,
    taxInfo: estimatedTaxes,
    profit,
    netMargin,
    directCostPercent,
    missedMoney,
    rules,
  };
}

export function hasEmployees(employees?: string) {
  const normalized = normalizeText(employees);
  return normalized !== undefined && normalized !== "so eu";
}

export function calculatePayrollEstimate(revenue: number, employees?: string) {
  return hasEmployees(employees) ? revenue * 0.12 : 0;
}
