import { EmptyState, PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <>
      <PageHeader title="Покупатели" description="Отзывы, вопросы и чаты" />
      <EmptyState>Раздел пока пуст — данные подключим на следующем шаге.</EmptyState>
    </>
  );
}
