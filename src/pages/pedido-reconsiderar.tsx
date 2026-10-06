import { useParams } from "react-router-dom";
import { ReconsiderationView } from "@/features/atividades-complementares";

export default function PedidoReconsiderarPage() {
   const { id = "" } = useParams();
   return <ReconsiderationView key={id} requestId={id} />;
}
