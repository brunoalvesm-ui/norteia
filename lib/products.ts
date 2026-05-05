export type Product = {
  id: string;
  name: string;
  price: number;
};

export const products: Product[] = [
  {
    id: "prato-executivo",
    name: "Prato executivo",
    price: 32,
  },
  {
    id: "hamburguer",
    name: "Hamburguer",
    price: 28,
  },
  {
    id: "refrigerante",
    name: "Refrigerante",
    price: 8,
  },
  {
    id: "suco-natural",
    name: "Suco natural",
    price: 12,
  },
  {
    id: "sobremesa",
    name: "Sobremesa",
    price: 16,
  },
];
