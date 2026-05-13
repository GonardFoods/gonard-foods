import { getAllProducts } from "@/lib/products-store";
import ProductList from "./ProductList";

export default async function ProductsPage() {
  const products = await getAllProducts();
  return <ProductList products={products} />;
}
