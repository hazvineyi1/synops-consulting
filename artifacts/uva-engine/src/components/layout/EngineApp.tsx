import { Switch, Route } from "wouter";
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
import NotFound from "@/pages/not-found";

/**
 * The institution-agnostic curriculum engine. Mounted behind the client-portal
 * auth gate at /portal/engine via wouter's `nest`, so every Link inside the
 * engine (and its Shell) resolves relative to that base automatically.
 */
export function EngineApp() {
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
