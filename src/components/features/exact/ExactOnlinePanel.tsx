import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    Loader2,
    Upload,
} from "lucide-react";
import {
    getExactStatus,
    pushInvoiceToExact,
    EXACT_AUTH_URL,
} from "@/lib/exactOnlineApi";

interface ExactOnlinePanelProps {
    invoiceResult: any;
}

type PushStatus = "idle" | "pushing" | "success" | "error";

export function ExactOnlinePanel({ invoiceResult }: ExactOnlinePanelProps) {
    const [connected, setConnected] = useState(false);
    const [division, setDivision] = useState<number | null>(null);
    const [checking, setChecking] = useState(false);

    // Push state
    const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
    const [pushError, setPushError] = useState<string | null>(null);
    const [pushResult, setPushResult] = useState<any>(null);

    // Form fields
    const [supplierGuid, setSupplierGuid] = useState(
        () => localStorage.getItem("exact_supplier_guid") || ""
    );
    const [glAccountGuid, setGlAccountGuid] = useState(
        () => localStorage.getItem("exact_glaccount_guid") || ""
    );
    const [journal, setJournal] = useState(
        () => localStorage.getItem("exact_journal") || "70"
    );

    // Show/hide config panel
    const [showConfig, setShowConfig] = useState(false);

    const checkStatus = useCallback(async () => {
        setChecking(true);
        try {
            const status = await getExactStatus();
            setConnected(status.connected);
            setDivision(status.division ?? null);
        } catch {
            setConnected(false);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    // Poll for connection status when window gains focus (after OAuth tab)
    useEffect(() => {
        const onFocus = () => {
            if (!connected) checkStatus();
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [connected, checkStatus]);

    const handlePush = async () => {
        if (!supplierGuid.trim() || !glAccountGuid.trim()) {
            setPushError("Supplier GUID and GL Account GUID are required.");
            setPushStatus("error");
            return;
        }

        // Persist for convenience
        localStorage.setItem("exact_supplier_guid", supplierGuid);
        localStorage.setItem("exact_glaccount_guid", glAccountGuid);
        localStorage.setItem("exact_journal", journal);

        setPushStatus("pushing");
        setPushError(null);
        setPushResult(null);

        try {
            const result = await pushInvoiceToExact(
                invoiceResult,
                supplierGuid.trim(),
                glAccountGuid.trim(),
                journal.trim() || undefined
            );
            setPushResult(result);
            setPushStatus("success");
        } catch (err: any) {
            setPushError(err?.message || String(err));
            setPushStatus("error");
        }
    };

    const handleConnect = () => {
        window.open(EXACT_AUTH_URL, "_blank", "noopener");
    };

    // ── Not connected ──
    if (!connected) {
        return (
            <Button
                className="w-full py-6 bg-linear-to-br from-blue-500 to-cyan-600 text-white font-semibold text-lg hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20"
                onClick={handleConnect}
                disabled={checking}
            >
                {checking ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                    <ExternalLink className="w-5 h-5 mr-2" />
                )}
                Connect to Exact Online
            </Button>
        );
    }

    // ── Connected — show push button ──
    return (
        <Card className="bg-slate-800/60 backdrop-blur-md border border-blue-500/40">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-400 text-base font-semibold uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Exact Online
                    </CardTitle>
                    <Badge
                        variant="secondary"
                        className="bg-emerald-500/20 text-emerald-300 border-emerald-500"
                    >
                        Division {division}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Toggle config section */}
                <button
                    className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
                    onClick={() => setShowConfig(!showConfig)}
                >
                    {showConfig ? "Hide" : "Show"} configuration
                </button>

                {showConfig && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">
                                Supplier GUID *
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="e.g. a1b2c3d4-e5f6-..."
                                value={supplierGuid}
                                onChange={(e) => setSupplierGuid(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">
                                GL Account GUID *
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="e.g. f7g8h9i0-j1k2-..."
                                value={glAccountGuid}
                                onChange={(e) => setGlAccountGuid(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">
                                Journal Code
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="70"
                                value={journal}
                                onChange={(e) => setJournal(e.target.value)}
                            />
                        </div>
                        <Separator className="bg-slate-700" />
                    </div>
                )}

                {/* Push result states */}
                {pushStatus === "success" && pushResult && (
                    <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-3 text-sm text-emerald-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Invoice posted to Exact Online successfully!
                    </div>
                )}

                {pushStatus === "error" && pushError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="wrap-break-word">{pushError}</span>
                    </div>
                )}

                {/* Push button */}
                <Button
                    className="w-full py-5 bg-linear-to-br from-blue-500 to-cyan-600 text-white font-semibold text-base hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
                    onClick={handlePush}
                    disabled={pushStatus === "pushing"}
                >
                    {pushStatus === "pushing" ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Posting to Exact...
                        </>
                    ) : pushStatus === "success" ? (
                        <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Post Again
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5 mr-2" />
                            Post Data to Exact
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
