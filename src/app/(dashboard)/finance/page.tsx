import { EmptyState, PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Финансы" description="Транзакции и выплаты" />
      <EmptyState>Раздел пока пуст — данные подключим на следующем шаге.</EmptyState>
    </>
  );
}
