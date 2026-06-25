import { createContext, useContext } from 'react'

export type Language = 'en' | 'zh'

export const translations = {
  en: {
    // Common
    language: 'Language',
    english: 'English',
    chinese: '中文',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',

    // Home/Nav
    attendance: 'Attendance System',
    checkIn: 'Check In',
    admin: 'Admin Dashboard',
    leiji: 'Ningji Lemon Tea',

    // Kiosk
    selectEmployee: 'Select Employee',
    enterPin: 'Enter PIN',
    pinPlaceholder: '••••',
    takeSelfie: 'Take Selfie',
    capturePhoto: 'Capture Photo',
    confirmCheckIn: 'Confirm Check-In',
    confirmCheckOut: 'Confirm Check-Out',
    checkInTime: 'Check-In Time',
    checkOutTime: 'Check-Out Time',
    success_checkIn: 'Check-in successful!',
    success_checkOut: 'Check-out successful!',
    error_invalidPin: 'Invalid PIN',
    error_camera: 'Unable to access camera',
    error_employeeNotFound: 'Employee not found',
    currentTime: 'Current Time',
    back: 'Back',

    // Admin
    adminDashboard: 'Admin Dashboard',
    attendanceRecords: 'Attendance Records',
    selectDate: 'Select Date',
    prev: 'Previous',
    next: 'Next',
    checkInOut: 'Check-In / Check-Out',
    status: 'Status',
    normal: 'Normal',
    missingCheckIn: 'Missing Check-In',
    missingCheckOut: 'Missing Check-Out',
    absent: 'Absent',
    viewPhoto: 'View Photo',
    exportExcel: 'Export to Excel',
    employees: 'Employees',
    addEmployee: 'Add Employee',
    importEmployees: 'Import Employees',
    employeeList: 'Employee List',
    employeeName: 'Employee Name',
    pin: 'PIN',
    workType: 'Work Type',
    fullTime: 'Full-Time',
    partTime: 'Part-Time',
    workStartTime: 'Work Start Time',
    checkInTime_label: 'Check-In Time',
    noEmployees: 'No employees yet',
    confirmDelete: 'Are you sure you want to delete this employee?',
    deleteSuccess: 'Employee deleted successfully',
    deleteError: 'Failed to delete employee',
    uploadExcel: 'Upload Excel File',
    importSuccess: 'Employees imported successfully',
    importError: 'Failed to import employees',
    excelTemplate: 'Download Template',
  },
  zh: {
    // Common
    language: '语言',
    english: 'English',
    chinese: '中文',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    loading: '加载中...',
    error: '错误',
    success: '成功',

    // Home/Nav
    attendance: '考勤系统',
    checkIn: '打卡',
    admin: '管理后台',
    leiji: '宁季手打柠檬茶',

    // Kiosk
    selectEmployee: '选择员工',
    enterPin: '输入密码',
    pinPlaceholder: '••••',
    takeSelfie: '拍照自拍',
    capturePhoto: '确认拍照',
    confirmCheckIn: '确认签到',
    confirmCheckOut: '确认签出',
    checkInTime: '签到时间',
    checkOutTime: '签出时间',
    success_checkIn: '签到成功！',
    success_checkOut: '签出成功！',
    error_invalidPin: '密码错误',
    error_camera: '无法访问摄像头',
    error_employeeNotFound: '员工不存在',
    currentTime: '当前时间',
    back: '返回',

    // Admin
    adminDashboard: '管理后台',
    attendanceRecords: '考勤记录',
    selectDate: '选择日期',
    prev: '上一天',
    next: '下一天',
    checkInOut: '签到 / 签出',
    status: '状态',
    normal: '正常',
    missingCheckIn: '缺签到',
    missingCheckOut: '缺签出',
    absent: '缺席',
    viewPhoto: '查看照片',
    exportExcel: '导出 Excel',
    employees: '员工管理',
    addEmployee: '添加员工',
    importEmployees: '批量导入',
    employeeList: '员工列表',
    employeeName: '员工姓名',
    pin: '密码',
    workType: '工作类型',
    fullTime: '全职',
    partTime: '兼职',
    workStartTime: '打卡开始时间',
    checkInTime_label: '签到时间',
    noEmployees: '暂无员工',
    confirmDelete: '确定要删除该员工吗？',
    deleteSuccess: '员工删除成功',
    deleteError: '员工删除失败',
    uploadExcel: '上传 Excel 文件',
    importSuccess: '员工导入成功',
    importError: '员工导入失败',
    excelTemplate: '下载模板',
  },
}

export type TranslationKey = keyof typeof translations.en

type I18nContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem('language')
  return (stored === 'zh' || stored === 'en') ? stored : 'en'
}

export function setStoredLanguage(lang: Language) {
  if (typeof window === 'undefined') return
  localStorage.setItem('language', lang)
}
