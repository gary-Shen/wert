'use client'

import { createAsset, deleteAsset, archiveAsset, unarchiveAsset, searchAssetSymbols } from "@/app/actions/assets";
import { AutoCompleteInput, type AutoCompleteItem } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { useState, useTransition, useCallback } from "react";

export function AssetManagement({ initialAssets, onAssetsChange }: { initialAssets: any[], onAssetsChange?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [restoreCandidate, setRestoreCandidate] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "CASH",
    currency: "CNY",
    symbol: "",
    market: "",
    quantity: "",
    purchasePrice: "",
    purchaseDate: "",
    lifespanMonths: "",
    initialLoan: "",
    monthlyPayment: "",
    repaymentDate: ""
  });

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    // Smart Restore check: strict match, and must be archived
    const found = initialAssets.find(a => a.name === name && a.isArchived);
    setRestoreCandidate(found || null);
  };

  const handleRestore = () => {
    if (restoreCandidate) {
      startTransition(async () => {
        await unarchiveAsset(restoreCandidate.id);
        setIsOpen(false);
        setFormData(prev => ({ ...prev, name: "" }));
        setRestoreCandidate(null);
        onAssetsChange?.();
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restoreCandidate) return; // Prevent creating duplicate if candidate exists (or user should click restore)

    startTransition(async () => {
      let metadata: any = {};
      let category = formData.type;

      if (formData.type === "FIXED") category = "REAL_ESTATE";
      if (formData.type === "VEHICLE") category = "VEHICLE";
      if (formData.type === "METAL") category = "PRECIOUS_METAL";
      if (formData.type === "COLLECT") category = "COLLECTIBLE";

      if (category === "REAL_ESTATE" && formData.purchasePrice) {
        metadata = {
          purchasePrice: parseFloat(formData.purchasePrice),
          purchaseDate: formData.purchaseDate,
          lifespanMonths: parseInt(formData.lifespanMonths) || 120
        };
      } else if (category === "LIABILITY" && formData.initialLoan) {
        metadata = {
          initialLoan: parseFloat(formData.initialLoan),
          monthlyPayment: parseFloat(formData.monthlyPayment),
          repaymentDate: formData.repaymentDate
        };
      }

      await createAsset({
        name: formData.name,
        type: category as any,
        currency: formData.currency,
        symbol: formData.symbol,
        market: formData.market,
        quantity: formData.quantity,
        metadata
      });
      setIsOpen(false);

      setFormData({
        name: "",
        type: "CASH",
        currency: "CNY",
        symbol: "",
        market: "",
        quantity: "",
        purchasePrice: "",
        purchaseDate: "",
        lifespanMonths: "",
        initialLoan: "",
        monthlyPayment: "",
        repaymentDate: ""
      });
      onAssetsChange?.();
    });
  };

  const symbolFetcher = useCallback(async (query: string): Promise<AutoCompleteItem[]> => {
    const results = await searchAssetSymbols(query);
    return results.map(r => ({
      value: r.symbol, // Input value becomes the symbol
      label: `${r.cnName} (${r.symbol})`,
      subLabel: r.name ?? undefined,
      data: r
    }));
  }, []);

  const handleSymbolSelect = (item: AutoCompleteItem) => {
    const data = item.data;
    setFormData(prev => ({
      ...prev,
      symbol: data.symbol,
      name: prev.name || data.cnName
    }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>资产列表</CardTitle>
          <CardDescription>管理您的资产。</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> 新增资产</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>添加资产</DialogTitle>
                <DialogDescription>
                  创建一个新的资产或负债跟踪项。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* 垂直布局优化: grid gap-2 + Label Block */}
                <div className="grid gap-2 relative">
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    required
                    autoComplete="off"
                    placeholder="例如: 招商银行储蓄卡"
                  />
                  {restoreCandidate && (
                    <div className="absolute top-16 left-0 right-0 z-50 bg-popover text-popover-foreground border rounded-md shadow-md p-3 text-sm flex flex-col gap-2 animate-in fade-in zoom-in-95">
                      <p className="text-muted-foreground">发现已归档的同名资产。</p>
                      <Button type="button" variant="secondary" size="sm" onClick={handleRestore} disabled={isPending}>
                        <ArchiveRestore className="mr-2 h-3 w-3" /> 恢复 &quot;{restoreCandidate.name}&quot;
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">类型</Label>
                  <Select onValueChange={v => setFormData({ ...formData, type: v })} defaultValue={formData.type}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">现金 (低风险 · 存款/货基)</SelectItem>
                      <SelectItem value="STOCK">股票 (高风险 · 个股)</SelectItem>
                      <SelectItem value="FUND">基金 (中高风险 · 偏股/混合)</SelectItem>
                      <SelectItem value="BOND">债券 (低风险 · 债券/债基)</SelectItem>
                      <SelectItem value="CRYPTO">加密货币 (高风险)</SelectItem>
                      <SelectItem value="FIXED">房产 (不动产)</SelectItem>
                      <SelectItem value="VEHICLE">交通工具 (消费品)</SelectItem>
                      <SelectItem value="METAL">贵金属 (保值)</SelectItem>
                      <SelectItem value="COLLECT">收藏品 (另类投资)</SelectItem>
                      <SelectItem value="LIABILITY">负债 (贷款)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">货币</Label>
                  <Select onValueChange={v => setFormData({ ...formData, currency: v })} defaultValue={formData.currency}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择货币" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="HKD">HKD</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {["STOCK", "FUND", "BOND", "CRYPTO"].includes(formData.type) && (
                  <>
                    <div className="border-t my-2 pt-2 text-xs font-bold text-muted-foreground">投资详情 (自动估值)</div>
                    <div className="grid gap-2">
                      <Label>代码</Label>
                      <AutoCompleteInput
                        value={formData.symbol}
                        onValueChange={v => setFormData({ ...formData, symbol: v })}
                        onSelect={handleSymbolSelect}
                        fetcher={symbolFetcher}
                        placeholder="搜索代码/名称 (支持自由输入)"
                        emptyText="未找到相关资产"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>市场</Label>
                      <Input value={formData.market} onChange={e => setFormData({ ...formData, market: e.target.value })} placeholder="可选 (US, HK, CN)" />
                    </div>
                    <div className="grid gap-2">
                      <Label>数量</Label>
                      <Input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} placeholder="持仓份额" />
                    </div>
                  </>
                )}

                {formData.type === "FIXED" && (
                  <>
                    <div className="border-t my-2 pt-2 text-xs font-bold text-muted-foreground">自动化配置</div>
                    <div className="grid gap-2">
                      <Label>价格</Label>
                      <Input type="number" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} placeholder="原价" />
                    </div>
                    <div className="grid gap-2">
                      <Label>日期</Label>
                      <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>寿命 (月)</Label>
                      <Input type="number" value={formData.lifespanMonths} onChange={e => setFormData({ ...formData, lifespanMonths: e.target.value })} placeholder="120" />
                    </div>
                  </>
                )}
                {formData.type === "LIABILITY" && (
                  <>
                    <div className="border-t my-2 pt-2 text-xs font-bold text-muted-foreground">自动化配置</div>
                    <div className="grid gap-2">
                      <Label>贷款</Label>
                      <Input type="number" value={formData.initialLoan} onChange={e => setFormData({ ...formData, initialLoan: e.target.value })} placeholder="初始本金" />
                    </div>
                    <div className="grid gap-2">
                      <Label>还款</Label>
                      <Input type="number" value={formData.monthlyPayment} onChange={e => setFormData({ ...formData, monthlyPayment: e.target.value })} placeholder="月供" />
                    </div>
                    <div className="grid gap-2">
                      <Label>开始日期</Label>
                      <Input type="date" value={formData.repaymentDate} onChange={e => setFormData({ ...formData, repaymentDate: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending || !!restoreCandidate}>保存资产</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {initialAssets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <div className="flex flex-col">
                <span className="font-medium">{asset.name}</span>
                <span className="text-xs text-muted-foreground">{asset.category} • {asset.currency} • {asset.isArchived ? "已归档" : "活跃"}</span>
              </div>
              <div className="flex items-center gap-1">
                {!asset.isArchived ? (
                  <Button variant="ghost" size="icon" onClick={() => startTransition(async () => {
                    await archiveAsset(asset.id);
                    onAssetsChange?.();
                  })} title="归档" disabled={isPending}>
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => startTransition(async () => {
                    await unarchiveAsset(asset.id);
                    onAssetsChange?.();
                  })} title="恢复" disabled={isPending}>
                    <ArchiveRestore className="h-4 w-4 text-primary" />
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认永久删除？</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作无法撤销。&quot;{asset.name}&quot; 的历史快照数据也将被清除。
                        {!asset.isArchived && " 建议使用“归档”以保留历史记录。"}
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
          {initialAssets.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              暂无资产。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
