import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";

type ThemeState = {
   theme: Theme;
   setTheme: (theme: Theme) => void;
   toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
   persist(
      (set, get) => ({
         theme: "system",
         setTheme: theme => set({ theme }),
         toggleTheme: () => {
            const { theme, setTheme } = get();
            setTheme(theme === "dark" ? "light" : "dark");
         },
      }),
      {
         name: "app-theme",
         storage: createJSONStorage(() => localStorage),
      },
   ),
);

if (typeof window !== "undefined") {
   const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

   function applyTheme(theme: Theme) {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      if (theme === "system") {
         root.classList.add(mediaQuery.matches ? "dark" : "light");
      } else {
         root.classList.add(theme);
      }
   }

   applyTheme(useThemeStore.getState().theme);
   useThemeStore.subscribe(state => applyTheme(state.theme));
   mediaQuery.addEventListener("change", () => {
      if (useThemeStore.getState().theme === "system") {
         applyTheme("system");
      }
   });
}
