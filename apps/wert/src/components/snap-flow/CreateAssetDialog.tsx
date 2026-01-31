'use client'

import { createAsset, searchAssetSymbols } from "@/app/actions/assets";
import { AutoCompleteInput, type AutoCompleteItem } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useTransition, useCallback } from "react";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateAssetDialog({ open, onOpenChange, onSuccess }: CreateAssetDialogProps) {
  const [isPending, startTransition] = useTransition();

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

  const resetForm = () => {
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      let metadata: Record<string, unknown> = {};
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
        type: category as Parameters<typeof createAsset>[0]['type'],
        currency: formData.currency,
        symbol: formData.symbol,
        market: formData.market,
        quantity: formData.quantity,
        metadata
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    });
  };

  const symbolFetcher = useCallback(async (query: string): Promise<AutoCompleteItem[]> => {
    const results = await searchAssetSymbols(query);
    return results.map(r => ({
      value: r.symbol,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[calc(100vh-32px)] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>添加资产</DialogTitle>
            <DialogDescription>
              创建一个新的资产或负债跟踪项。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                autoComplete="off"
                placeholder="例如: 招商银行储蓄卡"
              />
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存资产
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
