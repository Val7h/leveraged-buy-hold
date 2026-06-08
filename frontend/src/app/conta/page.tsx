import { redirect } from "next/navigation";

// /conta -> redirect para o primeiro tab (perfil).
// A pagina-mae nao tem conteudo proprio; cada secao vive em sua subrota.
export default function ContaIndexPage() {
  redirect("/conta/perfil");
}
