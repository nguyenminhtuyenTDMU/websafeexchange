import { useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const [location] = useLocation()
  const first = useRef(true)
  // Đổi trang thì thông báo cũ không còn đúng ngữ cảnh: đóng, trừ thông báo vừa bật (ví dụ "Đã niêm yết" trước khi chuyển sang trang giao dịch)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const now = Date.now()
    toasts.forEach((t) => { if (now - (t.createdAt ?? 0) > 1500) dismiss(t.id) })
  }, [location]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ToastProvider duration={6000}>
      {toasts.map(function ({ id, title, description, action, createdAt: _c, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
