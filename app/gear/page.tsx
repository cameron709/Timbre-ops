import { PackageCheck } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function GearPage() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Gear</h1>
          <p>Inventory is intentionally waiting for a real schema.</p>
        </div>
      </header>
      <EmptyState
        icon={PackageCheck}
        title="Gear inventory is not built yet"
        body="This milestone uses job pack lists only. No invented inventory records are shown here."
      />
    </main>
  );
}
