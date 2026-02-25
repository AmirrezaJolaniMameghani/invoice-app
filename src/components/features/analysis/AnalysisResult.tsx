import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, RefreshCw } from "lucide-react"

type Status = "idle" | "analyzing" | "complete" | "error"

interface AnalysisResultProps {
    status: Status
    result: any
    error: string | null
    onAnalyze: () => void
    onRetry: () => void
}

function formatMoney(n: any) {
    if (typeof n !== "number") return null
    return n.toFixed(2)
}

export function AnalysisResult({
    status,
    result,
    error,
    onAnalyze,
    onRetry,
}: AnalysisResultProps) {
    if (status === "idle") {
        return (
            <Button
                className="w-full py-6 bg-linear-to-br from-emerald-500 to-emerald-600 text-white font-semibold text-lg hover:-translate-y-0.5 transition-all shadow-lg shadow-emerald-500/20"
                onClick={onAnalyze}
            >
                <span className="mr-2 text-2xl">🦙</span>
                Analyze with LLAMA
            </Button>
        )
    }

    if (status === "analyzing") {
        return (
            <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700">
                <CardContent className="flex flex-col items-center gap-4 py-8">
                    <div className="w-16 h-16 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-400 text-lg m-0">Analyzing with LLAMA (local)...</p>
                    <p className="text-slate-500 text-sm m-0">Running OCR + LLM extraction on your invoice</p>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500 rounded-2xl p-6 text-center">
                <p className="text-red-400 m-0 mb-4 text-lg flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </p>
                <Button
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                    onClick={onRetry}
                >
                    Try Again
                </Button>
            </div>
        )
    }

    if (status === "complete" && result) {
        const inv = result || {}
        const invoiceNumber = inv?.invoice_number ?? inv?.invoiceNumber ?? null
        const invoiceDate = inv?.invoice_date ?? inv?.invoiceDate ?? null
        const dueDate = inv?.due_date ?? inv?.dueDate ?? null
        const totals = inv?.totals ?? null
        const vendor = inv?.vendor ?? null
        const items = inv?.items ?? []

        return (
            <Card className="bg-slate-800/60 backdrop-blur-md border border-emerald-500/50">
                <CardHeader>
                    <CardTitle className="text-emerald-500 text-base font-semibold uppercase tracking-wider flex items-center gap-2">
                        🦙 LLAMA Invoice Analysis
                    </CardTitle>
                    <div className="mt-2">
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500">
                            Invoice
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Invoice Overview */}
                    <div>
                        <h4 className="text-sm text-slate-500 mb-3 uppercase tracking-wider font-semibold">Invoice Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                <span className="block text-xs text-slate-500 mb-1">Invoice Number</span>
                                <span className="block text-slate-200 font-medium text-sm">
                                    {invoiceNumber ?? "—"}
                                </span>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                <span className="block text-xs text-slate-500 mb-1">Invoice Date</span>
                                <span className="block text-slate-200 font-medium text-sm">
                                    {invoiceDate ?? "—"}
                                </span>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                <span className="block text-xs text-slate-500 mb-1">Due Date</span>
                                <span className="block text-slate-200 font-medium text-sm">
                                    {dueDate ?? "—"}
                                </span>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                <span className="block text-xs text-slate-500 mb-1">Totals</span>
                                <span className="block text-slate-200 font-medium text-sm">
                                    {totals
                                        ? `${totals.currency ?? ""} subtotal ${formatMoney(totals.subtotal) ?? "—"} | tax ${formatMoney(totals.tax) ?? "—"} | total ${formatMoney(totals.total) ?? "—"}`
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Vendor Info */}
                    {vendor && (
                        <div>
                            <Separator className="my-4 bg-slate-700" />
                            <h4 className="text-sm text-slate-500 mb-3 uppercase tracking-wider font-semibold">Vendor</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {vendor.name && (
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                        <span className="block text-xs text-slate-500 mb-1">Name</span>
                                        <span className="block text-slate-200 font-medium text-sm">{vendor.name}</span>
                                    </div>
                                )}
                                {vendor.address && (
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                        <span className="block text-xs text-slate-500 mb-1">Address</span>
                                        <span className="block text-slate-200 font-medium text-sm">{vendor.address}</span>
                                    </div>
                                )}
                                {vendor.vat_id && (
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                        <span className="block text-xs text-slate-500 mb-1">VAT ID</span>
                                        <span className="block text-slate-200 font-medium text-sm">{vendor.vat_id}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Line Items */}
                    {items.length > 0 && (
                        <div>
                            <Separator className="my-4 bg-slate-700" />
                            <h4 className="text-sm text-slate-500 mb-3 uppercase tracking-wider font-semibold">Line Items</h4>
                            <div className="space-y-2">
                                {items.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <span className="block text-slate-200 text-sm truncate">{item.description ?? "—"}</span>
                                            {item.quantity != null && (
                                                <span className="text-xs text-slate-500">Qty: {item.quantity}{item.unit_price != null ? ` × ${formatMoney(item.unit_price)}` : ""}</span>
                                            )}
                                        </div>
                                        <span className="text-emerald-400 font-semibold text-sm whitespace-nowrap">
                                            {formatMoney(item.amount) ?? "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Raw JSON */}
                    <div>
                        <Separator className="my-4 bg-slate-700" />
                        <h4 className="text-sm text-slate-500 mb-3 uppercase tracking-wider font-semibold">Raw JSON</h4>
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words m-0">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    </div>

                    {/* Re-analyze */}
                    <div className="mt-6">
                        <Button
                            className="w-full bg-linear-to-br from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                            onClick={onAnalyze}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Re-analyze
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return null
}
