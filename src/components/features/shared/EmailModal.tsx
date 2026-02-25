
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertTriangle, Check } from 'lucide-react'

interface EmailModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    email: string
    onEmailChange: (value: string) => void
    apiKey: string
    onApiKeyChange: (value: string) => void
    onSubmit: () => void
    isSending: boolean
    sent: boolean
    error: string | null
}

export function EmailModal({
    open,
    onOpenChange,
    email,
    onEmailChange,
    apiKey,
    onApiKeyChange,
    onSubmit,
    isSending,
    sent,
    error
}: EmailModalProps) {

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-slate-200">
                <DialogHeader>
                    <DialogTitle>Email Results</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Send the analysis report to your email inbox. Requires a Resend API key.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {(!apiKey || error) && (
                        <div className="space-y-2">
                            <Label htmlFor="resend-api-key">Resend API Key</Label>
                            <Input
                                id="resend-api-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => onApiKeyChange(e.target.value)}
                                placeholder="re_..."
                                className="bg-slate-950 border-slate-700 text-slate-200 font-mono"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            placeholder="you@example.com"
                            className="bg-slate-950 border-slate-700 text-slate-200 font-mono"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    {sent && (
                        <div className="text-green-400 text-sm flex items-center justify-center gap-2 font-semibold p-2 bg-green-500/10 rounded-lg">
                            <Check className="w-4 h-4" /> Email Sent Successfully!
                        </div>
                    )}
                </div>

                <DialogFooter className="flex sm:justify-between gap-2">
                    {!sent && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white">
                                Cancel
                            </Button>
                            <Button
                                onClick={onSubmit}
                                disabled={!email || !apiKey || isSending}
                                className="bg-linear-to-br from-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/20 text-white border-0"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                                    </>
                                ) : 'Send Email'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
