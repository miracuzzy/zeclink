import { redirect } from "next/navigation";

// Tip jars are now payment links with an open amount, made on /new.
export default function TipRedirect() {
  redirect("/new");
}
