import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, RefreshCw, Mail, Clock, User, ChevronRight, Paperclip } from "lucide-react"

interface EmailAttachment {
    filename: string
    contentType: string
    size: number
    content: string // base64
}

export interface EmailMessage {
    id: string
    messageId?: string
    subject: string
    from: string
    date: string
    snippet: string
    body?: string
    attachmentText?: string
    attachments?: EmailAttachment[]
}

interface ReadEmailsProps {
    onSelectEmail: (email: EmailMessage) => void
}

export function ReadEmails({ onSelectEmail }: ReadEmailsProps) {
    const [emails, setEmails] = useState<EmailMessage[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [filterEnabled, setFilterEnabled] = useState(true)
    const [subjectFilter, setSubjectFilter] = useState("invoice-mission")

    const fetchEmails = async (useFilter?: boolean) => {
        setLoading(true)
        setError(null)

        const shouldFilter = useFilter !== undefined ? useFilter : filterEnabled

        try {
            const url = shouldFilter && subjectFilter
                ? `http://localhost:3001/api/emails?subject=${encodeURIComponent(subjectFilter)}`
                : "http://localhost:3001/api/emails"

            const response = await fetch(url)
            const data = await response.json()

            if (data.success) {
                setEmails(data.data)
                setLastUpdated(new Date())

                if (data.data.length === 0 && shouldFilter) {
                    setError(`No emails found with subject "${subjectFilter}". Try disabling the filter to view all emails.`)
                }
            } else {
                setError(data.error || "Failed to fetch emails")
            }
        } catch (err) {
            console.error("Fetch emails error:", err)
            setError("Failed to connect to server. Make sure the backend is running on port 3001.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmails()
    }, [])

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
        } catch {
            return dateStr
        }
    }

    return (
        <div className="space-y-4">
            {/* Filter Section */}
            <div className="flex items-center gap-3">
                <Input
                    type="text"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    placeholder="Filter by subject..."
                    className="flex-1 bg-slate-950 border-slate-700 text-slate-200 font-mono text-sm"
                    disabled={loading || !filterEnabled}
                />
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer whitespace-nowrap">
                    <input
                        type="checkbox"
                        checked={filterEnabled}
                        onChange={(e) => {
                            setFilterEnabled(e.target.checked)
                            fetchEmails(e.target.checked)
                        }}
                        disabled={loading}
                        className="rounded border-slate-600 bg-slate-800 accent-indigo-500"
                    />
                    Filter
                </label>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                    onClick={() => fetchEmails()}
                    disabled={loading}
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching...</>
                    ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" /> Refresh</>
                    )}
                </Button>
                {lastUpdated && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && emails.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-slate-400 text-sm">Fetching emails from inbox...</p>
                </div>
            )}

            {/* Email List */}
            {emails.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {emails.length} email{emails.length !== 1 ? "s" : ""} found
                    </p>
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                        {emails.map((email) => (
                            <Card
                                key={email.id}
                                className="bg-slate-800/40 border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group"
                                onClick={() => onSelectEmail(email)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="text-sm font-medium text-slate-200 truncate">
                                                    {email.subject || "(No Subject)"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1 truncate">
                                                    <User className="w-3 h-3" />
                                                    {email.from}
                                                </span>
                                                <span className="shrink-0">{formatDate(email.date)}</span>
                                            </div>
                                            {email.attachments && email.attachments.length > 0 && (
                                                <Badge variant="secondary" className="mt-1.5 bg-indigo-500/15 text-indigo-300 border-indigo-500/30 text-[10px] px-1.5 py-0">
                                                    <Paperclip className="w-2.5 h-2.5 mr-1" />
                                                    {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                                                </Badge>
                                            )}
                                            {email.snippet && (
                                                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                                    {email.snippet}
                                                </p>
                                            )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && emails.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                    <Mail className="w-10 h-10 text-slate-600" />
                    <p className="text-sm">No emails found</p>
                </div>
            )}
        </div>
    )
}
