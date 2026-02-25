
import React, { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Send, Users, Bot } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

interface ChatInterfaceProps {
    messages: ChatMessage[]
    input: string
    isSending: boolean
    onInputChange: (value: string) => void
    onSend: () => void
    onBack: () => void
}

export function ChatInterface({
    messages,
    input,
    isSending,
    onInputChange,
    onSend,
    onBack
}: ChatInterfaceProps) {
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    return (
        <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700 h-[600px] flex flex-col">
            <CardHeader className="flex flex-row items-center gap-4 py-4 border-b border-slate-700">
                <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-300 hover:text-white hover:bg-slate-700">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <CardTitle className="text-lg text-slate-200">💬 Chat with AI</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm", msg.role === 'user' ? "bg-indigo-500/20 text-indigo-300" : "bg-emerald-500/20 text-emerald-300")}>
                                    {msg.role === 'user' ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={cn("p-3 rounded-2xl text-sm leading-relaxed", msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-slate-700 text-slate-200 rounded-tl-sm")}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <div className="flex gap-3 mr-auto">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="p-3 bg-slate-700 text-slate-200 rounded-2xl rounded-tl-sm flex items-center gap-1 h-10">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </ScrollArea>
                <div className="mt-4 flex gap-3">
                    <Textarea
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask a question about this document..."
                        className="min-h-[50px] bg-slate-900/50 border-slate-700 text-slate-200 resize-none focus-visible:ring-indigo-500"
                    />
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 h-auto"
                        onClick={onSend}
                        disabled={!input.trim() || isSending}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
