import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Scan from "./pages/Scan";
import Result from "./pages/Result";
import SearchPage from "./pages/SearchPage";
import Records from "./pages/Records";
import CompanyDetail from "./pages/CompanyDetail";
import Admin from "./pages/Admin";
import More from "./pages/More";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    {/* BrowserRouter wraps the other providers so anything added below it can use Link,
        useNavigate and useLocation. Nesting it innermost puts every provider outside the
        router, where those hooks throw. Add new providers inside it; keep Routes last. */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/result" element={<Result />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/records" element={<Records />} />
            <Route path="/company/:id" element={<CompanyDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/more" element={<More />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
