import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/authentication/session";

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword) redirect("/admin/change-password");
  return user;
}
