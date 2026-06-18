import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import { Database, Key, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { data: keys, isLoading: keysLoading } = useQuery<any[]>({ queryKey: ["/api/keys"] });
  const { data: subs, isLoading: subsLoading } = useQuery<any[]>({ queryKey: ["/api/subscriptions"] });

  const generateKeyMutation = useMutationWithToast<any, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/keys`);
      return res.json();
    },
    invalidateKeys: [["/api/keys"]],
    successMessage: { title: "API Key Generated", description: "Save this raw key securely." },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-2xl font-bold mb-8">Developer Dashboard</h1>

      <Card className="p-6 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Key className="w-5 h-5" /> Your API Keys
          </h2>
          <Button onClick={() => generateKeyMutation.mutate()} disabled={generateKeyMutation.isPending}>
            Generate New API Key
          </Button>
        </div>
        
        {generateKeyMutation.data?.rawKey && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded text-yellow-700 dark:text-yellow-400">
            <strong>IMPORTANT:</strong> Here is your new raw API key. It will only be shown once!
            <code className="block mt-2 p-2 bg-black/10 rounded break-all">{generateKeyMutation.data.rawKey}</code>
          </div>
        )}
        
        <div className="space-y-3">
          {keysLoading ? <p>Loading...</p> : keys?.length === 0 ? <p className="text-muted-foreground text-sm">No API keys generated yet.</p> : keys?.map((k: any) => (
            <div key={k.id} className="flex items-center justify-between p-3 border rounded bg-background">
              <span className="font-mono text-sm">{k.prefix}</span>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" /> Active Subscriptions & Neon Databases
        </h2>
        <div className="space-y-3">
          {subsLoading ? <p>Loading...</p> : subs?.length === 0 ? <p className="text-muted-foreground text-sm">No active subscriptions. Go to the Market to subscribe.</p> : subs?.map((s: any) => (
            <div key={s.id} className="p-4 border rounded bg-background space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-lg">Subscription Active</strong>
                  <div className="text-xs text-muted-foreground mt-1">Plan ID: {s.planId}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">Renews {new Date(s.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium mb-1">Your Isolated Neon Database URI:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all text-primary">
                  {s.connectionString || "postgres://user:pass@ep-isolated-db.us-east-2.aws.neon.tech/main"}
                </code>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
