import { redirect } from "next/navigation";

/**
 * /staff → the plan-de-salle is the canonical home for the POS.
 */
export default function StaffIndexPage() {
  redirect("/staff/tables");
}
