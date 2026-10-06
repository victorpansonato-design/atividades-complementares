import { useParams } from "react-router-dom";
import { CorrectionView } from "@/features/atividades-complementares";

export default function PedidoCorrigirPage() {
   const { id = "" } = useParams();
   return <CorrectionView key={id} requestId={id} />;
}
