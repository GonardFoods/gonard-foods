import { getPublicProducts } from "@/lib/products-store";
import ProductList from "./ProductList";

export default async function ProductsPage() {
  const products = await getPublicProducts();
  return <ProductList products={products} />;
}
