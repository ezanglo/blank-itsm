import { buildRequestContext, hasPermission, requirePermission } from "@/lib/auth/context";
import { UserRepository } from "@/lib/repositories/userRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { revalidatePath } from "next/cache";

async function inviteUser(formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();

  const email = formData.get("email") as string;
  const roleKey = formData.get("role") as "requester" | "agent" | "admin";

  if (!email || !roleKey) {
    throw new Error("Missing required fields");
  }

  await UserRepository.inviteUser(ctx, { email, roleKey });
  revalidatePath("/admin/users");
}

async function changeMemberRole(formData: FormData) {
  "use server";

  const ctx = await buildRequestContext();
  const membershipId = String(formData.get("membershipId") ?? "");
  const roleKey = formData.get("role") as "requester" | "agent" | "admin";
  if (!membershipId || !roleKey) {
    throw new Error("Missing required fields");
  }

  await UserRepository.changeRole(ctx, membershipId, roleKey);
  revalidatePath("/admin/users");
}

export default async function UsersPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");

  const members = await UserRepository.listMembers(ctx);
  const canInvite = hasPermission(ctx, "user:invite");
  const canChangeRole = hasPermission(ctx, "user:role_change");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite User</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={inviteUser} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="w-full sm:w-[200px] space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select name="role" required defaultValue="requester">
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requester">Requester</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Invite</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can view members but cannot invite users (missing <code>user:invite</code>).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {canChangeRole && <TableHead>Change role</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.user.name || "—"}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {member.role.key}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  {canChangeRole && (
                    <TableCell>
                      {member.userId === ctx.userId ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : member.status === "active" ? (
                        <form action={changeMemberRole} className="flex items-center gap-2">
                          <input type="hidden" name="membershipId" value={member.id} />
                          <Select name="role" defaultValue={member.role.key}>
                            <SelectTrigger className="h-8 w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="requester">Requester</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" variant="outline">Apply</Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
