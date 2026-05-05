export type Product = {
  id: string;
  name: string;
  category: string;
  salePrice: number;
  estimatedCost: number;
  active: boolean;
};

export const products: Product[] = [
  {
    id: "prato-executivo",
    name: "Prato executivo",
    category: "Pratos",
    salePrice: 32,
    estimatedCost: 14,
    active: true,
  },
  {
    id: "hamburguer",
    name: "Hamburguer",
    category: "Pratos",
    salePrice: 28,
    estimatedCost: 12,
    active: true,
  },
  {
    id: "refrigerante",
    name: "Refrigerante",
    category: "Bebidas",
    salePrice: 8,
    estimatedCost: 3,
    active: true,
  },
  {
    id: "suco-natural",
    name: "Suco natural",
    category: "Bebidas",
    salePrice: 12,
    estimatedCost: 4,
    active: true,
  },
  {
    id: "sobremesa",
    name: "Sobremesa",
    category: "Sobremesas",
    salePrice: 16,
    estimatedCost: 6,
    active: true,
  },
];

export const defaultProducts = products;
