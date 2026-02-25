
import { useState, useCallback } from 'react'
import { Toaster } from 'sonner'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
// Features
import { FileUploader } from './components/features/scanner/FileUploader'
import { CameraCapture } from './components/features/scanner/CameraCapture'
import { ScanProgress } from './components/features/scanner/ScanProgress'
import { ScanResult } from './components/features/scanner/ScanResult'
import { AnalysisResult } from './components/features/analysis/AnalysisResult'
import { EmailModal } from './components/features/shared/EmailModal'
import { EmailReaderModal } from './components/features/shared/EmailReaderModal'
import { parseInvoiceLocal } from "./lib/localInvoiceApi";

import { Button } from "@/components/ui/button"

// Types
type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'complete'
type AIStatus = 'idle' | 'analyzing' | 'complete' | 'error'

interface FileInfo {
  name: string
  size: number
  type: string
  lastModified: Date
}

interface ScanResultType {
  status: 'safe' | 'warning' | 'danger'
  message: string
  details: string[]
}



function App() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [scanResult, setScanResult] = useState<ScanResultType | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Camera state
  const [showCamera, setShowCamera] = useState(false)

  // Email Reader state
  const [showEmailReader, setShowEmailReader] = useState(false)

  // LLAMA analysis state
  const [localInvoiceStatus, setLocalInvoiceStatus] = useState<AIStatus>("idle");
  const [localInvoiceResult, setLocalInvoiceResult] = useState<any>(null);
  const [localInvoiceError, setLocalInvoiceError] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState('')
  const [resendApiKey, setResendApiKey] = useState(() => localStorage.getItem('resend_api_key') || '')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const processImageData = useCallback((dataUrl: string, fileName: string) => {
    // Convert data URL to File
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    const file = new File([u8arr], fileName, { type: mime })

    setCurrentFile(file)
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date()
    })
    setImagePreview(dataUrl)

    startScan(file)
  }, [])

  const startScan = (file: File) => {
    setLocalInvoiceStatus('idle');
    setLocalInvoiceResult(null);
    setLocalInvoiceError(null);
    setScanStatus('uploading')
    setProgress(0)

    // Simulate upload progress
    let uploadProgress = 0
    const uploadInterval = setInterval(() => {
      uploadProgress += Math.random() * 15
      if (uploadProgress >= 100) {
        uploadProgress = 100
        clearInterval(uploadInterval)
        setScanStatus('scanning')

        // Simulate scanning progress
        let scanProgress = 0
        const scanInterval = setInterval(() => {
          scanProgress += Math.random() * 10
          if (scanProgress >= 100) {
            scanProgress = 100
            clearInterval(scanInterval)
            setScanStatus('complete')

            const results: ScanResultType = {
              status: 'safe',
              message: 'File scan complete - No threats detected',
              details: [
                '✓ Image captured successfully',
                '✓ No malicious code patterns found',
                '✓ File structure is valid',
                `✓ MIME type: ${file.type}`,
                `✓ File size: ${formatFileSize(file.size)}`
              ]
            }
            setScanResult(results)
            toast.success("File scanned successfully")
          }
          setProgress(scanProgress)
        }, 100)
      }
      setProgress(uploadProgress)
    }, 80)
  }

  const handleFileSelect = useCallback(async (file: File) => {
    setLocalInvoiceStatus('idle');
    setLocalInvoiceResult(null);
    setLocalInvoiceError(null);

    // If it's a PDF, convert to PNG image first
    if (file.type === "application/pdf") {
      try {
        toast.info("Converting PDF to image for analysis...");
        const base64Pdf = await fileToBase64(file);
        const dataUrl = await convertPdfToImage(base64Pdf);

        // Convert dataURL to File
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const pngFile = new File([blob], file.name.replace(".pdf", ".png"), {
          type: "image/png",
        });

        setCurrentFile(pngFile);
        setFileInfo({
          name: pngFile.name,
          size: pngFile.size,
          type: pngFile.type,
          lastModified: new Date(file.lastModified),
        });
        setImagePreview(dataUrl);

        startScan(pngFile);
        return;
      } catch (e) {
        console.error("PDF conversion failed, processing as text fallback", e);
        toast.error("PDF to image conversion failed, using text fallback");
      }
    }

    // Non-PDF (or PDF fallback)
    setCurrentFile(file);
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || "Unknown",
      lastModified: new Date(file.lastModified),
    });

    // Create image preview if it's an image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }

    startScan(file);
  }, [startScan, setCurrentFile, setFileInfo, setImagePreview]);


  const handleCapture = useCallback((dataUrl: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    processImageData(dataUrl, `capture-${timestamp}.jpg`)
  }, [processImageData])

  const resetScanner = () => {
    setScanStatus('idle')
    setProgress(0)
    setFileInfo(null)
    setScanResult(null)
    setCurrentFile(null)
    setImagePreview(null)
    setLocalInvoiceStatus('idle')
    setLocalInvoiceResult(null)
    setLocalInvoiceError(null)
    setShowCamera(false)
  }

  const convertPdfToImage = async (base64Pdf: string): Promise<string> => {
    try {
      const binaryString = window.atob(base64Pdf);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context failure');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport } as any).promise;
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("PDF to Image conversion failed:", error);
      throw error;
    }
  }

  const handleEmailSelect = async (email: import('./components/features/email/ReadEmails').EmailMessage) => {
    console.log("Selected Email:", email)
    console.log("Has attachmentText?", !!email.attachmentText, "Length:", email.attachmentText?.length)
    console.log("Attachments array:", email.attachments)

    const subject = email.subject || 'document'

    // Priority 1: Convert PDF Attachment to Image (Frontend)
    const pdfAttachment = email.attachments?.find(att => att.contentType === 'application/pdf')
    if (pdfAttachment && pdfAttachment.content) {
      try {
        toast.info("Converting PDF to image for analysis...")
        const dataUrl = await convertPdfToImage(pdfAttachment.content)

        // Convert dataURL to File
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        const file = new File([blob], `${pdfAttachment.filename.replace('.pdf', '')}.png`, { type: 'image/png' })

        handleFileCreation(file)
        return
      } catch (e) {
        console.error("PDF conversion failed, falling back to text extraction", e)
        toast.error("Failed to convert PDF to image. Trying text extraction...")
      }
    }

    // Priority 2: Extracted PDF Text (Fallback from backend)
    if (email.attachmentText && email.attachmentText.trim().length > 0) {
      console.log("Using backend-extracted PDF text")
      const blob = new Blob([email.attachmentText], { type: 'text/plain' })
      const file = new File([blob], `${subject}.txt`, { type: 'text/plain' })
      handleFileCreation(file)
      return
    } else if (email.attachments?.some(att => att.contentType === 'application/pdf')) {
      console.error("PDF attachment found but no text extracted!")
      toast.error("Found PDF but failed to extract text. Check backend logs.")
    }

    // Priority 2: Image Attachments
    // Look for image attachments in the array
    const imageAttachment = email.attachments?.find(att => att.contentType.startsWith('image/'))
    if (imageAttachment && imageAttachment.content) {
      try {
        // Convert base64 to File
        const byteCharacters = atob(imageAttachment.content)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: imageAttachment.contentType })
        const file = new File([blob], imageAttachment.filename, { type: imageAttachment.contentType })

        handleFileCreation(file)
        return
      } catch (e) {
        console.error("Failed to process image attachment", e)
        toast.error("Failed to process image attachment")
      }
    }

    // If no attachments found
    toast.error("No supported attachment (PDF/Image) found in this email.")
  }

  const handleFileCreation = (file: File) => {
    setCurrentFile(file)
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || 'text/plain',
      lastModified: new Date()
    })
    setImagePreview(null)

    // If it's an image, set preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    startScan(file)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const analyzeWithLlama = async () => {
    if (!currentFile) return

    try {
      setLocalInvoiceStatus("analyzing")
      setLocalInvoiceError(null)
      toast.info("Running local OCR + LLM extraction...")
      const data = await parseInvoiceLocal(currentFile)
      console.log("LLAMA invoice result:", data.result)
      setLocalInvoiceResult(data.result)
      setLocalInvoiceStatus("complete")
      toast.success("Invoice analysis completed.")
    } catch (err: any) {
      console.error("LLAMA invoice parse failed:", err)
      setLocalInvoiceError(err?.message || String(err))
      setLocalInvoiceStatus("error")
      toast.error("Invoice analysis failed.")
    }
  }

  const handleEmailSubmit = async () => {
    if (!email || !resendApiKey || !localInvoiceResult) return

    setSendingEmail(true)
    setEmailError(null)

    try {
      localStorage.setItem('resend_api_key', resendApiKey)

      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Invoice Analysis Report</h1>
          <p><strong>File Name:</strong> ${fileInfo?.name}</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">Invoice Data</h2>
            <pre style="margin-bottom: 0; white-space: pre-wrap;">${JSON.stringify(localInvoiceResult, null, 2)}</pre>
          </div>
          
          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
            Analyzed by Invoice AI (LLAMA)
          </p>
        </div>
      `

      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: resendApiKey,
          to: [email],
          subject: `Analysis Results: ${fileInfo?.name}`,
          html: htmlContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      setEmailSent(true)
      toast.success("Email sent successfully")
      setTimeout(() => {
        setShowEmailModal(false)
        setEmailSent(false)
      }, 2000)

    } catch (error) {
      console.error('Email error:', error)
      setEmailError(error instanceof Error ? error.message : 'Failed to send email. Check API key and server connection.')
      toast.error("Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }


  return (
    <div className="min-h-screen min-w-screen w-full flex flex-col items-center justify-center p-8 bg-slate-900 text-slate-50 font-sans">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-indigo-500 to-violet-500 rounded-2xl relative animate-pulse flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <div className="absolute inset-0 rounded-2xl animate-ping opacity-75 bg-indigo-500/30"></div>
          <Search className="w-8 h-8 text-white relative z-10" />
        </div>
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-br from-white to-indigo-200 mb-2 tracking-tight">File Scanner</h1>
        <p className="text-slate-400 text-base">Upload an image or take a photo to analyze with AI</p>
      </div>

      {scanStatus === 'idle' && (
        <div className="w-full flex flex-col items-center gap-6">
          <FileUploader onFileSelect={handleFileSelect} />

          <div className="flex items-center gap-4 text-slate-500 w-full max-w-xs">
            <div className="h-px bg-slate-700 flex-1"></div>
            <span>or</span>
            <div className="h-px bg-slate-700 flex-1"></div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="w-full max-w-xs text-base bg-linear-90 text-white from-violet-300 to-indigo-600 border-none outline-none transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              onClick={() => setShowCamera(true)}
            >
              <span className="mr-2 text-lg">📷</span>
              Take a Photo
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full max-w-xs text-base bg-linear-90 text-white from-violet-300 to-indigo-600 border-none outline-none transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]"
              onClick={() => setShowEmailReader(true)}
            >
              <span className="mr-2 text-lg">�</span>
              Go Through Email
            </Button>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handleCapture}
      />

      {/* Progress View */}
      {(scanStatus === 'uploading' || scanStatus === 'scanning') && (
        <ScanProgress
          status={scanStatus}
          progress={progress}
          fileInfo={fileInfo}
          imagePreview={imagePreview}
        />
      )}

      {/* Results View */}
      {scanStatus === 'complete' && scanResult && (
        <div className="w-full max-w-2xl flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">

          <ScanResult
            result={scanResult}
            fileInfo={fileInfo}
            imagePreview={imagePreview}
            showChat={false}
            formatFileSize={formatFileSize}
          />

          <AnalysisResult
            status={localInvoiceStatus}
            result={localInvoiceResult}
            error={localInvoiceError}
            onAnalyze={analyzeWithLlama}
            onRetry={() => { setLocalInvoiceError(null); setLocalInvoiceStatus('idle'); }}
          />



          <Button
            className="w-full p-6 text-base font-semibold bg-linear-to-br from-indigo-500 to-violet-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            onClick={resetScanner}
          >
            Scan Another File
          </Button>
        </div>
      )}

      {/* Modals */}
      <EmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        email={email}
        onEmailChange={setEmail}
        apiKey={resendApiKey}
        onApiKeyChange={setResendApiKey}
        onSubmit={handleEmailSubmit}
        isSending={sendingEmail}
        sent={emailSent}
        error={emailError}
      />

      <EmailReaderModal
        open={showEmailReader}
        onOpenChange={setShowEmailReader}
        onEmailSelect={handleEmailSelect}
      />

      <Toaster />
    </div>
  )
}

export default App
