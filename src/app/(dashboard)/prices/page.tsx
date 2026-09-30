import { EmptyState, PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Цены" description="Цены, скидки и наценка" />
      <EmptyState>Раздел пока пуст — данные подключим на следующем шаге.</EmptyState>
    </>
  );
}
