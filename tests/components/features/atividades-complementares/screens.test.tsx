import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { BagagensView, RequestDetailView, RequestWizard, TrackingView } from "@/features/atividades-complementares";
import { STORAGE_KEY } from "@/features/atividades-complementares/mock/mock-state";

beforeEach(() => {
   localStorage.removeItem(STORAGE_KEY);
   // jsdom não implementa matchMedia/scroll usados por componentes de layout (aqui: layout de celular).
   window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never;
   Element.prototype.scrollIntoView ??= () => {};
   globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
   } as never;
});

function renderAt(path: string, routes: { path: string; element: React.ReactNode }[]) {
   const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
   const router = createMemoryRouter(routes, { initialEntries: [path] });
   render(
      <QueryClientProvider client={client}>
         <RouterProvider router={router} />
      </QueryClientProvider>,
   );
   return router;
}

const wizardRoutes = [{ path: "/solicitar", element: <RequestWizard /> }];

async function chooseActivity(name: RegExp) {
   fireEvent.click(await screen.findByRole("button", { name }, { timeout: 5000 }));
   fireEvent.click(await screen.findByRole("button", { name: /Continuar com esta atividade/ }));
   return screen.findByRole("heading", { name: "Conte sobre a atividade" });
}

describe("Acompanhamento", () => {
   it("mostra as horas no mesmo modelo do portal; análise fica fora da barra", async () => {
      renderAt("/", [{ path: "/", element: <TrackingView /> }]);
      expect(await screen.findByText("16%", {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByRole("progressbar", { name: "Horas cumpridas" })).toHaveAttribute("aria-valuenow", "16");
      const stat = (label: string) => screen.getByText(label).closest("div")!;
      expect(within(stat("Cumpridas")).getByText("26h")).toBeInTheDocument();
      expect(within(stat("Exigidas")).getByText("160h")).toBeInTheDocument();
      expect(within(stat("Restantes")).getByText("134h")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /30h em análise/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /1 item precisa de você/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /O que conta como hora/ })).toBeInTheDocument();
   });

   it("agrupa por situação sem duplicar e só mostra ação onde há ação", async () => {
      renderAt("/", [{ path: "/", element: <TrackingView /> }]);
      const precisa = await screen.findByRole("region", { name: /Precisa de você/ }, { timeout: 5000 });
      expect(within(precisa).getByRole("link", { name: /Corrigir agora/ })).toBeInTheDocument();
      expect(screen.getAllByText("Curso de extensão: comunicação e carreira")).toHaveLength(1);
      const auto = screen.getByText("Semana acadêmica de gestão").closest("article")!;
      expect(within(auto).getByText("Registrada pela instituição")).toBeInTheDocument();
      expect(within(auto).queryByRole("link", { name: /Corrigir|reconsideração/ })).toBeNull();
   });

   it("filtra pela URL e oferece limpar filtros", async () => {
      renderAt("/?situacao=nao-aprovadas&busca=inexistente", [{ path: "/", element: <TrackingView /> }]);
      expect(await screen.findByText("Nenhum pedido encontrado.", {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
   });
});

describe("Detalhe", () => {
   it("aprovação parcial explica solicitadas x aprovadas", async () => {
      renderAt("/pedidos/B01", [{ path: "/pedidos/:id", element: <RequestDetailView requestId="B01" /> }]);
      expect(await screen.findByText("Aprovada parcialmente", {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByText(/Foram aprovadas 1h de 10h solicitadas/)).toBeInTheDocument();
      expect(screen.getByText("1h de 10h")).toBeInTheDocument();
   });

   it("registro automático mostra evento e não inventa saldo", async () => {
      renderAt("/pedidos/B05", [{ path: "/pedidos/:id", element: <RequestDetailView requestId="B05" /> }]);
      expect(await screen.findByText("Registrada automaticamente pela instituição", {}, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByText("EV-MOCK-B05")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Mais detalhes" }));
      expect(await screen.findByText(/não tem regra de limite disponível/)).toBeInTheDocument();
   });
});

describe("Solicitação", () => {
   it("começa no passo 1 com atalhos das atividades mais comuns", async () => {
      renderAt("/solicitar", wizardRoutes);
      expect(await screen.findByRole("heading", { name: "O que você fez?" }, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Palestra, congresso ou oficina/ })).toBeInTheDocument();
      expect(screen.getByText("Passo 1 de 3")).toBeInTheDocument();
   });

   it("busca sem acento e mostra o saldo do tipo antes de continuar", async () => {
      renderAt("/solicitar", wizardRoutes);
      const search = await screen.findByLabelText("Buscar atividade", {}, { timeout: 5000 });
      fireEvent.change(search, { target: { value: "estagio" } });
      expect(screen.getByRole("button", { name: /Estágio não obrigatório/ })).toBeInTheDocument();
      fireEvent.change(search, { target: { value: "curso online com tempo" } });
      expect(screen.getByRole("button", { name: /Curso online com tempo de acesso.*Até 30h disponíveis/ })).toBeInTheDocument();
   });

   it("calcula sozinho as horas a partir do comprovante", async () => {
      renderAt("/solicitar", wizardRoutes);
      await chooseActivity(/Palestra, congresso ou oficina/);
      fireEvent.change(screen.getByLabelText("Horas", { selector: "#ac-certificate-hours" }), { target: { value: "3" } });
      expect(await screen.findByText("Você vai solicitar")).toBeInTheDocument();
      expect(screen.getByText("3h")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Quero solicitar menos horas" }));
      expect(await screen.findByLabelText("Horas", { selector: "#ac-requested-hours" })).toBeInTheDocument();
   });

   it("publicação: sem campo de comprovante e com o máximo explicado antes da digitação", async () => {
      renderAt("/solicitar", wizardRoutes);
      const search = await screen.findByLabelText("Buscar atividade", {}, { timeout: 5000 });
      fireEvent.change(search, { target: { value: "publicacao periodico" } });
      await chooseActivity(/Publicação em periódico ou anais/);
      await waitFor(() => expect(screen.getByText("Você pode pedir até 20h neste pedido.")).toBeInTheDocument());
      expect(screen.queryByText("Horas que aparecem no comprovante")).toBeNull();
   });

   it("fluxo com anexo chega à revisão (não avança enquanto o arquivo é preparado)", async () => {
      renderAt("/solicitar", wizardRoutes);
      await chooseActivity(/Palestra, congresso ou oficina/);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(["%PDF-1.4 conteúdo"], "certificado.pdf", { type: "application/pdf" })] } });
      expect(await screen.findByRole("button", { name: /Aguarde o arquivo/ })).toBeDisabled();
      fireEvent.change(screen.getByLabelText(/Nome do curso, evento ou atividade/), { target: { value: "Semana de Gestão" } });
      fireEvent.change(screen.getByLabelText(/Instituição ou empresa organizadora/), { target: { value: "UniAnchieta" } });
      fireEvent.change(screen.getByLabelText(/Data da atividade/), { target: { value: "2026-09-15" } });
      fireEvent.change(document.getElementById("ac-certificate-hours")!, { target: { value: "4" } });
      expect(await screen.findByText("Anexado", {}, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.getByText(/Período da atividade:/)).toHaveTextContent("2026 / 2");
      fireEvent.click(screen.getByRole("button", { name: /^Continuar/ }));
      expect(await screen.findByRole("heading", { name: "Revise e envie" }, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.getByText("4h solicitadas", { exact: false })).toBeInTheDocument();
   }, 30000);

   it("busca por bagagem explica que as horas entram sozinhas", async () => {
      renderAt("/solicitar", wizardRoutes);
      fireEvent.change(await screen.findByLabelText("Buscar atividade", {}, { timeout: 5000 }), { target: { value: "bagagem" } });
      expect(screen.getByText("Bagagens não precisam ser solicitadas.")).toBeInTheDocument();
   });
});

describe("Bagagens", () => {
   it("explica em poucas linhas e leva direto ao AVA", () => {
      renderAt("/bagagens", [{ path: "/bagagens", element: <BagagensView /> }]);
      expect(screen.getByRole("heading", { name: "Cursos gratuitos que valem 15 horas cada" })).toBeInTheDocument();
      const cta = screen.getByRole("link", { name: /Fazer uma Bagagem no AVA/ });
      expect(cta).toHaveAttribute("href", "https://ava.anchieta.br/d2l/le/discovery/view/");
      expect(cta).toHaveAttribute("target", "_blank");
      expect(screen.getByText(/as 15 horas entram sozinhas no seu histórico no final do semestre/)).toBeInTheDocument();
   });
});
