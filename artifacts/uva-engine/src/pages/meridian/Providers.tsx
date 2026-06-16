import { useGetMeridianProviders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function networkVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "In-network") return "default";
  if (status === "Pending") return "secondary";
  return "outline";
}

export default function MeridianProviders() {
  const { data: providers, isLoading } = useGetMeridianProviders();

  if (isLoading) return <div className="p-8">Loading...</div>;

  const list = providers ?? [];
  const inNetwork = list.filter((p) => p.networkStatus === "In-network").length;
  const accepting = list.filter((p) => p.acceptingPatients).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
        <p className="text-muted-foreground mt-1">
          Network provider directory. Synthetic demo data, no real provider records.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total providers</div>
            <div className="mt-1 text-2xl font-bold">{list.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">In-network</div>
            <div className="mt-1 text-2xl font-bold">{inNetwork}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Accepting patients</div>
            <div className="mt-1 text-2xl font-bold">{accepting}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Network status</TableHead>
                <TableHead>Accepting patients</TableHead>
                <TableHead className="text-right">Panel size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.specialty}</TableCell>
                  <TableCell>{p.region}</TableCell>
                  <TableCell>
                    <Badge variant={networkVariant(p.networkStatus)}>{p.networkStatus}</Badge>
                  </TableCell>
                  <TableCell>{p.acceptingPatients ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.panelSize.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
