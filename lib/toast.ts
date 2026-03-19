import { toast as sonnerToast } from 'sonner'

type ToastOptions = {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

function toastFn(options: ToastOptions | string) {
  if (typeof options === 'string') {
    sonnerToast(options)
    return
  }
  const { title, description, variant } = options
  if (variant === 'destructive') {
    sonnerToast.error(title ?? 'Error', { description })
  } else {
    sonnerToast(title ?? '', { description })
  }
}

toastFn.success = (msg: string, opts?: { description?: string }) =>
  sonnerToast.success(msg, opts)

toastFn.error = (msg: string, opts?: { description?: string }) =>
  sonnerToast.error(msg, opts)

toastFn.info = (msg: string, opts?: { description?: string }) =>
  sonnerToast.info(msg, opts)

toastFn.warning = (msg: string, opts?: { description?: string }) =>
  sonnerToast.warning(msg, opts)

toastFn.loading = (msg: string, opts?: { description?: string }) =>
  sonnerToast.loading(msg, opts)

toastFn.promise = sonnerToast.promise

export const toast = toastFn
