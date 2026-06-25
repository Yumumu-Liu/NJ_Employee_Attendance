'use client'

import { useState, useEffect } from 'react'
import { format, startOfDay, subDays, addDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Download, Image as ImageIcon } from 'lucide-react'
import * as XLSX from 'xlsx'

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
  avatarUrl: string
  checkIn: Record | null
  checkOut: Record | null
  status: 'normal' | 'missing_in' | 'missing_out' | 'absent'
}

export default function AdminDashboard() {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()))
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const [photoModal, setPhotoModal] = useState<string | null>(null)

  useEffect(() => {
    fetchRecords(currentDate)
  }, [currentDate])

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

  // Process raw records into daily attendance view (Option 2: Calendar View)
  const processAttendance = (): DailyAttendance[] => {
    const attendanceMap = new Map<string, DailyAttendance>()

    records.forEach(record => {
      if (!attendanceMap.has(record.employeeId)) {
        attendanceMap.set(record.employeeId, {
          employeeId: record.employeeId,
          employeeName: record.employee.name,
          avatarUrl: record.employee.avatarUrl,
          checkIn: null,
          checkOut: null,
          status: 'absent'
        })
      }

      const empData = attendanceMap.get(record.employeeId)!

      if (record.type === 'CHECK_IN') {
        // Keep the earliest check-in
        if (!empData.checkIn || new Date(record.timestamp) < new Date(empData.checkIn.timestamp)) {
          empData.checkIn = record
        }
      } else if (record.type === 'CHECK_OUT') {
        // Keep the latest check-out
        if (!empData.checkOut || new Date(record.timestamp) > new Date(empData.checkOut.timestamp)) {
          empData.checkOut = record
        }
      }
    })

    // Calculate status
    return Array.from(attendanceMap.values()).map(data => {
      if (data.checkIn && data.checkOut) data.status = 'normal'
      else if (data.checkIn && !data.checkOut) data.status = 'missing_out'
      else if (!data.checkIn && data.checkOut) data.status = 'missing_in'
      return data
    })
  }

  const handleExportExcel = () => {
    const processedData = processAttendance()
    
    const excelData = processedData.map(data => ({
      '员工姓名': data.employeeName,
      '考勤日期': format(currentDate, 'yyyy-MM-dd'),
      '上班打卡时间': data.checkIn ? format(new Date(data.checkIn.timestamp), 'HH:mm:ss') : '未打卡',
      '下班打卡时间': data.checkOut ? format(new Date(data.checkOut.timestamp), 'HH:mm:ss') : '未打卡',
      '考勤状态': 
        data.status === 'normal' ? '正常' : 
        data.status === 'missing_out' ? '缺下班卡' : 
        data.status === 'missing_in' ? '缺上班卡' : '缺勤'
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '考勤记录')
    
    const fileName = `奶茶店考勤表_${format(currentDate, 'yyyy-MM-dd')}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  const attendanceData = processAttendance()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <header className="mb-8 flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">考勤管理后台</h1>
            <p className="text-sm text-gray-500 mt-1">查看和导出每日考勤数据</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
              <button 
                onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                className="rounded p-2 text-gray-600 hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 px-4 font-medium text-gray-700">
                <Calendar size={18} />
                {format(currentDate, 'yyyy年MM月dd日', { locale: zhCN })}
              </div>
              <button 
                onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                className="rounded p-2 text-gray-600 hover:bg-gray-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
            >
              <Download size={18} />
              导出 Excel
            </button>
          </div>
        </header>

        {/* Attendance Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-gray-500">加载中...</div>
          ) : attendanceData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <Calendar size={48} className="mb-4 opacity-20" />
              <p>当日暂无任何打卡记录</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">员工</th>
                  <th className="px-6 py-4 font-medium">上班打卡</th>
                  <th className="px-6 py-4 font-medium">下班打卡</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendanceData.map((data) => (
                  <tr key={data.employeeId} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={data.avatarUrl || `https://ui-avatars.com/api/?name=${data.employeeName}`} 
                          alt="" 
                          className="h-10 w-10 rounded-full"
                        />
                        <span className="font-medium text-gray-900">{data.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {data.checkIn ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {format(new Date(data.checkIn.timestamp), 'HH:mm')}
                          </span>
                          <button 
                            onClick={() => setPhotoModal(data.checkIn!.photoUrl)}
                            className="text-blue-500 hover:text-blue-700"
                            title="查看打卡照片"
                          >
                            <ImageIcon size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">未打卡</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {data.checkOut ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {format(new Date(data.checkOut.timestamp), 'HH:mm')}
                          </span>
                          <button 
                            onClick={() => setPhotoModal(data.checkOut!.photoUrl)}
                            className="text-blue-500 hover:text-blue-700"
                            title="查看打卡照片"
                          >
                            <ImageIcon size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">未打卡</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {data.status === 'normal' && <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">正常</span>}
                      {data.status === 'missing_out' && <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">缺下班卡</span>}
                      {data.status === 'missing_in' && <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">缺上班卡</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {photoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPhotoModal(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-black">
            <img src={photoModal} alt="打卡照片" className="h-auto w-full object-contain" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4 text-center text-white">
              点击任意处关闭
            </div>
          </div>
        </div>
      )}
    </div>
  )
}