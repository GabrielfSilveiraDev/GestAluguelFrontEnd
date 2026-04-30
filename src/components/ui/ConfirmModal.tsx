import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  isLoading?: boolean
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger' | 'warning'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading,
  confirmLabel = 'Confirmar',
  confirmVariant = 'danger',
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

