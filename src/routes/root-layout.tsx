import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export default function RootLayout() {
   return (
      <>
         <Toaster position="top-center" closeButton />
         <Outlet />
      </>
   );
}
