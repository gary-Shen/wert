'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { commitSnapshot, prepareSnapshotDraft, AssetSnapshotDraft } from "@/lib/actions/snapshot"
import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

export function SnapWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState<"LOADING" | "REVIEW" | "SAVING">("LOADING");
  const [drafts, setDrafts] = useState<AssetSnapshotDraft[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setStep("LOADING");
      prepareSnapshotDraft().then(data => {
        setDrafts(data);
        setStep("REVIEW");
      });
    }
  }, [open]);

  const handleUpdateValue = (assetId: string, newVal: string) => {
    const val = parseFloat(newVal);
    setDrafts(ds => ds.map(d => d.assetId === assetId ? { ...d, currentValue: isNaN(val) ? 0 : val, isDirty: true } : d));
  }

  const handleSave = () => {
    setStep("SAVING");
    startTransition(async () => {
      const records = drafts.map(d => ({
        assetId: d.assetId,
        value: d.currentValue
      }));
      await commitSnapshot(date, records, "User Snapshot");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Take a Snapshot</DialogTitle>
          <DialogDescription>Review and update your asset values for {date}.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {step === "LOADING" && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {step === "REVIEW" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div className="space-y-4">
                {drafts.map(asset => (
                  <div key={asset.assetId} className="flex items-center gap-4 border p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.type} • {asset.currency}</div>
                      {asset.calculatedValue !== asset.previousValue && (
                        <div className="text-xs text-blue-500 mt-1">
                          Auto-calculated: {asset.calculatedValue.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="w-40">
                      <Input
                        type="number"
                        value={asset.currentValue}
                        onChange={e => handleUpdateValue(asset.assetId, e.target.value)}
                        className={asset.isDirty ? "border-primary bg-primary/5" : ""}
                      />
                    </div>
                  </div>
                ))}
                {drafts.length === 0 && <div className="text-center text-muted-foreground">No active assets found. Go to Settings to add them.</div>}
              </div>
            </div>
          )}

          {step === "SAVING" && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <span className="ml-2">Saving Snapshot...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "REVIEW" && (
            <Button onClick={handleSave} disabled={drafts.length === 0}>Confirm Snapshot</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
