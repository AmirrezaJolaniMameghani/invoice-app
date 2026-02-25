
import { Progress } from "@/components/ui/progress"
import { FileText } from 'lucide-react'

interface FileInfo {
    name: string
    size: number
    type: string
    lastModified: Date
}

interface ScanProgressProps {
    status: 'uploading' | 'scanning'
    progress: number
    fileInfo: FileInfo | null
    imagePreview: string | null
}

export function ScanProgress({ status, progress, fileInfo, imagePreview }: ScanProgressProps) {
    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-md">
            <div className="flex items-center gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700 w-full">
                {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-700 rounded-lg">
                        <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                )}
                <span className="font-medium text-slate-200 truncate flex-1">{fileInfo?.name}</span>
            </div>
            <div className="w-full text-center space-y-2">
                <div className="text-slate-400 text-base">
                    {status === 'uploading' ? 'Processing image...' : 'Scanning for threats...'}
                </div>
                <Progress value={progress} className="h-2" indicatorClassName="bg-linear-to-r from-indigo-500 to-violet-500" />
                <div className="text-indigo-500 font-semibold text-sm">{Math.round(progress)}%</div>
            </div>
        </div>
    )
}
