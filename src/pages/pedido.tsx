import { useParams } from "react-router-dom";
import { RequestDetailView } from "@/features/atividades-complementares";

export default function PedidoPage() {
   const { id = "" } = useParams();
   return <RequestDetailView key={id} requestId={id} />;
}
