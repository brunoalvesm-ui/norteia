"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { defaultProducts, type Product } from "@/lib/products";
import { PRODUCTS_STORAGE_KEY } from "@/lib/storage-keys";

type ProductForm = {
  id: string;
  name: string;
  category: string;
  salePrice: string;
  estimatedCost: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  id: "",
  name: "",
  category: "",
  salePrice: "",
  estimatedCost: "",
  active: true,
};

function readProducts() {
  const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);

  if (!storedProducts) {
    return defaultProducts;
  }

  try {
    return JSON.parse(storedProducts) as Product[];
  } catch {
    return defaultProducts;
  }
}

function createProductId(name: string) {
  const baseId = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${baseId || "produto"}-${Date.now()}`;
}

function productToForm(product: Product): ProductForm {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    salePrice: String(product.salePrice),
    estimatedCost: String(product.estimatedCost),
    active: product.active,
  };
}

function formToProduct(form: ProductForm): Product {
  return {
    id: form.id || createProductId(form.name),
    name: form.name.trim(),
    category: form.category.trim(),
    salePrice: Number(form.salePrice),
    estimatedCost: Number(form.estimatedCost),
    active: form.active,
  };
}

function calculateMargin(product: Product) {
  const margin = product.salePrice - product.estimatedCost;
  const marginPercent = product.salePrice > 0 ? margin / product.salePrice : 0;

  return { margin, marginPercent };
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setProducts(readProducts());
  }, []);

  const activeProducts = useMemo(
    () => products.filter((product) => product.active),
    [products],
  );
  const inactiveProducts = products.length - activeProducts.length;
  const canSave =
    form.name.trim().length > 0 &&
    form.category.trim().length > 0 &&
    Number(form.salePrice) > 0 &&
    Number(form.estimatedCost) >= 0;

  function persistProducts(nextProducts: Product[]) {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));
    setProducts(nextProducts);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function saveProduct() {
    if (!canSave) {
      return;
    }

    const product = formToProduct(form);
    const nextProducts = editingId
      ? products.map((currentProduct) =>
          currentProduct.id === editingId ? product : currentProduct,
        )
      : [...products, product];

    persistProducts(nextProducts);
    setFeedbackMessage(editingId ? "Produto atualizado" : "Produto cadastrado");
    resetForm();
  }

  function editProduct(product: Product) {
    setForm(productToForm(product));
    setEditingId(product.id);
    setFeedbackMessage(null);
  }

  function toggleProductStatus(productId: string) {
    const nextProducts = products.map((product) =>
      product.id === productId
        ? {
            ...product,
            active: !product.active,
          }
        : product,
    );

    persistProducts(nextProducts);
    setFeedbackMessage("Status do produto atualizado");
  }

  return (
    <PageShell
      eyebrow="Produtos"
      title="Cadastro de produtos"
      description="Atualize nomes, categorias, precos e custos usados nas comandas."
    >
      <div className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            Produtos ativos
          </p>
          <strong className="mt-3 block font-title text-2xl font-bold text-norteia-primary">
            {activeProducts.length}
          </strong>
        </article>
        <article className="rounded-2xl border border-norteia-line bg-norteia-card p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
            Desativados
          </p>
          <strong className="mt-3 block font-title text-2xl font-bold text-norteia-alert">
            {inactiveProducts}
          </strong>
        </article>
      </div>

      {feedbackMessage ? (
        <div className="rounded-2xl border border-norteia-primary/35 bg-norteia-primary/10 p-4 shadow-soft">
          <p className="text-sm font-bold text-norteia-primary">
            {feedbackMessage}
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-norteia-line bg-norteia-card p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
              {editingId ? "Editar produto" : "Novo produto"}
            </p>
            <h2 className="mt-1 font-title text-2xl font-bold text-norteia-text">
              {editingId ? "Ajustar cadastro" : "Cadastrar item"}
            </h2>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="h-10 rounded-2xl border border-norteia-line px-4 text-xs font-bold text-norteia-muted"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
              Nome
            </span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  name: event.target.value,
                }))
              }
              className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none focus:border-norteia-primary"
              placeholder="Ex: Prato executivo"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
              Categoria
            </span>
            <input
              value={form.category}
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  category: event.target.value,
                }))
              }
              className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none focus:border-norteia-primary"
              placeholder="Ex: Pratos, Bebidas, Sobremesas"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
                Preco venda
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salePrice}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    salePrice: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none focus:border-norteia-primary"
                placeholder="32"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-norteia-muted">
                Custo estimado
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedCost}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    estimatedCost: event.target.value,
                  }))
                }
                className="h-12 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text outline-none focus:border-norteia-primary"
                placeholder="14"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              setForm((currentForm) => ({
                ...currentForm,
                active: !currentForm.active,
              }))
            }
            className="flex h-12 items-center justify-between rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text"
          >
            <span>{form.active ? "Produto ativo" : "Produto desativado"}</span>
            {form.active ? (
              <ToggleRight className="h-5 w-5 text-norteia-primary" aria-hidden="true" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-norteia-muted" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={saveProduct}
            disabled={!canSave}
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-norteia-primary px-4 text-sm font-bold text-norteia-bg shadow-glow transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {editingId ? (
              <Save className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {editingId ? "Salvar alteracoes" : "Cadastrar produto"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-norteia-primary">
            Produtos cadastrados
          </p>
          <h2 className="mt-1 font-title text-2xl font-bold text-norteia-text">
            Cardapio operacional
          </h2>
        </div>

        {products.map((product) => {
          const { margin, marginPercent } = calculateMargin(product);

          return (
            <article
              key={product.id}
              className={`rounded-2xl border p-4 shadow-soft ${
                product.active
                  ? "border-norteia-line bg-norteia-card"
                  : "border-norteia-line bg-norteia-card-2 opacity-65"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-norteia-text">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-norteia-muted">
                    {product.category} | ID: {product.id}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    product.active
                      ? "bg-norteia-primary/15 text-norteia-primary"
                      : "bg-norteia-muted/15 text-norteia-muted"
                  }`}
                >
                  {product.active ? "Ativo" : "Desativado"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-norteia-line bg-norteia-card-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-norteia-muted">
                    Venda
                  </p>
                  <strong className="mt-2 block text-sm text-norteia-primary">
                    {formatCurrency(product.salePrice)}
                  </strong>
                </div>
                <div className="rounded-2xl border border-norteia-line bg-norteia-card-2 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-norteia-muted">
                    Custo
                  </p>
                  <strong className="mt-2 block text-sm text-norteia-text">
                    {formatCurrency(product.estimatedCost)}
                  </strong>
                </div>
                <div className="rounded-2xl border border-norteia-primary/25 bg-norteia-primary/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-norteia-primary">
                    Margem R$
                  </p>
                  <strong className="mt-2 block text-sm text-norteia-primary">
                    {formatCurrency(margin)}
                  </strong>
                </div>
                <div className="rounded-2xl border border-norteia-primary/25 bg-norteia-primary/10 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-norteia-primary">
                    Margem %
                  </p>
                  <strong className="mt-2 block text-sm text-norteia-primary">
                    {formatPercent(marginPercent)}%
                  </strong>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => editProduct(product)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-norteia-line bg-norteia-card-2 px-4 text-sm font-bold text-norteia-text"
                >
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleProductStatus(product.id)}
                  className="h-11 rounded-2xl border border-norteia-alert/35 bg-norteia-alert/10 px-4 text-sm font-bold text-norteia-alert"
                >
                  {product.active ? "Desativar" : "Reativar"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </PageShell>
  );
}
