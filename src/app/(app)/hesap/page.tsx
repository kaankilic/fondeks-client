import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DeleteAccountForm } from "@/components/auth/DeleteAccountForm";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";

const TITLE = "Hesap Ayarları";
const DESCRIPTION =
  "Hesabını yönet; dilediğin an hesabını silebilir ve KVKK haklarını kullanabilirsin.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?next=/hesap");

  return (
    <Page>
      <SubHeader title={TITLE} subtitle={user.email} />
      <PageBody>
        <DeleteAccountForm />
      </PageBody>
    </Page>
  );
}
