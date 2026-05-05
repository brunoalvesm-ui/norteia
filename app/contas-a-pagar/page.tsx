"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Plus, XCircle } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageShell } from "@/components/page-shell";
import { formatCurrency } from "@/lib/formatters";
import type { DreCategory, Payable, PayableStatus } from "@/lib/financial-calculations";
import { PAYABLES_STORAGE_KEY } from "@/lib/storage-keys";

const dreCategories: DreCategory[] = [
  "CMV / Custo direto",
  "Folha de pagamento",
  "Aluguel",
  "Energia",
  "Agua",
  "Internet/Telefone",
  "Marketing",
  "Contabilidade",
  "Taxas e tarifas",
  "Impostos",
  "Manutencao",
  "Embalagens",
  "Delivery/Apps",
  "Despesas administrativas",
  "Outras despesas",
];

const statusOptions: Array<PayableStatus | "todos"> = [
  "todos",
  "previsto",
  "pago",
  "atrasado",
  "cancelado",
];

type PayableForm = {
  id: string;
  description: string;
  supplier: string;
  dreCategory: DreCategory;
  accountType: string;
  amount: string;
  dueDate: string;
  paymentDate: string;
  status: PayableStatus;
  recurring: boolean;
  note: string;
};

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function emptyForm(): PayableForm {
  return {
    id: "",
    description: "",
    supplier: "",
    dreCategory: "Outras despesas",
    accountType: "Operacional",
    amount: "",
    dueDate: getTodayValue(),
    paymentDate: "",
    status: "previsto",
    recurring: false,
    note: "",
  };
}

function readPayables() {
  const storedPayables = localStorage.getItem(PAYABLES_STORAGE_KEY);

  if (!storedPayables) {
    return [];
  }

  try {
    return JSON.parse(storedPayables) as Payable[];
  } catch {
    return [];
  }
}

function formToPayable(form: PayableForm): Payable {
  return {
    id: form.id || `payable-${Date.now()}`,
    description: form.description.trim(),
    supplier: form.supplier.trim() || undefined,
    dreCategory: form.dreCategory,
    accountType: form.accountType.trim() || "Operacional",
    amount: Number(form.amount),
    dueDate: form.dueDate,
    paymentDate: form.paymentDate || undefined,
    status: form.status,
    recurring: form.recurring,
    note: form.note.trim() || undefined,
    createdAt: form.id ? new Date().toISOString() : new Date().toISOString(),
  };
}

function payableToForm(payable: Payable): PayableForm {
  return {
    id: payable.id,
    description: payable.description,
    supplier: payable.supplier ?? "",
    dreCategory: payable.dreCategory,
    accountType: payable.accountType,
    amount: String(payable.amount),
    dueDate: payable.dueDate,
    paymentDate: payable.paymentDate ?? "",
    status: payable.status,
    recurring: payable.recurring,
    note: payable.note ?? "",
  };
}

function normalizePayableStatus(payable: Payable) {
  if (payable.status !== "previsto") {
    return payable.status;
  }

  return payable.dueDate < getTodayValue() ? "atrasado" : "previsto";
}

export default function ContasAPagarPage() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [form, setForm] = useState<PayableForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PayableStatus | "todos">("todos");
  const [startDate, setStartDate] = useState(getTodayValue().slice(0, 8) + "01");
  const [endDate, setEndDate] = useState(getTodayValue());

  useEffect(() => {
    setPayables(readPayables());
  }, []);

  function persistPayables(nextPayables: Payable[]) {
    localStorage.setItem(PAYABLES_STORAGE_KEY, JSON.stringify(nextPayables));
    setPayables(nextPayables);
  }

  function savePayable() {
    if (!form.description.trim() || Number(form.amount) <= 0 || !form.dueDate) {
      return;
    }

    const payable = formToPayable(form);
    const nextPayables = editingId
      ? payables.map((item) =>
          item.id === editingId ? { ...payable, createdAt: item.createdAt } : item,
        )
      : [...payables, payable];

    persistPayables(nextPayables);
    setForm(emptyForm());
    setEditingId(null);
  }

  function editPayable(payable: Payable) {
    setForm(payableToForm(payable));
    setEditingId(payable.id);
  }

  function updateStatus(payableId: string, status: PayableStatus) {
    persistPayables(
      payables.map((payable) =>
        payable.id === payableId
          ? {
              ...payable,
              status,
              paymentDate: status === "pago" ? getTodayValue() : payable.paymentDate,
            }
          : payable,
      ),
    );
  }

  const filteredPayables = useMemo(
    () =>
      payables.filter((payable) => {
        const effectiveStatus = normalizePayableStatus(payable);
        const matchesStatus =
          statusFilter === "todos" || effectiveStatus === statusFilter;
        const matchesPeriod =
          payable.dueDate >= startDate && payable.dueDate <= endDate;

        return matchesStatus && matchesPeriod;
      }),
    [payables, statusFilter, startDate, endDate],
  );
  const summary = useMemo(() => {
    const next7 = addDays(new Date(), 7).toISOString().slice(0, 10);

    return payables.reduce(
      (totals, payable) => {
        const status = normalizePayableStatus(payable);

        if (status === "previsto") {
          totals.expected += payable.amount;
        }

        if (status === "pago") {
          totals.paid += payable.amount;
        }

        if (status === "atrasado") {
          totals.overdue += payable.amount;
        }

        if (
          status === "previsto" &&
          payable.dueDate >= getTodayValue() &&
          payable.dueDate <= next7
        ) {
          totals.next7 += payable.amount;
        }

        return totals;
      },
      { expected: 0, paid: 0, overdue: 0, next7: 0 },
    );
  }, [payables]);

  return (
    <PageShell
      eyebrow="Contas"
      title="Contas a pagar"
      description="Lance despesas previstas e realizadas para melhorar DRE, caixa e previsoes."
    >
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Previsto" value={formatCurrency(summary.expected)} hint="Em aberto" />
        <MetricCard label="Pago" value={formatCurrency(summary.paid)} hint="Realizado" tone="support" />
        <MetricCard label="Atrasado" value={formatCurrency(summary.overdue)} hint="Exige acao" tone={summary.overdue > 0 ? "risk" : "primary"} />
        <MetricCard label="7 dias" value={formatCurrency(summary.next7)} hint="A vencer" tone="alert" />
      </div>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
              {editingId ? "Editar conta" : "Nova conta"}
            </p>
            <h2 className="mt-1 font-title text-2xl font-bold text-norteia-text">
              {editingId ? "Atualizar lancamento" : "Cadastrar despesa"}
            </h2>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm());
                setEditingId(null);
              }}
              className="h-10 rounded-2xl border border-norteia-line px-4 text-xs font-bold text-norteia-muted"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div className="grid gap-3">
          <Input label="Descricao" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <Input label="Fornecedor" value={form.supplier} onChange={(value) => setForm({ ...form, supplier: value })} />
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
              Categoria DRE
            </span>
            <select
              value={form.dreCategory}
              onChange={(event) =>
                setForm({ ...form, dreCategory: event.target.value as DreCategory })
              }
              className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none"
            >
              {dreCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tipo" value={form.accountType} onChange={(value) => setForm({ ...form, accountType: value })} />
            <Input label="Valor" type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />
            <Input label="Vencimento" type="date" value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} />
            <Input label="Pagamento" type="date" value={form.paymentDate} onChange={(value) => setForm({ ...form, paymentDate: value })} />
          </div>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
              Status
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as PayableStatus })
              }
              className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none"
            >
              {statusOptions.filter((status) => status !== "todos").map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setForm({ ...form, recurring: !form.recurring })}
            className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-left text-sm font-bold text-norteia-text"
          >
            Recorrente: {form.recurring ? "sim" : "nao"}
          </button>
          <Input label="Observacao" value={form.note} onChange={(value) => setForm({ ...form, note: value })} />
          <button
            type="button"
            onClick={savePayable}
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-norteia-primary px-4 text-sm font-bold text-norteia-bg shadow-glow"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {editingId ? "Salvar alteracoes" : "Cadastrar conta"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as PayableStatus | "todos")
            }
            className="h-11 rounded-2xl border border-norteia-line bg-norteia-card-2 px-3 text-xs font-bold text-norteia-text"
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-11 rounded-2xl border border-norteia-line bg-norteia-card-2 px-3 text-xs font-bold text-norteia-text"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-11 rounded-2xl border border-norteia-line bg-norteia-card-2 px-3 text-xs font-bold text-norteia-text"
          />
        </div>
      </section>

      <section className="space-y-3">
        {filteredPayables.map((payable) => {
          const status = normalizePayableStatus(payable);

          return (
            <article
              key={payable.id}
              className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-norteia-text">
                    {payable.description}
                  </p>
                  <p className="mt-1 text-xs text-norteia-muted">
                    {payable.dreCategory} | vence {payable.dueDate}
                  </p>
                  {payable.supplier ? (
                    <p className="mt-1 text-xs text-norteia-muted">
                      {payable.supplier}
                    </p>
                  ) : null}
                </div>
                <strong className="text-right font-title text-xl font-bold text-norteia-primary">
                  {formatCurrency(payable.amount)}
                </strong>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => editPayable(payable)}
                  className="flex h-10 items-center justify-center gap-1 rounded-2xl border border-norteia-line bg-norteia-card-2 text-xs font-bold text-norteia-text"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(payable.id, "pago")}
                  disabled={status === "pago"}
                  className="flex h-10 items-center justify-center gap-1 rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 text-xs font-bold text-norteia-primary disabled:opacity-45"
                >
                  <Check className="h-3.5 w-3.5" />
                  Pago
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(payable.id, "cancelado")}
                  disabled={status === "cancelado"}
                  className="flex h-10 items-center justify-center gap-1 rounded-2xl border border-norteia-risk/35 bg-norteia-risk/10 text-xs font-bold text-norteia-risk disabled:opacity-45"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelar
                </button>
              </div>
            </article>
          );
        })}

        {filteredPayables.length === 0 ? (
          <div className="rounded-2xl border border-norteia-line bg-norteia-card p-4 text-sm text-norteia-muted shadow-soft">
            Nenhuma conta encontrada para os filtros selecionados.
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
        {label}
      </span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none focus:border-norteia-primary"
      />
    </label>
  );
}
