import { EmptyState, PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Товары" description="Каталог и карточки товаров" />
      <EmptyState>Раздел пока пуст — данные подключим на следующем шаге.</EmptyState>
    </>
  );
}
