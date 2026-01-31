'use client'

import { deleteAsset, archiveAsset, unarchiveAsset } from "@/app/actions/assets";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { AssetEditModal } from "@/components/settings/AssetEditModal";
import { cn } from "@/lib/utils";

interface AssetManagementCompactProps {
  initialAssets: any[];
  onAssetsChange?: () => void;
}

export function AssetManagementCompact({ initialAssets, onAssetsChange }: AssetManagementCompactProps) {
  const [isPending, startTransition] = useTransition();
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const activeAssets = initialAssets.filter(a => !a.isArchived);
  const archivedAssets = initialAssets.filter(a => a.isArchived);

  return (
    <div className="space-y-4">
      {/* Active Assets */}
      <div className="space-y-1">
        {activeAssets.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            暂无活跃资产
          </div>
        )}
        {activeAssets.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{asset.name}</div>
              <div className="text-xs text-muted-foreground">
                {asset.category} · {asset.currency}
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditingAssetId(asset.id)}
                disabled={isPending}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => startTransition(async () => {
                  await archiveAsset(asset.id);
                  onAssetsChange?.();
                })}
                disabled={isPending}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销。&quot;{asset.name}&quot; 的历史数据也将被清除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={() => startTransition(async () => {
                      await deleteAsset(asset.id);
                      onAssetsChange?.();
                    })}>删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {/* Archived Assets */}
      {archivedAssets.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">已归档</div>
          <div className="space-y-1">
            {archivedAssets.map((asset) => (
              <div
                key={asset.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  "bg-muted/30 opacity-60 hover:opacity-100 transition-opacity"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{asset.name}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => startTransition(async () => {
                    await unarchiveAsset(asset.id);
                    onAssetsChange?.();
                  })}
                  disabled={isPending}
                >
                  <ArchiveRestore className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AssetEditModal
        assetId={editingAssetId}
        open={!!editingAssetId}
        onOpenChange={(open) => !open && setEditingAssetId(null)}
        onSuccess={() => {
          setEditingAssetId(null);
          onAssetsChange?.();
        }}
      />
    </div>
  );
}
