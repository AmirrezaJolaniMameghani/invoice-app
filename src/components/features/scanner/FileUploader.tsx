
import React, { useRef, useCallback } from 'react'
import { Card } from "@/components/ui/card"
import { Upload } from 'lucide-react'
import { cn } from "@/lib/utils"

interface FileUploaderProps {
    onFileSelect: (file: File) => void
}

export function FileUploader({ onFileSelect }: FileUploaderProps) {
    const [dragActive, setDragActive] = React.useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0])
        }
    }, [onFileSelect])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0])
        }
    }, [onFileSelect])

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    return (
        <Card
            className={cn(
                "w-full max-w-xl p-12 border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center gap-4 bg-slate-800/50 backdrop-blur-sm",
                dragActive
                    ? "border-indigo-500 bg-slate-800/80 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                    : "border-slate-600 hover:border-indigo-500 hover:bg-slate-800/80 hover:scale-[1.02]"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.md,.json,.csv"
                onChange={handleFileSelect}
                className="hidden"
            />
            <div className="w-16 h-16 text-indigo-500 animate-bounce">
                <Upload className="w-full h-full" />
            </div>
            <p className="text-xl font-semibold text-slate-200 m-0">Drag & drop an image here</p>
            <p className="text-sm text-slate-500 m-0">or click to browse</p>
        </Card>
    )
}
