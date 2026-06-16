import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/lib/auth-context";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ProtectedPortal } from "@/components/portal/ProtectedPortal";

import Home from "@/pages/public/Home";
import About from "@/pages/public/About";
import Healthcare from "@/pages/public/Healthcare";
import Learning from "@/pages/public/Learning";
import Platforms from "@/pages/public/Platforms";
import Government from "@/pages/public/Government";
import Insights from "@/pages/public/Insights";
import InsightArticle from "@/pages/public/InsightArticle";
import Contact from "@/pages/public/Contact";
import Login from "@/pages/portal/Login";
import Register from "@/pages/portal/Register";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PublicSite() {
  return (
    <PublicLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/healthcare" component={Healthcare} />
        <Route path="/learning" component={Learning} />
        <Route path="/platforms" component={Platforms} />
        <Route path="/government" component={Government} />
        <Route path="/insights" component={Insights} />
        <Route path="/insights/:slug" component={InsightArticle} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
    </PublicLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/portal/login" component={Login} />
      <Route path="/portal/register" component={Register} />
      <Route path="/portal" nest>
        <ProtectedPortal />
      </Route>
      <Route component={PublicSite} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
