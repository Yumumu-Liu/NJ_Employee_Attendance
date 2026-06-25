'use client'

import { useState, useEffect, useRef } from 'react'
import { format, startOfDay, subDays, addDays } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Download, Trash2, Plus, Upload, LogOut, Lock } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useI18n } from '@/lib/i18n'
import { isAdminLoggedIn, setAdminLoggedIn, verifyAdminPassword } from '@/lib/admin-auth'
import type { Language } from '@/lib/i18n'

type Employee = {
  id: string
  name: string
  pin: string
  workType: string
  workTime: string | null
  isActive: boolean
}

type Record = {
  id: string
  employeeId: string
  type: string
  timestamp: string
  photoUrl: string
  employee: {
    name: string
    avatarUrl: string
  }
}

type DailyAttendance = {
  employeeId: string
  employeeName: string
  checkIn: Record | null
  checkOut: Record | null
  status: 'normal' | 'missing_in' | 'missing_out' | 'absent'
}

export default function AdminDashboard() {
  const { language, setLanguage, t } = useI18n()
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()))
  const [records, setRecords] = useState<Record[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [photoModal, setPhotoModal] = useState<string | null>(null)
  const [tab, setTab] = useState<'attendance' | 'employees'>('attendance')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ name: '', pin: '', workType: 'full', workTime: '' })
  const [formMessage, setFormMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if already logged in on mount
  useEffect(() => {
    setAuthenticated(isAdminLoggedIn())
  }, [])

  useEffect(() => {
    if (!authenticated) return

    fetchRecords(currentDate)
    fetchEmployees()
  }, [currentDate, authenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    if (!password) {
      setLoginError('Please enter password')
      return
    }

    const verified = await verifyAdminPassword(password)

    if (verified) {
      setAdminLoggedIn(true)
      setAuthenticated(true)
      setPassword('')
    } else {
      setLoginError('Invalid password')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setAdminLoggedIn(false)
    setAuthenticated(false)
    setPassword('')
    setFormMessage(null)
  }

  const fetchRecords = async (date: Date) => {
    setLoading(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/records?date=${dateStr}`)
      const data = await res.json()
      setRecords(data)
    } catch (err) {
      console.error('Failed to fetch records', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      setEmployees(data)
    } catch (err) {
      console.error('Failed to fetch employees', err)
    }
  }

  const processAttendance = (): DailyAttendance[] => {
    const attendanceMap = new Map<string, DailyAttendance>()

    records.forEach(record => {
      if (!attendanceMap.has(record.employeeId)) {
        attendanceMap.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employee.name,
          checkIn: null,
          checkOut: null,
          status: 'absent'
        })
      }

      const empData = attendanceMap.get(record.employeeId)!

      if (record.type === 'CHECK_IN') {
        if (!empData.checkIn || new Date(record.timestamp) < new Date(empData.checkIn.timestamp)) {
          empData.checkIn = record
        }
      } else if (record.type === 'CHECK_OUT') {
        if (!empData.checkOut || new Date(record.timestamp) > new Date(empData.checkOut.timestamp)) {
          empData.checkOut = record
        }
      }
    })

    return Array.from(attendanceMap.values()).map(data => {
      if (data.checkIn && data.checkOut) data.status = 'normal'
      else if (data.checkIn && !data.checkOut) data.status = 'missing_out'
      else if (!data.checkIn && data.checkOut) data.status = 'missing_in'
      return data
    })
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormMessage(null)

    if (!newEmployee.name || !newEmployee.pin) {
      setFormMessage({ text: 'Please fill all required fields', type: 'error' })
      return
    }

    if (newEmployee.pin.length !== 4 || !/^\d{4}$/.test(newEmployee.pin)) {
      setFormMessage({ text: 'PIN must be 4 digits', type: 'error' })
      return
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmployee.name,
          pin: newEmployee.pin,
          workType: newEmployee.workType,
          workTime: newEmployee.workTime || null
        })
      })

      if (res.ok) {
        setFormMessage({ text: 'Employee added successfully!', type: 'success' })
        setNewEmployee({ name: '', pin: '', workType: 'full', workTime: '' })
        setTimeout(() => {
          setShowAddForm(false)
          fetchEmployees()
        }, 1500)
      } else {
        const data = await res.json()
        setFormMessage({ text: data.error, type: 'error' })
      }
    } catch (err) {
      setFormMessage({ text: 'Failed to add employee', type: 'error' })
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure?')) return

    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchEmployees()
      }
    } catch (err) {
      console.error('Failed to delete employee', err)
    }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setFormMessage({
          text: `Imported ${data.imported} employees!`,
          type: 'success'
        })
        fetchEmployees()
      } else {
        setFormMessage({ text: data.error, type: 'error' })
      }
    } catch (err) {
      setFormMessage({ text: 'Import failed', type: 'error' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExportExcel = () => {
    const processedData = processAttendance()

    const excelData = processedData.map(data => ({
      'Employee Name': data.employeeName,
      'Date': format(currentDate, 'yyyy-MM-dd'),
      'Check-In': data.checkIn ? format(new Date(data.checkIn.timestamp), 'HH:mm:ss') : '-',
      'Check-Out': data.checkOut ? format(new Date(data.checkOut.timestamp), 'HH:mm:ss') : '-',
      'Status': data.status
    }))

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    XLSX.writeFile(wb, `attendance_${format(currentDate, 'yyyy-MM-dd')}.xlsx`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'accent-primary-light'
      case 'missing_in':
        return 'bg-yellow-100'
      case 'missing_out':
        return 'bg-yellow-100'
      default:
        return 'bg-red-100'
    }
  }

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass w-full max-w-md p-8">
          <div className="flex items-center justify-center mb-8">
            <Lock size={48} style={{ color: 'var(--primary)' }} />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--primary)' }}>
            Admin Login
          </h1>
          <p className="text-center text-gray-600 mb-8">Enter password to access dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-sm w-full px-4 py-3 text-lg"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="accent-primary w-full py-3 font-bold text-white rounded-lg"
            >
              Login
            </button>
          </form>

          <div className="mt-6 flex justify-end">
            {(['en', 'zh'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`glass-sm px-3 py-1 mx-1 font-medium transition-all ${
                  language === lang
                    ? 'accent-primary text-white'
                    : 'text-gray-600'
                }`}
              >
                {lang === 'en' ? 'EN' : '中文'}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen p-8">
      {/* Language Toggle + Logout */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>

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
      <header className="glass mb-8 p-8">
        <h1 className="text-4xl font-bold" style={{ color: 'var(--primary)' }}>
          {t('adminDashboard')}
        </h1>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setTab('attendance')}
          className={`glass-sm px-6 py-3 font-medium transition-all ${
            tab === 'attendance' ? 'accent-primary text-white' : 'text-gray-600'
          }`}
        >
          {t('attendanceRecords')}
        </button>
        <button
          onClick={() => setTab('employees')}
          className={`glass-sm px-6 py-3 font-medium transition-all ${
            tab === 'employees' ? 'accent-primary text-white' : 'text-gray-600'
          }`}
        >
          {t('employees')}
        </button>
      </div>

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div>
          {/* Date Picker */}
          <div className="glass mb-8 flex items-center justify-between p-6">
            <button
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="glass-sm p-2 hover:scale-110 transition-transform"
            >
              <ChevronLeft />
            </button>
            <input
              type="date"
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={(e) => setCurrentDate(startOfDay(new Date(e.target.value)))}
              className="glass-sm px-4 py-2 text-center font-semibold"
            />
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
              className="glass-sm p-2 hover:scale-110 transition-transform"
            >
              <ChevronRight />
            </button>
            <button
              onClick={handleExportExcel}
              className="accent-primary ml-auto flex items-center gap-2 rounded-lg px-6 py-2 font-medium text-white"
            >
              <Download size={20} />
              {t('exportExcel')}
            </button>
          </div>

          {/* Records Table */}
          <div className="glass overflow-hidden">
            <table className="w-full">
              <thead className="accent-primary-light">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">{t('employeeName')}</th>
                  <th className="px-6 py-4 text-left font-semibold">{t('checkInTime_label')}</th>
                  <th className="px-6 py-4 text-left font-semibold">{t('checkOutTime')}</th>
                  <th className="px-6 py-4 text-left font-semibold">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {processAttendance().map((data) => (
                  <tr key={data.employeeId} className={`border-t border-gray-200 ${getStatusColor(data.status)}`}>
                    <td className="px-6 py-4 font-medium">{data.employeeName}</td>
                    <td className="px-6 py-4">{data.checkIn ? format(new Date(data.checkIn.timestamp), 'HH:mm:ss') : '-'}</td>
                    <td className="px-6 py-4">{data.checkOut ? format(new Date(data.checkOut.timestamp), 'HH:mm:ss') : '-'}</td>
                    <td className="px-6 py-4 font-medium">{t(data.status === 'normal' ? 'normal' : data.status === 'missing_in' ? 'missingCheckIn' : data.status === 'missing_out' ? 'missingCheckOut' : 'absent')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {tab === 'employees' && (
        <div>
          {/* Add Employee Card */}
          <div className="glass mb-8 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{t('employeeList')}</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="glass-sm flex items-center gap-2 px-4 py-2 hover:scale-105 transition-transform disabled:opacity-50"
                >
                  <Upload size={20} />
                  {t('importEmployees')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="accent-primary flex items-center gap-2 rounded-lg px-4 py-2 text-white font-medium"
                >
                  <Plus size={20} />
                  {t('addEmployee')}
                </button>
              </div>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddEmployee} className="mb-6 space-y-4 border-t pt-6">
                {formMessage && (
                  <div className={`rounded-lg p-4 font-medium ${
                    formMessage.type === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {formMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder={t('employeeName')}
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="glass-sm rounded-lg px-4 py-2"
                  />
                  <input
                    type="text"
                    placeholder="PIN (4 digits)"
                    value={newEmployee.pin}
                    onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value })}
                    maxLength={4}
                    className="glass-sm rounded-lg px-4 py-2"
                  />
                  <select
                    value={newEmployee.workType}
                    onChange={(e) => setNewEmployee({ ...newEmployee, workType: e.target.value })}
                    className="glass-sm rounded-lg px-4 py-2"
                  >
                    <option value="full">{t('fullTime')}</option>
                    <option value="part">{t('partTime')}</option>
                  </select>
                  <input
                    type="time"
                    value={newEmployee.workTime}
                    onChange={(e) => setNewEmployee({ ...newEmployee, workTime: e.target.value })}
                    className="glass-sm rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="accent-primary flex-1 rounded-lg py-2 text-white font-medium"
                  >
                    {t('save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="glass-sm flex-1 rounded-lg py-2 font-medium"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}

            {/* Employee List */}
            <div className="space-y-3">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <div key={emp.id} className="glass-sm flex items-center justify-between p-4">
                    <div>
                      <div className="font-semibold">{emp.name}</div>
                      <div className="text-sm text-gray-600">
                        {t('pin')}: {emp.pin} | {emp.workType === 'full' ? t('fullTime') : t('partTime')}
                        {emp.workTime && ` | ${t('checkInTime_label')}: ${emp.workTime}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600">{t('noEmployees')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
