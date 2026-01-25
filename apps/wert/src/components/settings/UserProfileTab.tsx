'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUserProfile } from '@/app/actions/user'
import { signOut } from '@/lib/auth-client'
import { AVAILABLE_CURRENCIES } from '@/lib/geo'
import { Check, LogOut, Pencil, User, X } from 'lucide-react'

interface UserProfileTabProps {
  user: {
    name: string
    email: string
    image: string | null
    baseCurrency: string | null
  }
  onUserUpdate?: () => void
}

export function UserProfileTab({ user, onUserUpdate }: UserProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [isPending, startTransition] = useTransition()

  const currencyInfo = AVAILABLE_CURRENCIES.find((c) => c.code === user.baseCurrency)

  const handleSave = () => {
    if (!editName.trim()) return

    startTransition(async () => {
      const result = await updateUserProfile(editName.trim())
      if (result.success) {
        setIsEditing(false)
        onUserUpdate?.()
      }
    })
  }

  const handleCancel = () => {
    setEditName(user.name)
    setIsEditing(false)
  }

  const handleSignOut = () => {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/login'
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* User Avatar & Basic Info */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
        {/* Avatar */}
        <div className="relative">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow">
              <User className="w-8 h-8 text-slate-400" />
            </div>
          )}
        </div>

        {/* Name & Email */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-lg font-semibold"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleSave}
                disabled={isPending}
              >
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 truncate">{user.name}</h3>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="w-3 h-3 text-slate-400" />
              </Button>
            </div>
          )}
          <p className="text-sm text-slate-500 truncate">{user.email}</p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        {/* Base Currency (Read-only) */}
        <div className="flex items-center justify-between p-4 border rounded-xl">
          <div>
            <Label className="text-sm font-medium text-slate-700">基准货币</Label>
            <p className="text-xs text-slate-400 mt-0.5">所有资产以此货币汇总</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <span className="text-lg font-bold text-primary">{currencyInfo?.symbol}</span>
              <span className="font-medium text-primary">{user.baseCurrency}</span>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              不可更改
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          退出登录
        </Button>
      </div>
    </div>
  )
}
