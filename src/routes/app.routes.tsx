import { env } from "@/config/env";
import MainLayout from "@/layout/main-layout";
import AcompanhamentoPage from "@/pages/acompanhamento";
import AjudaPage from "@/pages/ajuda";
import BagagensPage from "@/pages/bagagens";
import EntradaPortalPage from "@/pages/entrada-portal";
import NotFoundPage from "@/pages/not-found";
import PedidoPage from "@/pages/pedido";
import PedidoCorrigirPage from "@/pages/pedido-corrigir";
import PedidoReconsiderarPage from "@/pages/pedido-reconsiderar";
import SolicitarPage from "@/pages/solicitar";
import RootLayout from "@/routes/root-layout";
import SessionGate from "@/routes/session-gate";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

/** Basename sem barra final: "/atividades-complementares/" → "/atividades-complementares". */
const ROUTER_BASENAME = env.baseUrl.replace(/\/+$/, "") || "/";

/**
 * Data router (necessário para confirmar a saída de formulários com `useBlocker`).
 * Rotas relativas ao basename. `/entrada-portal` é a entrada local de demonstração
 * que representa o botão "Solicitar horas" do portal; não faz parte do módulo.
 */
const router = createBrowserRouter(
   [
      {
         element: <RootLayout />,
         children: [
            { path: "entrada-portal", element: <EntradaPortalPage /> },
            {
               element: <SessionGate />,
               children: [
                  {
                     element: <MainLayout />,
                     children: [
                        { index: true, element: <AcompanhamentoPage /> },
                        { path: "solicitar", element: <SolicitarPage /> },
                        { path: "pedidos/:id", element: <PedidoPage /> },
                        { path: "pedidos/:id/corrigir", element: <PedidoCorrigirPage /> },
                        { path: "pedidos/:id/reconsiderar", element: <PedidoReconsiderarPage /> },
                        { path: "ajuda", element: <AjudaPage /> },
                        { path: "bagagens", element: <BagagensPage /> },
                        { path: "*", element: <NotFoundPage /> },
                     ],
                  },
               ],
            },
         ],
      },
   ],
   { basename: ROUTER_BASENAME },
);

export default function AppRoute() {
   return <RouterProvider router={router} />;
}
