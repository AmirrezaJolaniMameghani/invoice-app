import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReadEmails, type EmailMessage } from "../email/ReadEmails"

interface EmailReaderModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onEmailSelect: (email: EmailMessage) => void
}

export function EmailReaderModal({
    open,
    onOpenChange,
    onEmailSelect
}: EmailReaderModalProps) {

    const handleSelectEmail = (email: EmailMessage) => {
        onOpenChange(false)
        onEmailSelect(email)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden bg-slate-900 border-slate-700 text-slate-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-lg">📥</span> Inbox
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Select an email to scan and analyze with AI
                    </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto">
                    <ReadEmails onSelectEmail={handleSelectEmail} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
