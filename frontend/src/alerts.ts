import Swal from 'sweetalert2'

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
    cancelButtonText: 'Volver',
    reverseButtons: true,
    focusCancel: true,
  })

  return result.isConfirmed
}

export async function showSuccess(title: string, text?: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'Aceptar',
  })
}

export async function showError(title: string, text: string): Promise<void> {
  await Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'Aceptar',
  })
}

export async function showSuccessToast(title: string): Promise<void> {
  await Swal.fire({
    title,
    icon: 'success',
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  })
}
