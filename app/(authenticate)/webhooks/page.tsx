export default function WebhooksPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">Webhooks</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Endpoint list and captured request log will be implemented here using
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">actions/webhooks</code>,
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">lib/webhooks</code>, and
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">components/webhooks</code>.
      </p>
    </div>
  );
}
