import { redirect } from "next/navigation";
import { ADMIN_SHELL_HOME } from "@/lib/navigation/shell-nav";

export default function AdminPage() {
  redirect(ADMIN_SHELL_HOME);
}
