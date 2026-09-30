import { EmptyState, PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Аналитика" description="Показы, конверсия, заказы" />
      <EmptyState>Раздел пока пуст — данные подключим на следующем шаге.</EmptyState>
    </>
  );
}
