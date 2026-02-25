
import React, { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Camera, AlertTriangle } from 'lucide-react'

interface CameraCaptureProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCapture: (dataUrl: string) => void
}

export function CameraCapture({ open, onOpenChange, onCapture }: CameraCaptureProps) {
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (open) {
            startCamera()
        } else {
            stopCamera()
        }
        return () => stopCamera()
    }, [open])

    const startCamera = async () => {
        setError(null)
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err) {
            console.error('Camera error:', err)
            setError('Unable to access camera. Please check permissions.')
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.drawImage(video, 0, 0)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
            stopCamera()
            onCapture(dataUrl)
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl p-0 bg-black border-slate-800 overflow-hidden h-[80vh] flex flex-col">
                <DialogTitle className="sr-only">Camera</DialogTitle>
                <div className="relative flex-1 bg-black flex flex-col">
                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-red-400 p-8 text-center">
                            <AlertTriangle className="w-12 h-12" />
                            <p className="text-lg">{error}</p>
                            <Button
                                variant="outline"
                                className="border-red-500 text-red-400 hover:bg-red-500/10"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            <div className="absolute top-4 right-4 z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full bg-black/20 hover:bg-black/40 text-white"
                                    onClick={() => onOpenChange(false)}
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-center bg-linear-to-t from-black/80 to-transparent">
                                <Button
                                    className="w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white/10 p-1"
                                    onClick={capturePhoto}
                                >
                                    <div className="w-full h-full bg-white rounded-full"></div>
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
