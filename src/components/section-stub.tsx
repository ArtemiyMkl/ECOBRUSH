import { EmptyState, PageHeader } from "@/components/page-header";
import { getTranslations } from "@/lib/i18n/server";
import type { NavKey } from "@/lib/nav";

export async function SectionStub({ section }: { section: NavKey }) {
  const { t } = await getTranslations();

  return (
    <>
      <PageHeader title={t.nav[section]} description={t.stub.title} />
      <EmptyState>{t.stub.body}</EmptyState>
    </>
  );
}
