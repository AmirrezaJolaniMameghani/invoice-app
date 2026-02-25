
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

interface ScanResultType {
    status: 'safe' | 'warning' | 'danger'
    message: string
    details: string[]
}

interface FileInfo {
    name: string
    size: number
    type: string
    lastModified: Date
}

interface ScanResultProps {
    result: ScanResultType
    fileInfo: FileInfo | null
    imagePreview: string | null
    showChat: boolean
    formatFileSize: (bytes: number) => string
}

export function ScanResult({ result, fileInfo, imagePreview, showChat, formatFileSize }: ScanResultProps) {
    if (showChat) return null

    return (
        <>
            {imagePreview && (
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex justify-center">
                    <img src={imagePreview} alt="Uploaded file" className="max-w-full max-h-[300px] object-contain rounded-xl" />
                </div>
            )}

            <Alert className={`border ${result.status === 'safe'
                ? 'bg-green-500/10 border-green-500 text-green-400'
                : result.status === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                    : 'bg-red-500/10 border-red-500 text-red-400'
                }`}>
                {result.status === 'safe' && <CheckCircle2 className="h-5 w-5" />}
                {result.status === 'warning' && <AlertTriangle className="h-5 w-5" />}
                {result.status === 'danger' && <XCircle className="h-5 w-5" />}
                <AlertTitle className="mb-0 font-semibold text-lg">{result.message}</AlertTitle>
            </Alert>

            <Card className="bg-slate-800/60 backdrop-blur-md border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider">File Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <div className="flex justify-between py-2 border-b border-slate-700/50">
                        <span className="text-slate-500">Name:</span>
                        <span className="text-slate-200 font-medium text-right truncate max-w-[60%]">{fileInfo?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700/50">
                        <span className="text-slate-500">Size:</span>
                        <span className="text-slate-200 font-medium text-right">{fileInfo ? formatFileSize(fileInfo.size) : ''}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700/50">
                        <span className="text-slate-500">Type:</span>
                        <span className="text-slate-200 font-medium text-right">{fileInfo?.type || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-500">Last Modified:</span>
                        <span className="text-slate-200 font-medium text-right">{fileInfo?.lastModified.toLocaleString()}</span>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
