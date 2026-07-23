// Art-directed demo products (one studio look) used by the marketing storefront
// mockup. Real India-authentic photography, optimized webp, lazy-loaded.
export type DemoProduct = { name: string; price: number; compareAt?: number; img: string; tag?: string };

export const demoCatalog: DemoProduct[] = [
  { name: 'Rose Chikankari Kurti', price: 149900, compareAt: 199900, img: '/demo/kurti.webp', tag: 'Trending' },
  { name: 'Oxidised Silver Jhumkas', price: 89900, img: '/demo/jhumka.webp' },
  { name: 'Emerald Embroidered Juttis', price: 169900, img: '/demo/juttis.webp', tag: 'New' },
  { name: 'Block-print Cushion Cover', price: 129900, img: '/demo/cushion.webp' },
];
