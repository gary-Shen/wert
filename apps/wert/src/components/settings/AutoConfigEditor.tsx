'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AutoConfig,
  DepreciatingAssetConfig,
  LiabilityConfig,
  isDepreciatingConfig,
  isLiabilityConfig,
  getAutoConfigType,
  getDefaultLifespan,
} from '@/types/autoConfig'
import { calculateDepreciation, calculateSimpleLoanAmortization } from '@/lib/logic/calculator'

interface AutoConfigEditorProps {
  category: string
  config: AutoConfig | null
  onChange: (config: AutoConfig | null) => void
}

export function AutoConfigEditor({ category, config, onChange }: AutoConfigEditorProps) {
  const configType = getAutoConfigType(category)

  if (!configType) {
    return null
  }

  // Initialize with defaults if no config
  const ensureConfig = (): AutoConfig => {
    if (config) return config

    if (configType === 'depreciation') {
      return {
        type: 'depreciation',
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        lifespanMonths: getDefaultLifespan(category),
        salvageValue: 0,
      }
    } else {
      return {
        type: 'amortization',
        initialLoan: 0,
        monthlyPayment: 0,
        repaymentDate: new Date().toISOString().split('T')[0],
      }
    }
  }

  const updateField = (field: string, value: string | number) => {
    const current = ensureConfig()
    onChange({ ...current, [field]: value } as AutoConfig)
  }

  // Calculate preview value
  const getPreviewValue = (): number | null => {
    if (!config) return null

    if (isDepreciatingConfig(config) && config.purchasePrice && config.purchaseDate) {
      return calculateDepreciation(
        config.purchasePrice,
        config.purchaseDate,
        config.lifespanMonths || 120,
        new Date(),
        config.salvageValue || 0
      )
    }

    if (isLiabilityConfig(config) && config.initialLoan && config.monthlyPayment) {
      const startDate = config.repaymentDate ? new Date(config.repaymentDate) : new Date()
      return calculateSimpleLoanAmortization(
        config.initialLoan,
        config.monthlyPayment,
        startDate
      )
    }

    return null
  }

  const previewValue = getPreviewValue()

  if (configType === 'depreciation') {
    const depConfig = isDepreciatingConfig(config)
      ? config
      : ({
          type: 'depreciation',
          purchasePrice: 0,
          purchaseDate: '',
          lifespanMonths: getDefaultLifespan(category),
          salvageValue: 0,
        } as DepreciatingAssetConfig)

    return (
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-sm font-medium text-slate-700 border-b pb-2">
          自动折旧配置
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">购买价格</Label>
            <Input
              type="number"
              value={depConfig.purchasePrice || ''}
              onChange={(e) =>
                updateField('purchasePrice', parseFloat(e.target.value) || 0)
              }
              placeholder="原始购买价格"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">购买日期</Label>
            <Input
              type="date"
              value={depConfig.purchaseDate || ''}
              onChange={(e) => updateField('purchaseDate', e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">
              折旧年限 (月)
              <span className="text-slate-400 ml-1">
                默认: {getDefaultLifespan(category)}
              </span>
            </Label>
            <Input
              type="number"
              value={depConfig.lifespanMonths || ''}
              onChange={(e) =>
                updateField('lifespanMonths', parseInt(e.target.value) || getDefaultLifespan(category))
              }
              placeholder={`${getDefaultLifespan(category)}`}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">残值 (可选)</Label>
            <Input
              type="number"
              value={depConfig.salvageValue || ''}
              onChange={(e) =>
                updateField('salvageValue', parseFloat(e.target.value) || 0)
              }
              placeholder="使用寿命结束后的残值"
            />
          </div>
        </div>

        {previewValue !== null && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">当前计算价值</div>
            <div className="text-lg font-bold text-slate-900">
              {previewValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (configType === 'amortization') {
    const loanConfig = isLiabilityConfig(config)
      ? config
      : ({
          type: 'amortization',
          initialLoan: 0,
          monthlyPayment: 0,
          repaymentDate: '',
        } as LiabilityConfig)

    return (
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-sm font-medium text-slate-700 border-b pb-2">
          贷款摊销配置
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">初始贷款金额</Label>
            <Input
              type="number"
              value={loanConfig.initialLoan || ''}
              onChange={(e) =>
                updateField('initialLoan', parseFloat(e.target.value) || 0)
              }
              placeholder="贷款本金"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">月供金额</Label>
            <Input
              type="number"
              value={loanConfig.monthlyPayment || ''}
              onChange={(e) =>
                updateField('monthlyPayment', parseFloat(e.target.value) || 0)
              }
              placeholder="每月还款金额"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-slate-600">还款起始日期</Label>
            <Input
              type="date"
              value={loanConfig.repaymentDate || ''}
              onChange={(e) => updateField('repaymentDate', e.target.value)}
            />
          </div>
        </div>

        {previewValue !== null && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">当前剩余本金</div>
            <div className="text-lg font-bold text-slate-900">
              {previewValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
