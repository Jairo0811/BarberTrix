import Swal from 'sweetalert2'

type DialogLabels = { accept: string; cancel: string }

// The UI locale is managed by I18nProvider and reflected on <html lang>.
const labels: Record<string, DialogLabels> = {
  es: { accept: 'Aceptar', cancel: 'Volver' },
  en: { accept: 'OK', cancel: 'Back' },
  pt: { accept: 'Confirmar', cancel: 'Voltar' },
  fr: { accept: 'Valider', cancel: 'Retour' },
  de: { accept: 'Bestätigen', cancel: 'Zurück' },
  it: { accept: 'Conferma', cancel: 'Indietro' },
  nl: { accept: 'Bevestigen', cancel: 'Terug' },
  ht: { accept: 'Konfime', cancel: 'Retounen' },
  ja: { accept: '確認', cancel: '戻る' },
  ko: { accept: '확인', cancel: '돌아가기' },
}

export function alertLabels(locale = document.documentElement.lang): DialogLabels {
  const language = locale.toLowerCase().split('-')[0]
  return labels[language] ?? labels.en
}

const modalClasses = {
  popup: 'bt-swal-popup',
  title: 'bt-swal-title',
  htmlContainer: 'bt-swal-description',
  confirmButton: 'bt-swal-confirm',
  cancelButton: 'bt-swal-cancel',
}

export async function confirmDestructive(
  title: string,
  text: string,
  confirmButtonText: string,
): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: alertLabels().cancel,
    reverseButtons: true,
    focusCancel: true,
    returnFocus: true,
    allowOutsideClick: false,
    buttonsStyling: false,
    customClass: modalClasses,
  })

  return result.isConfirmed === true
}

export async function showSuccess(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: alertLabels().accept,
    buttonsStyling: false,
    customClass: modalClasses,
  })
}

export async function showError(title: string, text: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: alertLabels().accept,
    buttonsStyling: false,
    customClass: modalClasses,
  })
}

export async function showSuccessToast(title: string): Promise<void> {
  await Swal.fire({
    title,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: 'bt-swal-popup bt-swal-toast',
      title: 'bt-swal-title',
      timerProgressBar: 'bt-swal-progress',
    },
  })
}
