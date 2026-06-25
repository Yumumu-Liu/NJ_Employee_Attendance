'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, CheckCircle2, XCircle, Clock, Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

type Employee = {
  id: string
  name: string
  avatarUrl: string | null
  workType?: string
}

export default function KioskPage() {
  const { language, setLanguage, t } = useI18n()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      startCamera()
    } else {
      stopCamera()
      setPin('')
      setMessage(null)
    }
    return () => stopCamera()
  }, [selectedEmployee])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setMessage({ text: t('error_camera'), type: 'error' })
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const handlePinInput = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num)
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  const capturePhoto = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.5)
      }
    }
    return null
  }

  const handleSubmit = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    if (pin.length !== 4) {
      setMessage({ text: t('error_invalidPin'), type: 'error' })
      return
    }

    const photoData = capturePhoto()
    if (!photoData) {
      setMessage({ text: t('error_camera'), type: 'error' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee?.id,
          pin,
          type,
          photoData
        })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({
          text: type === 'CHECK_IN' ? t('success_checkIn') : t('success_checkOut'),
          type: 'success'
        })
        setTimeout(() => {
          setSelectedEmployee(null)
        }, 2000)
      } else {
        setMessage({ text: data.error || t('error'), type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'Network error', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">{t('loading')}</div>
  }

  return (
    <div className="flex min-h-screen flex-col p-8">
      {/* Top Navigation */}
      <div className="mb-6 flex justify-between items-center">
        <a
          href="/admin"
          className="glass-sm px-4 py-2 font-medium text-gray-600 hover:text-gray-900 transition-all"
        >
          Admin
        </a>

        <div className="flex gap-2">
          {(['en', 'zh'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`glass-sm px-4 py-2 font-medium transition-all ${
                language === lang
                  ? 'accent-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lang === 'en' ? 'EN' : '中文'}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="glass mb-12 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold" style={{ color: 'var(--primary)' }}>{t('leiji')}</h1>
            <p className="mt-2 text-gray-600">{t('selectEmployee')}</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-5xl font-bold" style={{ color: 'var(--primary)' }}>
              {currentTime.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-gray-600 text-sm">
              {language === 'zh'
                ? currentTime.toLocaleDateString('zh-CN')
                : currentTime.toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>
      </header>

      {/* Full-time Section */}
      {employees.some(e => e.workType === 'full') && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            {language === 'zh' ? '全职员工' : 'Full-Time'}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {employees
              .filter(e => e.workType === 'full')
              .map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className="group glass-sm flex flex-col items-center p-6 transition-all hover:scale-105 hover:shadow-lg"
                >
                  <div className="mb-4 overflow-hidden rounded-full border-4" style={{ borderColor: 'var(--primary-light)' }}>
                    <img
                      src="/crocodile-avatar.png"
                      alt={emp.name}
                      className="h-24 w-24 object-cover"
                    />
                  </div>
                  <span className="text-lg font-medium text-gray-800">{emp.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Part-time Section */}
      {employees.some(e => e.workType === 'part') && (
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>
            {language === 'zh' ? '兼职员工' : 'Part-Time'}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {employees
              .filter(e => e.workType === 'part')
              .map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className="group glass-sm flex flex-col items-center p-6 transition-all hover:scale-105 hover:shadow-lg"
                >
                  <div className="mb-4 overflow-hidden rounded-full border-4" style={{ borderColor: 'var(--primary-light)' }}>
                    <img
                      src="/crocodile-avatar.png"
                      alt={emp.name}
                      className="h-24 w-24 object-cover"
                    />
                  </div>
                  <span className="text-lg font-medium text-gray-800">{emp.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="glass flex w-full max-w-4xl overflow-hidden shadow-2xl">
            {/* Camera Side */}
            <div className="relative flex w-1/2 flex-col bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <div className="glass flex items-center gap-2 px-4 py-2 text-white">
                  <Camera size={20} />
                  <span>{t('takeSelfie')}</span>
                </div>
              </div>
            </div>

            {/* PIN Side */}
            <div className="flex w-1/2 flex-col p-10">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src="/crocodile-avatar.png"
                    alt={selectedEmployee.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                    <p className="text-gray-600">{t('enterPin')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="rounded-full p-2 hover:bg-gray-200 transition-all"
                >
                  <XCircle size={32} style={{ color: 'var(--primary)' }} />
                </button>
              </div>

              {/* PIN Display */}
              <div className="mb-8 flex justify-center gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="glass-sm flex h-16 w-16 items-center justify-center text-3xl font-bold"
                    style={{ borderColor: pin[i] ? 'var(--primary)' : 'var(--glass-border)' }}
                  >
                    {pin[i] ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Message */}
              {message && (
                <div className={`mb-6 rounded-xl p-4 text-center font-medium ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinInput(num.toString())}
                    className="glass-sm py-4 text-2xl font-semibold hover:scale-105 transition-transform"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="glass-sm py-4 text-sm font-semibold hover:scale-105 transition-transform"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handlePinInput('0')}
                  className="glass-sm py-4 text-2xl font-semibold hover:scale-105 transition-transform"
                >
                  0
                </button>
                <button
                  onClick={() => setPin('')}
                  className="glass-sm py-4 text-sm font-semibold hover:scale-105 transition-transform"
                >
                  Clear
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSubmit('CHECK_IN')}
                  disabled={submitting || pin.length !== 4}
                  className="accent-primary flex items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all disabled:opacity-50"
                >
                  <Clock size={24} />
                  {t('confirmCheckIn')}
                </button>
                <button
                  onClick={() => handleSubmit('CHECK_OUT')}
                  disabled={submitting || pin.length !== 4}
                  className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(102, 204, 0, 0.2)', color: 'var(--primary)' }}
                >
                  <CheckCircle2 size={24} />
                  {t('confirmCheckOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}