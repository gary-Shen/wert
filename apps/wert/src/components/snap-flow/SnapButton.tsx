'use client'

import { Button } from "@/components/ui/button"
import { Aperture } from "lucide-react"
import { useState } from "react"
import { SnapWizard } from "./SnapWizard"

export function SnapButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          size="icon"
          className="h-16 w-16 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-105 transition-transform"
          onClick={() => setIsOpen(true)}
        >
          <Aperture className="h-8 w-8" />
        </Button>
      </div>

      <SnapWizard open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
