import { buildRequestContext, hasPermission, requirePermission } from "@/lib/auth/context";
import { SlaRepository } from "@/lib/repositories/slaRepository";
import {
  businessHoursFromFormData,
  businessHoursToFormDefaults,
  minutesToTime,
} from "@/lib/admin/businessHoursForm";
import { WEEKDAY_LABELS } from "@/lib/domain/businessHours";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { revalidatePath } from "next/cache";

async function saveSlaSettings(formData: FormData) {
  "use server";
  const ctx = await buildRequestContext();
  requirePermission(ctx, "sla:manage");

  const escalationEmail = String(formData.get("escalationEmail") ?? "").trim();
  await SlaRepository.upsert(ctx, {
    timezone: String(formData.get("timezone") ?? "UTC"),
    businessHours: businessHoursFromFormData(formData),
    escalationEmail: escalationEmail || null,
  });
  revalidatePath("/admin/sla");
}

async function sendEscalationTest() {
  "use server";
  const ctx = await buildRequestContext();
  await SlaRepository.sendEscalationTest(ctx);
  revalidatePath("/admin/sla");
}

export default async function SlaAdminPage() {
  const ctx = await buildRequestContext();
  requirePermission(ctx, "admin:access");
  if (!hasPermission(ctx, "sla:manage")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to manage SLA settings.
      </p>
    );
  }

  const settings = await SlaRepository.getForOrg(ctx.orgId);
  const calendar = businessHoursToFormDefaults(settings?.businessHours);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">SLA &amp; Business Hours</h1>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>
            SLA due dates count only enabled days (UTC). Tickets created before settings use
            wall-clock minutes until you save a calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveSlaSettings} className="space-y-6">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="timezone">Timezone label</Label>
              <Input id="timezone" name="timezone" defaultValue={calendar.timezone} />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Weekly schedule</p>
              {calendar.days.map((day, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                >
                  <label className="flex items-center gap-2 min-w-[72px]">
                    <input
                      type="checkbox"
                      name={`day_${index}_enabled`}
                      defaultChecked={day.enabled}
                    />
                    <span className="text-sm">{WEEKDAY_LABELS[index]}</span>
                  </label>
                  <Input
                    name={`day_${index}_start`}
                    type="time"
                    className="w-[120px]"
                    defaultValue={minutesToTime(day.startMinute)}
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    name={`day_${index}_end`}
                    type="time"
                    className="w-[120px]"
                    defaultValue={minutesToTime(day.endMinute)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="escalationEmail">Escalation email</Label>
              <Input
                id="escalationEmail"
                name="escalationEmail"
                type="email"
                placeholder="sla-escalations@example.com"
                defaultValue={settings?.escalationEmail ?? ""}
              />
              <p className="text-sm text-muted-foreground">
                Breached or at-risk tickets enqueue one escalation message to this address (mock
                outbox in dev).
              </p>
            </div>

            <Button type="submit">Save SLA settings</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test escalation email</CardTitle>
          <CardDescription>
            Sends a sample message through the email outbox (written to{" "}
            <code className="text-xs">.data/email-outbox</code> locally).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sendEscalationTest}>
            <Button type="submit" variant="outline">Send test escalation</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
