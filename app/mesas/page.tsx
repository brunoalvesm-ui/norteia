"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { products } from "@/lib/products";
import { formatCurrency } from "@/lib/formatters";
import { OPEN_TABLES_STORAGE_KEY, SALES_STORAGE_KEY } from "@/lib/storage-keys";
import type { Sale } from "@/lib/financial-calculations";

type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type TableOrder = {
  tableNumber: number;
  items: OrderItem[];
};

const initialTables = Array.from({ length: 8 }, (_, index) => index + 1);

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

function isToday(dateValue: string) {
  const date = new Date(dateValue);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function escapeCsvValue(value: string | number) {
  const text = String(value);

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildSalesCsv(salesToExport: Sale[]) {
  const header = ["data/hora", "mesa", "itens", "quantidades", "total"];
  const rows = salesToExport.map((sale) => [
    new Date(sale.closedAt).toLocaleString("pt-BR"),
    sale.tableNumber,
    sale.items
      .map((item) => `${item.name} (${formatCurrency(item.unitPrice)})`)
      .join(" | "),
    sale.items.map((item) => `${item.quantity}x ${item.name}`).join(" | "),
    formatCurrency(sale.total),
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function readOpenTables() {
  const storedOrders = localStorage.getItem(OPEN_TABLES_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders) as TableOrder[];
  } catch {
    return [];
  }
}

export default function MesasPage() {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setOrders(readOpenTables());
    setSales(readSales());
  }, []);

  useEffect(() => {
    localStorage.setItem(OPEN_TABLES_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const currentOrder = orders.find((order) => order.tableNumber === selectedTable);
  const currentItems = currentOrder?.items ?? [];
  const tableTotal = currentItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

  const occupiedTables = useMemo(
    () =>
      new Set(
        orders
          .filter((order) => order.items.length > 0)
          .map((order) => order.tableNumber),
      ),
    [orders],
  );
  const sortedTables = useMemo(
    () =>
      [...initialTables].sort((firstTable, secondTable) => {
        const firstOccupied = occupiedTables.has(firstTable);
        const secondOccupied = occupiedTables.has(secondTable);

        if (firstOccupied === secondOccupied) {
          return firstTable - secondTable;
        }

        return firstOccupied ? -1 : 1;
      }),
    [occupiedTables],
  );
  const openTotal = orders.reduce(
    (total, order) =>
      total +
      order.items.reduce(
        (orderTotal, item) => orderTotal + item.quantity * item.unitPrice,
        0,
      ),
    0,
  );
  const todaySales = sales.filter((sale) => isToday(sale.closedAt));

  function getTableTotal(tableNumber: number) {
    const order = orders.find((item) => item.tableNumber === tableNumber);

    return (
      order?.items.reduce(
        (total, item) => total + item.quantity * item.unitPrice,
        0,
      ) ?? 0
    );
  }

  function addProduct(productId: string) {
    if (!selectedTable) {
      return;
    }

    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    setOrders((currentOrders) => {
      const tableOrder = currentOrders.find(
        (order) => order.tableNumber === selectedTable,
      );

      if (!tableOrder) {
        return [
          ...currentOrders,
          {
            tableNumber: selectedTable,
            items: [
              {
                productId: product.id,
                name: product.name,
                quantity: 1,
                unitPrice: product.price,
              },
            ],
          },
        ];
      }

      return currentOrders.map((order) => {
        if (order.tableNumber !== selectedTable) {
          return order;
        }

        const existingItem = order.items.find(
          (item) => item.productId === product.id,
        );

        if (!existingItem) {
          return {
            ...order,
            items: [
              ...order.items,
              {
                productId: product.id,
                name: product.name,
                quantity: 1,
                unitPrice: product.price,
              },
            ],
          };
        }

        return {
          ...order,
          items: order.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item,
          ),
        };
      });
    });
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    if (!selectedTable) {
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.tableNumber !== selectedTable) {
          return order;
        }

        return {
          ...order,
          items: order.items
            .map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: Math.max(nextQuantity, 0),
                  }
                : item,
            )
            .filter((item) => item.quantity > 0),
        };
      }),
    );
  }

  function removeItem(productId: string) {
    updateQuantity(productId, 0);
  }

  function cancelOrder() {
    if (!selectedTable || currentItems.length === 0) {
      setSelectedTable(null);
      return;
    }

    const confirmed = window.confirm(
      `Cancelar a comanda da Mesa ${selectedTable}? Os itens serao removidos e nenhuma venda sera registrada.`,
    );

    if (!confirmed) {
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.tableNumber !== selectedTable),
    );
    setSelectedTable(null);
  }

  function closeAccount() {
    if (!selectedTable || currentItems.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Fechar conta da Mesa ${selectedTable} no total de ${formatCurrency(
        tableTotal,
      )}?`,
    );

    if (!confirmed) {
      return;
    }

    const sale: Sale = {
      id: `${Date.now()}-${selectedTable}`,
      tableNumber: selectedTable,
      total: tableTotal,
      closedAt: new Date().toISOString(),
      items: currentItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    };

    const nextSales = [...sales, sale];

    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(nextSales));
    setSales(nextSales);
    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.tableNumber !== selectedTable),
    );
    setSelectedTable(null);
    setFeedbackMessage("Conta fechada com sucesso");
  }

  function exportTodaySales() {
    const fileContent = buildSalesCsv(todaySales);
    const blob = new Blob([fileContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `norteia-vendas-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearTodaySales() {
    const firstConfirmation = window.confirm(
      "Limpar as vendas registradas hoje neste dispositivo?",
    );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation = window.confirm(
      "Confirmar novamente: esta acao remove as vendas de hoje do navegador.",
    );

    if (!secondConfirmation) {
      return;
    }

    const remainingSales = sales.filter((sale) => !isToday(sale.closedAt));

    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(remainingSales));
    setSales(remainingSales);
  }

  return (
    <PageShell
      eyebrow="Mesas"
      title="Mesas e comandas"
      description="Registre pedidos rapidamente e alimente os dados financeiros do Norteia."
    >
      <div className="rounded-2xl border border-norteia-alert/35 bg-norteia-alert/10 p-4 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-alert">
          Atenção aos dados
        </p>
        <p className="mt-2 text-sm leading-6 text-norteia-text/78">
          Os dados são armazenados neste dispositivo. Não limpar o navegador.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            Mesas ocupadas
          </p>
          <strong className="mt-3 block font-title text-2xl font-bold text-norteia-primary">
            {occupiedTables.size}
          </strong>
        </article>
        <article className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            Total em aberto
          </p>
          <strong className="mt-3 block font-title text-2xl font-bold text-norteia-primary">
            {formatCurrency(openTotal)}
          </strong>
        </article>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={exportTodaySales}
          className="h-12 rounded-2xl bg-norteia-primary px-4 text-sm font-bold text-norteia-bg shadow-glow transition"
        >
          Exportar vendas do dia
        </button>
        <button
          type="button"
          onClick={clearTodaySales}
          disabled={todaySales.length === 0}
          className="h-12 rounded-2xl border border-norteia-risk/35 bg-norteia-risk/10 px-4 text-sm font-bold text-norteia-risk transition disabled:cursor-not-allowed disabled:opacity-45"
        >
          Limpar vendas do dia
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sortedTables.map((tableNumber) => {
          const isOccupied = occupiedTables.has(tableNumber);
          const total = getTableTotal(tableNumber);

          return (
            <button
              key={tableNumber}
              type="button"
              onClick={() => {
                setFeedbackMessage(null);
                setSelectedTable(tableNumber);
              }}
              className={`rounded-2xl border p-5 text-left shadow-soft transition ${
                isOccupied
                  ? "border-norteia-alert/60 bg-norteia-alert/20"
                  : "border-norteia-primary/25 bg-norteia-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-title text-2xl font-bold text-norteia-text">
                  Mesa {tableNumber}
                </p>
                {isOccupied ? (
                  <span className="rounded-full bg-norteia-alert px-2 py-1 text-xs font-bold text-norteia-bg">
                    {formatCurrency(total)}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-2 text-xs font-bold uppercase tracking-[0.14em] ${
                  isOccupied ? "text-norteia-alert" : "text-norteia-primary"
                }`}
              >
                {isOccupied ? "Ocupada" : "Livre"}
              </p>
            </button>
          );
        })}
      </div>

      {feedbackMessage ? (
        <div className="rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 p-4 shadow-soft">
          <p className="text-sm font-bold text-norteia-primary">
            {feedbackMessage}
          </p>
        </div>
      ) : null}

      {selectedTable ? (
        <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
                Comanda
              </p>
              <div className="mt-2 inline-flex items-center rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 px-4 py-3">
                <h2 className="font-title text-3xl font-bold text-norteia-primary">
                  Mesa {selectedTable}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTable(null)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-norteia-line bg-norteia-card-2 text-norteia-muted"
              aria-label="Fechar comanda"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3">
            {currentItems.length > 0 ? (
              currentItems.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-norteia-line bg-norteia-card-2 p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-norteia-text">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-norteia-muted">
                      {formatCurrency(item.unitPrice)} cada
                    </p>
                    <p className="mt-2 text-xs font-bold text-norteia-primary">
                      Subtotal: {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="h-8 w-8 rounded-xl border border-norteia-line text-sm font-bold text-norteia-text"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-norteia-text">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        className="h-8 w-8 rounded-xl border border-norteia-line text-sm font-bold text-norteia-text"
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-2 text-sm font-bold text-norteia-primary">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="mt-2 inline-flex h-8 items-center gap-1 rounded-xl border border-norteia-risk/35 px-2 text-xs font-bold text-norteia-risk"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remover
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-norteia-line bg-norteia-card-2 p-4 text-sm text-norteia-muted">
                Nenhum produto adicionado nesta mesa.
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
              Adicionar produto
            </p>
            <div className="grid gap-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product.id)}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-norteia-line bg-norteia-card-2 p-4 text-left"
                >
                  <span className="text-sm font-bold text-norteia-text">
                    {product.name}
                  </span>
                  <span className="text-sm font-bold text-norteia-primary">
                    {formatCurrency(product.price)}
                  </span>
                  <Plus className="h-5 w-5 text-norteia-primary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-norteia-primary/30 bg-norteia-primary/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-norteia-text">
                Total da mesa
              </span>
              <strong className="font-title text-2xl font-bold text-norteia-primary">
                {formatCurrency(tableTotal)}
              </strong>
            </div>
            <button
              type="button"
              onClick={closeAccount}
              disabled={currentItems.length === 0}
              className="mt-4 h-12 w-full rounded-2xl bg-norteia-primary px-4 text-sm font-bold text-norteia-bg shadow-glow transition disabled:cursor-not-allowed disabled:opacity-45"
            >
              Fechar conta
            </button>
            <button
              type="button"
              onClick={cancelOrder}
              className="mt-3 h-12 w-full rounded-2xl border border-norteia-risk/35 bg-norteia-risk/10 px-4 text-sm font-bold text-norteia-risk transition"
            >
              Cancelar comanda
            </button>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
