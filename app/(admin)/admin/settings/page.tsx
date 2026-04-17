"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield } from "lucide-react";

export default function AdminSettingsPage() {
  const profile = useQuery(api.users.getMyProfile);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Admin Settings
      </h1>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Admin Profile</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{profile?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium text-primary">Platform Admin</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Platform Configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            API keys, MSG91 templates, Resend configuration, and platform alert defaults
            will be managed here in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
