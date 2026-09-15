"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BrandingValues = {
  logoUrl: string;
  primary: string;
  primaryForeground: string;
};

export function BrandingAdminForm({
  initial,
  saveAction,
}: {
  initial: BrandingValues;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Customize Appearance</CardTitle>
          <CardDescription>
            Logo and colors apply to the portal and agent workspace after you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                value={values.logoUrl}
                onChange={(e) => setValues((v) => ({ ...v, logoUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary">Primary Color</Label>
              <Input
                id="primary"
                name="primary"
                type="text"
                placeholder="hsl(221, 83%, 53%)"
                value={values.primary}
                onChange={(e) => setValues((v) => ({ ...v, primary: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryForeground">Primary Foreground</Label>
              <Input
                id="primaryForeground"
                name="primaryForeground"
                type="text"
                placeholder="hsl(0, 0%, 100%)"
                value={values.primaryForeground}
                onChange={(e) =>
                  setValues((v) => ({ ...v, primaryForeground: e.target.value }))
                }
              />
            </div>

            <Button type="submit">Save Branding</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
          <CardDescription>Approximates the portal header and primary button.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border bg-background"
            style={
              {
                "--primary": values.primary || undefined,
                "--primary-foreground": values.primaryForeground || undefined,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              {values.logoUrl ? (
                <img src={values.logoUrl} alt="" className="h-8 max-w-[160px] object-contain" />
              ) : (
                <span className="font-semibold">Service Portal</span>
              )}
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">
                Requesters see your branding on every portal page.
              </p>
              <button
                type="button"
                className="rounded-2xl px-4 py-2 text-sm font-medium text-primary-foreground"
                style={{
                  backgroundColor: values.primary || "hsl(221, 83%, 53%)",
                  color: values.primaryForeground || "hsl(0, 0%, 100%)",
                }}
              >
                Submit ticket
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
