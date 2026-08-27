import { Toaster } from "sonner";
import AppRouter from "./app/router/AppRouter";

function App() {
  return (
    <>
      <AppRouter />
      <Toaster richColors closeButton position="top-right" />
    </>
  );
}

export default App;
