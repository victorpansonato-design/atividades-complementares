import { useLocation } from "react-router-dom";

/** Telas de preenchimento têm a própria barra de ação: a navegação sai do caminho. */
const HIDDEN_ON = [/^\/solicitar\/?$/, /^\/pedidos\/[^/]+\/(corrigir|reconsiderar)\/?$/];

export function useMobileTabBarVisible(): boolean {
   const { pathname } = useLocation();
   return !HIDDEN_ON.some(re => re.test(pathname));
}
