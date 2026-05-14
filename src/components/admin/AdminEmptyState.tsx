import { Card } from "@/components/ui/card";

export default function AdminEmptyState({ message }: { message: string }) {
  return (
    <Card className="p-6 text-sm text-ink-weak">{message}</Card>
  );
}
