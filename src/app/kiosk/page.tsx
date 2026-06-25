'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, CheckCircle2, XCircle, Clock } from 'lucide-react'

type Employee = {
  id: string
  name: string
  avatarUrl: string | null
}

export default function KioskPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch employees
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

  // Start camera when PIN modal opens
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
      setMessage({ text: '无法访问摄像头，请检查权限', type: 'error' })
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
    if (pin.length < 4) {
      setPin(prev => prev + num)
    }
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
        return canvas.toDataURL('image/jpeg', 0.5) // compress to 50%
      }
    }
    return null
  }

  const handleSubmit = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    if (pin.length !== 4) {
      setMessage({ text: '请输入4位密码', type: 'error' })
      return
    }

    const photoData = capturePhoto()
    if (!photoData) {
      setMessage({ text: '拍照失败，请重试', type: 'error' })
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
          text: `${selectedEmployee?.name} ${type === 'CHECK_IN' ? '上班' : '下班'}打卡成功！`, 
          type: 'success' 
        })
        setTimeout(() => {
          setSelectedEmployee(null)
        }, 2000)
      } else {
        setMessage({ text: data.error || '打卡失败', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: '网络错误，请稍后重试', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-50">加载中...</div>
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 p-8">
      {/* Header */}
      <header className="mb-12 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">奶茶店打卡系统</h1>
          <p className="mt-2 text-gray-500">请选择你的头像进行打卡</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-4xl font-bold tracking-tight text-blue-600">
            {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-gray-500">
            {currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
        </div>
      </header>

      {/* Main Content - Employee Grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmployee(emp)}
            className="group flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm transition-all hover:scale-105 hover:bg-blue-50 hover:shadow-md"
          >
            <div className="mb-4 overflow-hidden rounded-full border-4 border-gray-100 group-hover:border-blue-200">
              <img 
                src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${emp.name}&background=random`} 
                alt={emp.name} 
                className="h-24 w-24 object-cover"
              />
            </div>
            <span className="text-lg font-medium text-gray-800">{emp.name}</span>
          </button>
        ))}
      </div>

      {/* Check-in Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            
            {/* Left side - Camera */}
            <div className="relative flex w-1/2 flex-col bg-gray-900">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="h-full w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-white backdrop-blur-md">
                  <Camera size={20} />
                  <span>请正对摄像头</span>
                </div>
              </div>
            </div>

            {/* Right side - PIN Input */}
            <div className="flex w-1/2 flex-col p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedEmployee.avatarUrl || `https://ui-avatars.com/api/?name=${selectedEmployee.name}`} 
                    alt={selectedEmployee.name} 
                    className="h-16 w-16 rounded-full"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedEmployee.name}</h2>
                    <p className="text-gray-500">请输入4位打卡密码</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
                >
                  <XCircle size={32} />
                </button>
              </div>

              {/* PIN Display */}
              <div className="mb-8 flex justify-center gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-3xl font-bold ${
                      pin[i] ? 'border-blue-500 text-blue-600' : 'border-gray-200 text-transparent'
                    }`}
                  >
                    {pin[i] ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Message Display */}
              {message && (
                <div className={`mb-6 rounded-xl p-4 text-center ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinInput(num.toString())}
                    className="rounded-2xl bg-gray-50 py-4 text-2xl font-semibold text-gray-800 active:bg-gray-200"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="rounded-2xl bg-gray-50 py-4 text-xl font-semibold text-gray-600 active:bg-gray-200"
                >
                  删除
                </button>
                <button
                  onClick={() => handlePinInput('0')}
                  className="rounded-2xl bg-gray-50 py-4 text-2xl font-semibold text-gray-800 active:bg-gray-200"
                >
                  0
                </button>
                <button
                  onClick={() => setPin('')}
                  className="rounded-2xl bg-gray-50 py-4 text-xl font-semibold text-gray-600 active:bg-gray-200"
                >
                  清空
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSubmit('CHECK_IN')}
                  disabled={submitting || pin.length !== 4}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  <Clock size={24} />
                  上班打卡
                </button>
                <button
                  onClick={() => handleSubmit('CHECK_OUT')}
                  disabled={submitting || pin.length !== 4}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 font-bold text-white transition-all hover:bg-orange-600 disabled:opacity-50"
                >
                  <CheckCircle2 size={24} />
                  下班打卡
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}