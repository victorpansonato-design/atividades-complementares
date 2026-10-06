import { PageHeader } from "@/components/ui/page-header";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("PageHeader", () => {
   it("expõe o título como cabeçalho principal", () => {
      render(<PageHeader title="Usuários" />);

      expect(screen.getByRole("heading", { level: 1, name: "Usuários" })).toBeInTheDocument();
   });

   it("renderiza descrição e ação quando informadas", () => {
      render(
         <PageHeader
            title="Usuários"
            description="Gerencie os usuários do sistema."
            actions={<button type="button">Adicionar usuário</button>}
         />,
      );

      expect(screen.getByText("Gerencie os usuários do sistema.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Adicionar usuário" })).toBeInTheDocument();
   });
});
