import { normalizeText } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("normalizeText", () => {
   it.each([
      ["  João da SILVA  ", "joao da silva"],
      ["AÇÃO", "acao"],
      ["texto simples", "texto simples"],
   ])("normaliza %j para %j", (input, expected) => {
      expect(normalizeText(input)).toBe(expected);
   });
});
