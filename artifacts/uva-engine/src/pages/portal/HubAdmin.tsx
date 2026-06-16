import { usePageMeta } from "@/lib/seo";
import {
  useListAdminUsers,
  getListAdminUsersQueryKey,
  useListAdminSubmissions,
  getListAdminSubmissionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProduct } from "@/lib/products";
import { format, parseISO } from "date-fns";

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function HubAdmin() {
  usePageMeta("Hub admin", "Administrative overview of users and submissions.");

  const { data: users, isLoading: loadingUsers } = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey() },
  });
  const { data: submissions, isLoading: loadingSubs } = useListAdminSubmissions({
    query: { queryKey: getListAdminSubmissionsQueryKey() },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Read-only overview across every product. Manage roles and product
          assignment directly in the database for now.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            Users{users ? ` (${users.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions{submissions ? ` (${submissions.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All users</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <TableSkeleton />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => {
                      const p = getProduct(u.productKey);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: p?.accent ?? "#94a3b8" }}
                                aria-hidden="true"
                              />
                              {p?.name ?? u.productKey}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.role === "admin" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.organization || "-"}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {format(parseISO(u.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact and portal submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSubs ? (
                <TableSkeleton />
              ) : submissions?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No submissions yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions?.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(parseISO(s.createdAt), "MMM d")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {s.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.areaOfInterest}
                        </TableCell>
                        <TableCell
                          className="max-w-xs truncate text-muted-foreground"
                          title={s.message}
                        >
                          {s.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
