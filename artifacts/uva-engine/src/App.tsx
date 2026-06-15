import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Shell } from "@/components/layout/Shell";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Projects from "@/pages/Projects";
import NewProject from "@/pages/NewProject";
import ProjectDetail from "@/pages/ProjectDetail";
import ProjectIntake from "@/pages/ProjectIntake";
import ProjectDesign from "@/pages/ProjectDesign";
import ProjectPrototype from "@/pages/ProjectPrototype";
import ProjectProduction from "@/pages/ProjectProduction";
import ProjectQA from "@/pages/ProjectQA";
import ProjectHandoff from "@/pages/ProjectHandoff";
import Standards from "@/pages/Standards";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/projects" component={Projects} />
        <Route path="/projects/new" component={NewProject} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects/:id/intake" component={ProjectIntake} />
        <Route path="/projects/:id/design" component={ProjectDesign} />
        <Route path="/projects/:id/prototype" component={ProjectPrototype} />
        <Route path="/projects/:id/production" component={ProjectProduction} />
        <Route path="/projects/:id/qa" component={ProjectQA} />
        <Route path="/projects/:id/handoff" component={ProjectHandoff} />
        <Route path="/standards" component={Standards} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
