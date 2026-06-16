import { useGetMeridianNetworkAdequacy } from "@workspace/api-client-react";
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

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "Adequate") return "default";
  if (status === "At risk") return "secondary";
  return "destructive";
}

export default function MeridianNetworkAdequacy() {
  const { data: reviews, isLoading } = useGetMeridianNetworkAdequacy();

  if (isLoading) return <div className="p-8">Loading...</div>;

  const list = reviews ?? [];
  const adequate = list.filter((r) => r.status === "Adequate").length;
  const atRisk = list.filter((r) => r.status === "At risk").length;
  const deficient = list.filter((r) => r.status === "Deficient").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Network Adequacy</h1>
        <p className="text-muted-foreground mt-1">
          Required versus actual provider counts by region and specialty.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Adequate</div>
            <div className="mt-1 text-2xl font-bold">{adequate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">At risk</div>
            <div className="mt-1 text-2xl font-bold">{atRisk}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Deficient</div>
            <div className="mt-1 text-2xl font-bold">{deficient}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.region}</TableCell>
                  <TableCell>{r.specialty}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.requiredProviders}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.actualProviders}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.notes ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
