import { PageHeader, Panel, PrimaryButton, Notice } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { changePasswordAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  return (
    <main>
      <PageHeader title="Password" lead={`Signed in as ${user.email}. Changing the password signs you out so you can sign in again.`} />
      {query.error ? <Notice kind="error">{query.error}</Notice> : null}
      <Panel>
        <form action={changePasswordAction} className="grid max-w-md gap-4">
          <label className="text-sm font-semibold">Current password<input className="mt-1 w-full rounded-xl border px-3 py-3" name="current" type="password" required /></label>
          <label className="text-sm font-semibold">New password<input className="mt-1 w-full rounded-xl border px-3 py-3" name="next" type="password" required /></label>
          <PrimaryButton>Save password</PrimaryButton>
        </form>
      </Panel>
    </main>
  );
}
