import { beforeEach, describe, expect, it, vi } from 'vitest'

const fire = vi.hoisted(() => vi.fn())
vi.mock('sweetalert2', () => ({ default: { fire } }))

import { alertLabels, confirmDestructive, showError, showSuccess, showSuccessToast } from './alerts'

beforeEach(() => {
  fire.mockReset()
  fire.mockResolvedValue({ isConfirmed: true })
  document.documentElement.lang = 'es-419'
})

describe('BarberTrix SweetAlert2', () => {
  it('uses the active interface locale for action labels', () => {
    expect(alertLabels('es-419')).toEqual({ accept: 'Aceptar', cancel: 'Volver' })
    expect(alertLabels('en')).toEqual({ accept: 'OK', cancel: 'Back' })
    expect(alertLabels('pt-BR').cancel).toBe('Voltar')
    expect(alertLabels('fr').cancel).toBe('Retour')
    expect(alertLabels('unknown')).toEqual({ accept: 'OK', cancel: 'Back' })
  })

  it('requires explicit destructive confirmation and prevents accidental outside dismissal', async () => {
    expect(await confirmDestructive('Cancelar cita', 'Turno 51', 'Sí, cancelar')).toBe(true)
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'Cancelar cita',
      text: 'Turno 51',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      focusCancel: true,
      allowOutsideClick: false,
      buttonsStyling: false,
      showCancelButton: true,
      customClass: expect.objectContaining({ popup: 'bt-swal-popup' }),
    }))
  })

  it('does not authorize actions on cancellation or dismissal', async () => {
    fire.mockResolvedValueOnce({ isConfirmed: false })
    expect(await confirmDestructive('Eliminar', 'Seguro?', 'Eliminar')).toBe(false)
    fire.mockResolvedValueOnce({ isDismissed: true })
    expect(await confirmDestructive('Eliminar', 'Seguro?', 'Eliminar')).toBe(false)
  })

  it('renders localized success and error dialogs with plain text', async () => {
    document.documentElement.lang = 'en'
    await showSuccess('Saved', 'Done')
    await showError('Failure', '<script>alert(1)</script>')
    expect(fire).toHaveBeenNthCalledWith(1, expect.objectContaining({
      icon: 'success', title: 'Saved', text: 'Done', confirmButtonText: 'OK',
    }))
    expect(fire).toHaveBeenNthCalledWith(2, expect.objectContaining({
      icon: 'error', text: '<script>alert(1)</script>', confirmButtonText: 'OK',
    }))
    expect(fire.mock.calls[1][0]).not.toHaveProperty('html')
  })

  it('renders nonblocking success toasts with the BarberTrix theme', async () => {
    await showSuccessToast('Guardado')
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({
      toast: true,
      icon: 'success',
      timer: 3000,
      showConfirmButton: false,
      customClass: expect.objectContaining({ popup: 'bt-swal-popup bt-swal-toast' }),
    }))
  })
})
