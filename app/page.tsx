"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Clock,
  Play,
  Square,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  Plane,
  Heart,
  Coffee,
  Download,
  BarChart3,
  Upload,
  Trash2,
  Database,
  AlertTriangle,
  CheckCircle,
  Edit,
} from "lucide-react"

interface TimeEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  breakMinutes: number
  workedHours: number
  type: "work" | "vacation" | "sick" | "holiday"
  note?: string
}

interface WeeklyTargetHours {
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
}

interface OvertimeEntry {
  date: string
  dailyOvertime: number
  weeklyOvertime: number
  monthlyOvertime: number
  cumulativeOvertime: number
}

interface AbsenceSettings {
  annualVacationDays: number
  currentYearVacationDays: number
}

const ZeiterfassungApp = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isTracking, setIsTracking] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [breakMinutes, setBreakMinutes] = useState(30)
  const [dailyTargetHours, setDailyTargetHours] = useState(8)
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<WeeklyTargetHours>({
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0,
  })
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [overtimeHistory, setOvertimeHistory] = useState<OvertimeEntry[]>([])
  const [absenceSettings, setAbsenceSettings] = useState<AbsenceSettings>({
    annualVacationDays: 30,
    currentYearVacationDays: 30,
  })
  const [activeTab, setActiveTab] = useState("zeiterfassung")

  const [absenceDate, setAbsenceDate] = useState("")
  const [absenceType, setAbsenceType] = useState<"vacation" | "sick" | "holiday">("vacation")
  const [absenceNote, setAbsenceNote] = useState("")

  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const [dataAlert, setDataAlert] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [editBreakMinutes, setEditBreakMinutes] = useState(30)
  const [editNote, setEditNote] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  const getTargetHoursForDate = (date: string): number => {
    const dateObj = new Date(date)
    const dayName = getWeekDayName(dateObj)
    return weeklyTargetHours[dayName]
  }

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load data from localStorage
  useEffect(() => {
    const savedEntries = localStorage.getItem("timeEntries")
    const savedTargetHours = localStorage.getItem("dailyTargetHours")
    const savedWeeklyTargetHours = localStorage.getItem("weeklyTargetHours")
    const savedOvertimeHistory = localStorage.getItem("overtimeHistory")
    const savedAbsenceSettings = localStorage.getItem("absenceSettings")

    if (savedEntries) {
      setTimeEntries(JSON.parse(savedEntries))
    }
    if (savedTargetHours) {
      setDailyTargetHours(Number(savedTargetHours))
    }
    if (savedWeeklyTargetHours) {
      setWeeklyTargetHours(JSON.parse(savedWeeklyTargetHours))
    }
    if (savedOvertimeHistory) {
      setOvertimeHistory(JSON.parse(savedOvertimeHistory))
    }
    if (savedAbsenceSettings) {
      setAbsenceSettings(JSON.parse(savedAbsenceSettings))
    }
  }, [])

  const saveToStorage = (
    entries: TimeEntry[],
    targetHours: number,
    weeklyHours: WeeklyTargetHours,
    overtime: OvertimeEntry[],
    absence: AbsenceSettings,
  ) => {
    try {
      localStorage.setItem("timeEntries", JSON.stringify(entries))
      localStorage.setItem("dailyTargetHours", targetHours.toString())
      localStorage.setItem("weeklyTargetHours", JSON.stringify(weeklyHours))
      localStorage.setItem("overtimeHistory", JSON.stringify(overtime))
      localStorage.setItem("absenceSettings", JSON.stringify(absence))
      localStorage.setItem("lastBackup", new Date().toISOString())
    } catch (error) {
      console.error("Fehler beim Speichern der Daten:", error)
      setDataAlert({ type: "error", message: "Fehler beim Speichern der Daten. Speicherplatz könnte voll sein." })
    }
  }

  const validateData = (data: any): boolean => {
    try {
      // Check if required fields exist
      if (!data.timeEntries || !Array.isArray(data.timeEntries)) return false
      if (!data.weeklyTargetHours || typeof data.weeklyTargetHours !== "object") return false
      if (!data.absenceSettings || typeof data.absenceSettings !== "object") return false

      // Validate timeEntries structure
      for (const entry of data.timeEntries) {
        if (!entry.id || !entry.date || typeof entry.workedHours !== "number") return false
        if (!["work", "vacation", "sick", "holiday"].includes(entry.type)) return false
      }

      // Validate weeklyTargetHours
      const requiredDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      for (const day of requiredDays) {
        if (typeof data.weeklyTargetHours[day] !== "number") return false
      }

      return true
    } catch {
      return false
    }
  }

  const exportData = () => {
    try {
      const exportData = {
        timeEntries,
        dailyTargetHours,
        weeklyTargetHours,
        overtimeHistory,
        absenceSettings,
        exportDate: new Date().toISOString(),
        version: "1.0",
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `zeiterfassung-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setDataAlert({ type: "success", message: "Daten erfolgreich exportiert!" })
    } catch (error) {
      console.error("Fehler beim Exportieren:", error)
      setDataAlert({ type: "error", message: "Fehler beim Exportieren der Daten." })
    }
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)

        if (!validateData(importedData)) {
          setDataAlert({ type: "error", message: "Ungültige Datei-Struktur. Bitte überprüfen Sie die Datei." })
          return
        }

        // Import data
        setTimeEntries(importedData.timeEntries || [])
        setDailyTargetHours(importedData.dailyTargetHours || 8)
        setWeeklyTargetHours(
          importedData.weeklyTargetHours || {
            monday: 8,
            tuesday: 8,
            wednesday: 8,
            thursday: 8,
            friday: 8,
            saturday: 0,
            sunday: 0,
          },
        )
        setOvertimeHistory(importedData.overtimeHistory || [])
        setAbsenceSettings(importedData.absenceSettings || { annualVacationDays: 30, currentYearVacationDays: 30 })

        // Save to localStorage
        saveToStorage(
          importedData.timeEntries || [],
          importedData.dailyTargetHours || 8,
          importedData.weeklyTargetHours || {
            monday: 8,
            tuesday: 8,
            wednesday: 8,
            thursday: 8,
            friday: 8,
            saturday: 0,
            sunday: 0,
          },
          importedData.overtimeHistory || [],
          importedData.absenceSettings || { annualVacationDays: 30, currentYearVacationDays: 30 },
        )

        setDataAlert({
          type: "success",
          message: `Daten erfolgreich importiert! ${importedData.timeEntries?.length || 0} Einträge geladen.`,
        })
      } catch (error) {
        console.error("Fehler beim Importieren:", error)
        setDataAlert({ type: "error", message: "Fehler beim Lesen der Datei. Bitte überprüfen Sie das Dateiformat." })
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const clearAllData = () => {
    if (
      window.confirm(
        "Sind Sie sicher, dass Sie alle Daten löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
      )
    ) {
      try {
        // Clear localStorage
        localStorage.removeItem("timeEntries")
        localStorage.removeItem("dailyTargetHours")
        localStorage.removeItem("weeklyTargetHours")
        localStorage.removeItem("overtimeHistory")
        localStorage.removeItem("absenceSettings")
        localStorage.removeItem("lastBackup")

        // Reset state
        setTimeEntries([])
        setDailyTargetHours(8)
        setWeeklyTargetHours({ monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 })
        setOvertimeHistory([])
        setAbsenceSettings({ annualVacationDays: 30, currentYearVacationDays: 30 })

        setDataAlert({ type: "success", message: "Alle Daten wurden erfolgreich gelöscht." })
      } catch (error) {
        console.error("Fehler beim Löschen:", error)
        setDataAlert({ type: "error", message: "Fehler beim Löschen der Daten." })
      }
    }
  }

  const getStorageInfo = () => {
    try {
      const totalEntries = timeEntries.length
      const workEntries = timeEntries.filter((e) => e.type === "work").length
      const absenceEntries = timeEntries.filter((e) => e.type !== "work").length
      const lastBackup = localStorage.getItem("lastBackup")

      let storageSize = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          storageSize += localStorage[key].length + key.length
        }
      }

      return {
        totalEntries,
        workEntries,
        absenceEntries,
        lastBackup: lastBackup ? new Date(lastBackup).toLocaleDateString("de-DE") : "Nie",
        storageSize: (storageSize / 1024).toFixed(2) + " KB",
      }
    } catch {
      return {
        totalEntries: 0,
        workEntries: 0,
        absenceEntries: 0,
        lastBackup: "Unbekannt",
        storageSize: "Unbekannt",
      }
    }
  }

  useEffect(() => {
    if (dataAlert) {
      const timer = setTimeout(() => {
        setDataAlert(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [dataAlert])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const startTracking = () => {
    const now = new Date()
    setStartTime(now.toTimeString().slice(0, 5))
    setIsTracking(true)
  }

  const stopTracking = () => {
    const now = new Date()
    setEndTime(now.toTimeString().slice(0, 5))
    setIsTracking(false)
  }

  const calculateWorkedHours = (start: string, end: string, breakMins: number) => {
    if (!start || !end) return 0

    const [startHour, startMin] = start.split(":").map(Number)
    const [endHour, endMin] = end.split(":").map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    const totalMinutes = endMinutes - startMinutes - breakMins
    return Math.max(0, totalMinutes / 60)
  }

  const getWeekDayName = (date: Date): keyof WeeklyTargetHours => {
    const days: (keyof WeeklyTargetHours)[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ]
    return days[date.getDay()]
  }

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
    return new Date(d.setDate(diff))
  }

  const getMonthStart = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const getAbsenceStats = () => {
    const currentYear = new Date().getFullYear()
    const currentYearEntries = timeEntries.filter((entry) => {
      const entryYear = new Date(entry.date).getFullYear()
      return entryYear === currentYear
    })

    const vacationDays = currentYearEntries.filter((entry) => entry.type === "vacation").length
    const sickDays = currentYearEntries.filter((entry) => entry.type === "sick").length
    const holidayDays = currentYearEntries.filter((entry) => entry.type === "holiday").length

    const remainingVacationDays = absenceSettings.currentYearVacationDays - vacationDays

    return {
      vacation: {
        used: vacationDays,
        remaining: remainingVacationDays,
        total: absenceSettings.currentYearVacationDays,
      },
      sick: { used: sickDays },
      holiday: { used: holidayDays },
    }
  }

  const calculateOvertimeStats = () => {
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    const weekStart = getWeekStart(today)
    const monthStart = getMonthStart(today)

    // Daily overtime - exclude absence days from negative calculation
    const todayEntries = timeEntries.filter((entry) => entry.date === todayStr)
    const todayWorkEntries = todayEntries.filter((entry) => entry.type === "work")
    const todayAbsenceEntries = todayEntries.filter((entry) => entry.type !== "work")

    const todayWorked = todayWorkEntries.reduce((sum, entry) => sum + entry.workedHours, 0)
    const todayTarget = todayAbsenceEntries.length > 0 ? 0 : getTargetHoursForDate(todayStr)
    const dailyOvertime = todayWorked - todayTarget

    // Weekly overtime
    const weekEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return entryDate >= weekStart && entryDate <= today
    })

    let weeklyWorked = 0
    let weeklyTarget = 0

    weekEntries.forEach((entry) => {
      if (entry.type === "work") {
        weeklyWorked += entry.workedHours
        weeklyTarget += getTargetHoursForDate(entry.date)
      }
      // Absence days don't count towards negative overtime
    })

    const weeklyOvertime = weeklyWorked - weeklyTarget

    // Monthly overtime
    const monthEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return entryDate >= monthStart && entryDate <= today
    })

    let monthlyWorked = 0
    let monthlyTarget = 0

    monthEntries.forEach((entry) => {
      if (entry.type === "work") {
        monthlyWorked += entry.workedHours
        monthlyTarget += getTargetHoursForDate(entry.date)
      }
    })

    const monthlyOvertime = monthlyWorked - monthlyTarget

    // Cumulative overtime (all time)
    let cumulativeWorked = 0
    let cumulativeTarget = 0

    timeEntries.forEach((entry) => {
      if (entry.type === "work") {
        cumulativeWorked += entry.workedHours
        cumulativeTarget += getTargetHoursForDate(entry.date)
      }
    })

    const cumulativeOvertime = cumulativeWorked - cumulativeTarget

    return {
      daily: { worked: todayWorked, target: todayTarget, overtime: dailyOvertime },
      weekly: { worked: weeklyWorked, target: weeklyTarget, overtime: weeklyOvertime },
      monthly: { worked: monthlyWorked, target: monthlyTarget, overtime: monthlyOvertime },
      cumulative: { worked: cumulativeWorked, target: cumulativeTarget, overtime: cumulativeOvertime },
    }
  }

  const updateOvertimeHistory = (entries: TimeEntry[]) => {
    const stats = calculateOvertimeStats()
    const today = new Date().toISOString().split("T")[0]

    const newOvertimeEntry: OvertimeEntry = {
      date: today,
      dailyOvertime: stats.daily.overtime,
      weeklyOvertime: stats.weekly.overtime,
      monthlyOvertime: stats.monthly.overtime,
      cumulativeOvertime: stats.cumulative.overtime,
    }

    const updatedHistory = [...overtimeHistory.filter((entry) => entry.date !== today), newOvertimeEntry]
    setOvertimeHistory(updatedHistory)
    return updatedHistory
  }

  const saveTimeEntry = () => {
    if (!startTime || !endTime) return

    const workedHours = calculateWorkedHours(startTime, endTime, breakMinutes)
    const today = new Date().toISOString().split("T")[0]

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      date: today,
      startTime,
      endTime,
      breakMinutes,
      workedHours,
      type: "work",
    }

    const updatedEntries = [...timeEntries, newEntry]
    setTimeEntries(updatedEntries)

    const updatedOvertimeHistory = updateOvertimeHistory(updatedEntries)
    saveToStorage(updatedEntries, dailyTargetHours, weeklyTargetHours, updatedOvertimeHistory, absenceSettings)

    // Reset form
    setStartTime("")
    setEndTime("")
    setBreakMinutes(30)
  }

  const saveAbsenceEntry = () => {
    if (!absenceDate || !absenceType) return

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      date: absenceDate,
      startTime: "",
      endTime: "",
      breakMinutes: 0,
      workedHours: 0,
      type: absenceType,
      note: absenceNote,
    }

    const updatedEntries = [...timeEntries, newEntry]
    setTimeEntries(updatedEntries)

    const updatedOvertimeHistory = updateOvertimeHistory(updatedEntries)
    saveToStorage(updatedEntries, dailyTargetHours, weeklyTargetHours, updatedOvertimeHistory, absenceSettings)

    // Reset form
    setAbsenceDate("")
    setAbsenceType("vacation")
    setAbsenceNote("")
  }

  const todayStats = {
    totalHours: 0,
    targetHours: 0,
    overtime: 0,
  }
  const overtimeStats = calculateOvertimeStats()
  const absenceStats = getAbsenceStats()

  const TabButton = ({
    id,
    label,
    icon: Icon,
    active,
  }: {
    id: string
    label: string
    icon: any
    active: boolean
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon size={20} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  )

  const getMonthlyReportData = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-").map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const monthEntries = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date)
      return entryDate >= startDate && entryDate <= endDate
    })

    const workEntries = monthEntries.filter((entry) => entry.type === "work")
    const vacationEntries = monthEntries.filter((entry) => entry.type === "vacation")
    const sickEntries = monthEntries.filter((entry) => entry.type === "sick")
    const holidayEntries = monthEntries.filter((entry) => entry.type === "holiday")

    const totalWorkedHours = workEntries.reduce((sum, entry) => sum + entry.workedHours, 0)
    let totalTargetHours = 0

    // Calculate target hours for work days only
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      const hasAbsence = monthEntries.some((entry) => entry.date === dateStr && entry.type !== "work")
      if (!hasAbsence) {
        totalTargetHours += getTargetHoursForDate(dateStr)
      }
    }

    const monthlyOvertime = totalWorkedHours - totalTargetHours

    return {
      month: startDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
      workDays: workEntries.length,
      totalWorkedHours,
      totalTargetHours,
      monthlyOvertime,
      vacationDays: vacationEntries.length,
      sickDays: sickEntries.length,
      holidayDays: holidayEntries.length,
      entries: monthEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }
  }

  const deleteEntry = (entryId: string) => {
    const updatedEntries = timeEntries.filter((entry) => entry.id !== entryId)
    setTimeEntries(updatedEntries)
    saveToStorage(updatedEntries, dailyTargetHours, weeklyTargetHours, overtimeHistory, absenceSettings)
    toast({
      title: "Eintrag gelöscht",
      description: "Der Zeiteintrag wurde erfolgreich gelöscht.",
    })
  }

  const startEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditStartTime(entry.startTime)
    setEditEndTime(entry.endTime)
    setEditBreakMinutes(entry.breakMinutes)
    setEditNote(entry.note || "")
    setIsEditDialogOpen(true)
  }

  const saveEditedEntry = () => {
    if (!editingEntry) return

    const startMinutes = timeToMinutes(editStartTime)
    const endMinutes = timeToMinutes(editEndTime)
    const workedMinutes = endMinutes - startMinutes - editBreakMinutes
    const workedHours = Math.max(0, workedMinutes / 60)

    const updatedEntry: TimeEntry = {
      ...editingEntry,
      startTime: editStartTime,
      endTime: editEndTime,
      breakMinutes: editBreakMinutes,
      workedHours: workedHours,
      note: editNote,
    }

    const updatedEntries = timeEntries.map((entry) => (entry.id === editingEntry.id ? updatedEntry : entry))

    setTimeEntries(updatedEntries)
    saveToStorage(updatedEntries, dailyTargetHours, weeklyTargetHours, overtimeHistory, absenceSettings)
    setIsEditDialogOpen(false)
    setEditingEntry(null)

    toast({
      title: "Eintrag aktualisiert",
      description: "Der Zeiteintrag wurde erfolgreich bearbeitet.",
    })
  }

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const generatePDFReport = async () => {
    try {
      const reportData = getMonthlyReportData(reportMonth)

      if (reportData.entries.length === 0) {
        toast({
          title: "Keine Daten",
          description: "Für den ausgewählten Monat sind keine Einträge vorhanden.",
          variant: "destructive",
        })
        return
      }

      // Dynamic import to avoid SSR issues
      const jsPDF = (await import("jspdf")).default

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      let yPosition = margin

      // Header
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("Arbeitszeit-Bericht", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 15

      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.text(reportData.month, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 20

      // Summary section
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Zusammenfassung", margin, yPosition)
      yPosition += 15

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")

      const summaryData = [
        ["Arbeitstage:", `${reportData.workDays}`],
        ["Gearbeitete Stunden:", `${reportData.totalWorkedHours.toFixed(2)}h`],
        ["Sollstunden:", `${reportData.totalTargetHours.toFixed(2)}h`],
        ["Überstunden:", `${reportData.monthlyOvertime >= 0 ? "+" : ""}${reportData.monthlyOvertime.toFixed(2)}h`],
        ["Urlaubstage:", `${reportData.vacationDays}`],
        ["Kranktage:", `${reportData.sickDays}`],
        ["Feiertage:", `${reportData.holidayDays}`],
      ]

      summaryData.forEach(([label, value]) => {
        doc.text(label, margin, yPosition)
        doc.text(value, margin + 80, yPosition)
        yPosition += 8
      })

      yPosition += 15

      // Detailed entries section
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("Detaillierte Einträge", margin, yPosition)
      yPosition += 15

      // Table header
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      const headers = ["Datum", "Typ", "Von", "Bis", "Pause", "Stunden", "Notiz"]
      const colWidths = [25, 20, 15, 15, 15, 20, 60]
      let xPosition = margin

      headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition)
        xPosition += colWidths[index]
      })
      yPosition += 8

      // Draw line under header
      doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2)
      yPosition += 5

      // Table rows
      doc.setFont("helvetica", "normal")
      reportData.entries.forEach((entry) => {
        if (yPosition > 250) {
          // New page if needed
          doc.addPage()
          yPosition = margin
        }

        xPosition = margin
        const rowData = [
          new Date(entry.date).toLocaleDateString("de-DE"),
          entry.type === "work"
            ? "Arbeit"
            : entry.type === "vacation"
              ? "Urlaub"
              : entry.type === "sick"
                ? "Krank"
                : "Feiertag",
          entry.startTime || "-",
          entry.endTime || "-",
          entry.type === "work" ? `${entry.breakMinutes}min` : "-",
          entry.type === "work" ? `${entry.workedHours.toFixed(2)}h` : "-",
          entry.note || "",
        ]

        rowData.forEach((data, index) => {
          const text = data.length > 15 ? data.substring(0, 12) + "..." : data
          doc.text(text, xPosition, yPosition)
          xPosition += colWidths[index]
        })
        yPosition += 6
      })

      // Footer
      const now = new Date()
      doc.setFontSize(8)
      doc.text(
        `Erstellt am ${now.toLocaleDateString("de-DE")} um ${now.toLocaleTimeString("de-DE")}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" },
      )

      doc.save(`Arbeitszeit-Bericht-${reportData.month.replace(" ", "-")}.pdf`)

      toast({
        title: "PDF erstellt",
        description: "Der Arbeitszeit-Bericht wurde erfolgreich heruntergeladen.",
      })
    } catch (error) {
      console.error("PDF generation error:", error)
      toast({
        title: "Fehler beim PDF-Export",
        description: "Der PDF-Bericht konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-6">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-1">Zeiterfassung</h1>
          <p className="text-sm opacity-90">{formatDate(currentTime)}</p>
          <p className="text-2xl font-mono font-bold mt-2">{formatTime(currentTime)}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-20">
        {activeTab === "zeiterfassung" && (
          <div className="space-y-4">
            {/* Today's Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Heute</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gearbeitete Stunden</span>
                  <span className="font-bold">{todayStats.totalHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sollstunden</span>
                  <span className="font-bold">{todayStats.targetHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Überstunden</span>
                  <Badge variant={todayStats.overtime >= 0 ? "default" : "destructive"}>
                    {todayStats.overtime >= 0 ? "+" : ""}
                    {todayStats.overtime.toFixed(2)}h
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Comprehensive Overtime Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={20} />
                  Überstunden-Konto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="week" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="week">Woche</TabsTrigger>
                    <TabsTrigger value="month">Monat</TabsTrigger>
                    <TabsTrigger value="total">Gesamt</TabsTrigger>
                  </TabsList>

                  <TabsContent value="week" className="space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gearbeitet</span>
                      <span className="font-bold">{overtimeStats.weekly.worked.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Soll</span>
                      <span className="font-bold">{overtimeStats.weekly.target.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Überstunden</span>
                      <Badge variant={overtimeStats.weekly.overtime >= 0 ? "default" : "destructive"}>
                        {overtimeStats.weekly.overtime >= 0 ? "+" : ""}
                        {overtimeStats.weekly.overtime.toFixed(2)}h
                      </Badge>
                    </div>
                  </TabsContent>

                  <TabsContent value="month" className="space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gearbeitet</span>
                      <span className="font-bold">{overtimeStats.monthly.worked.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Soll</span>
                      <span className="font-bold">{overtimeStats.monthly.target.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Überstunden</span>
                      <Badge variant={overtimeStats.monthly.overtime >= 0 ? "default" : "destructive"}>
                        {overtimeStats.monthly.overtime >= 0 ? "+" : ""}
                        {overtimeStats.monthly.overtime.toFixed(2)}h
                      </Badge>
                    </div>
                  </TabsContent>

                  <TabsContent value="total" className="space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gearbeitet</span>
                      <span className="font-bold">{overtimeStats.cumulative.worked.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Soll</span>
                      <span className="font-bold">{overtimeStats.cumulative.target.toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Überstunden-Saldo</span>
                      <Badge
                        variant={overtimeStats.cumulative.overtime >= 0 ? "default" : "destructive"}
                        className="text-base px-3 py-1"
                      >
                        {overtimeStats.cumulative.overtime >= 0 ? "+" : ""}
                        {overtimeStats.cumulative.overtime.toFixed(2)}h
                      </Badge>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Quick Tracking */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Schnelle Erfassung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isTracking ? (
                  <Button onClick={startTracking} className="w-full" size="lg">
                    <Play className="mr-2" size={20} />
                    Arbeitszeit starten
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center p-4 bg-accent/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Gestartet um</p>
                      <p className="text-xl font-bold text-accent">{startTime}</p>
                    </div>
                    <Button onClick={stopTracking} variant="destructive" className="w-full" size="lg">
                      <Square className="mr-2" size={20} />
                      Arbeitszeit beenden
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Manuelle Eingabe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-time" className="text-sm">
                      Beginn
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time" className="text-sm">
                      Ende
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="break-minutes" className="text-sm">
                    Pause (Minuten)
                  </Label>
                  <Input
                    id="break-minutes"
                    type="number"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    className="mt-1"
                    min="0"
                  />
                </div>

                {startTime && endTime && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Arbeitszeit</p>
                    <p className="font-bold">
                      {calculateWorkedHours(startTime, endTime, breakMinutes).toFixed(2)} Stunden
                    </p>
                  </div>
                )}

                <Button onClick={saveTimeEntry} className="w-full" disabled={!startTime || !endTime}>
                  Zeit erfassen
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "abwesenheit" && (
          <div className="space-y-4">
            {/* Absence Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar size={20} />
                  Abwesenheits-Übersicht {new Date().getFullYear()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Vacation Stats */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane size={16} className="text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Urlaub</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700 dark:text-blue-300">Verbraucht / Verfügbar</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">
                          {absenceStats.vacation.used} / {absenceStats.vacation.total}
                        </Badge>
                        <Badge variant={absenceStats.vacation.remaining > 5 ? "default" : "destructive"}>
                          {absenceStats.vacation.remaining} übrig
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Sick Days Stats */}
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart size={16} className="text-red-600" />
                      <span className="font-medium text-red-900 dark:text-red-100">Kranktage</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-700 dark:text-red-300">Dieses Jahr</span>
                      <Badge variant="outline" className="bg-red-100 dark:bg-red-900">
                        {absenceStats.sick.used} Tage
                      </Badge>
                    </div>
                  </div>

                  {/* Holiday Stats */}
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee size={16} className="text-green-600" />
                      <span className="font-medium text-green-900 dark:text-green-100">Feiertage</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700 dark:text-green-300">Dieses Jahr</span>
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                        {absenceStats.holiday.used} Tage
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Absence */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Abwesenheit erfassen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="absence-date" className="text-sm">
                    Datum
                  </Label>
                  <Input
                    id="absence-date"
                    type="date"
                    value={absenceDate}
                    onChange={(e) => setAbsenceDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="absence-type" className="text-sm">
                    Art der Abwesenheit
                  </Label>
                  <Select
                    value={absenceType}
                    onValueChange={(value: "vacation" | "sick" | "holiday") => setAbsenceType(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">
                        <div className="flex items-center gap-2">
                          <Plane size={16} />
                          Urlaub
                        </div>
                      </SelectItem>
                      <SelectItem value="sick">
                        <div className="flex items-center gap-2">
                          <Heart size={16} />
                          Krank
                        </div>
                      </SelectItem>
                      <SelectItem value="holiday">
                        <div className="flex items-center gap-2">
                          <Coffee size={16} />
                          Feiertag
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="absence-note" className="text-sm">
                    Notiz (optional)
                  </Label>
                  <Textarea
                    id="absence-note"
                    value={absenceNote}
                    onChange={(e) => setAbsenceNote(e.target.value)}
                    className="mt-1"
                    placeholder="Zusätzliche Informationen..."
                    rows={2}
                  />
                </div>

                <Button onClick={saveAbsenceEntry} className="w-full" disabled={!absenceDate}>
                  Abwesenheit erfassen
                </Button>
              </CardContent>
            </Card>

            {/* Recent Absences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Letzte Abwesenheiten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeEntries
                    .filter((entry) => entry.type !== "work")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {entry.type === "vacation" && <Plane size={16} className="text-blue-600" />}
                          {entry.type === "sick" && <Heart size={16} className="text-red-600" />}
                          {entry.type === "holiday" && <Coffee size={16} className="text-green-600" />}
                          <div>
                            <p className="font-medium">
                              {new Date(entry.date).toLocaleDateString("de-DE", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </p>
                            {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {entry.type === "vacation" && "Urlaub"}
                          {entry.type === "sick" && "Krank"}
                          {entry.type === "holiday" && "Feiertag"}
                        </Badge>
                      </div>
                    ))}
                  {timeEntries.filter((entry) => entry.type !== "work").length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Noch keine Abwesenheiten erfasst</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "berichte" && (
          <div className="space-y-4">
            {/* Report Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 size={20} />
                  Berichts-Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="report-month" className="text-sm">
                    Monat auswählen
                  </Label>
                  <Input
                    id="report-month"
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={generatePDFReport} className="w-full" size="lg">
                  <Download className="mr-2" size={20} />
                  PDF-Bericht herunterladen
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Monatsübersicht - {getMonthlyReportData(reportMonth).month}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Arbeitstage</span>
                      <span className="font-bold">{getMonthlyReportData(reportMonth).workDays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gearbeitete Stunden</span>
                      <span className="font-bold">
                        {getMonthlyReportData(reportMonth).totalWorkedHours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sollstunden</span>
                      <span className="font-bold">
                        {getMonthlyReportData(reportMonth).totalTargetHours.toFixed(2)}h
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Überstunden</span>
                      <Badge
                        variant={getMonthlyReportData(reportMonth).monthlyOvertime >= 0 ? "default" : "destructive"}
                      >
                        {getMonthlyReportData(reportMonth).monthlyOvertime >= 0 ? "+" : ""}
                        {getMonthlyReportData(reportMonth).monthlyOvertime.toFixed(2)}h
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Urlaubstage</span>
                      <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">
                        {getMonthlyReportData(reportMonth).vacationDays}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Kranktage</span>
                      <Badge variant="outline" className="bg-red-100 dark:bg-red-900">
                        {getMonthlyReportData(reportMonth).sickDays}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Feiertage</span>
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                        {getMonthlyReportData(reportMonth).holidayDays}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Entries */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Detaillierte Einträge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getMonthlyReportData(reportMonth).entries.length > 0 ? (
                    getMonthlyReportData(reportMonth).entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {entry.type === "work" && <Clock size={16} className="text-primary" />}
                          {entry.type === "vacation" && <Plane size={16} className="text-blue-600" />}
                          {entry.type === "sick" && <Heart size={16} className="text-red-600" />}
                          {entry.type === "holiday" && <Coffee size={16} className="text-green-600" />}
                          <div>
                            <p className="font-medium">
                              {new Date(entry.date).toLocaleDateString("de-DE", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </p>
                            {entry.type === "work" && (
                              <p className="text-sm text-muted-foreground">
                                {entry.startTime} - {entry.endTime} ({entry.workedHours.toFixed(2)}h)
                              </p>
                            )}
                            {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <Badge variant="outline">
                              {entry.type === "work" && "Arbeit"}
                              {entry.type === "vacation" && "Urlaub"}
                              {entry.type === "sick" && "Krank"}
                              {entry.type === "holiday" && "Feiertag"}
                            </Badge>
                            {entry.type === "work" && (
                              <p className="text-sm text-muted-foreground mt-1">Pause: {entry.breakMinutes}min</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            {entry.type === "work" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditEntry(entry)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit size={14} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEntry(entry.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Keine Einträge für {getMonthlyReportData(reportMonth).month} gefunden
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-start-time">Startzeit</Label>
                      <Input
                        id="edit-start-time"
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-end-time">Endzeit</Label>
                      <Input
                        id="edit-end-time"
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-break">Pause (Minuten)</Label>
                    <Input
                      id="edit-break"
                      type="number"
                      min="0"
                      value={editBreakMinutes}
                      onChange={(e) => setEditBreakMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-note">Notiz (optional)</Label>
                    <Textarea
                      id="edit-note"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Zusätzliche Informationen..."
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveEditedEntry} className="flex-1">
                      Speichern
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Durchschnitt/Tag</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {getMonthlyReportData(reportMonth).workDays > 0
                      ? (
                          getMonthlyReportData(reportMonth).totalWorkedHours /
                          getMonthlyReportData(reportMonth).workDays
                        ).toFixed(1)
                      : "0.0"}
                    h
                  </p>
                  <p className="text-sm text-muted-foreground">pro Arbeitstag</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Abwesenheit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {getMonthlyReportData(reportMonth).vacationDays +
                      getMonthlyReportData(reportMonth).sickDays +
                      getMonthlyReportData(reportMonth).holidayDays}
                  </p>
                  <p className="text-sm text-muted-foreground">Tage gesamt</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "einstellungen" && (
          <div className="space-y-4">
            {/* Data Alert */}
            {dataAlert && (
              <Alert
                className={
                  dataAlert.type === "error"
                    ? "border-destructive"
                    : dataAlert.type === "warning"
                      ? "border-yellow-500"
                      : "border-green-500"
                }
              >
                {dataAlert.type === "error" && <AlertTriangle className="h-4 w-4" />}
                {dataAlert.type === "success" && <CheckCircle className="h-4 w-4" />}
                {dataAlert.type === "warning" && <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>{dataAlert.message}</AlertDescription>
              </Alert>
            )}

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database size={20} />
                  Datenmanagement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Storage Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Speicher-Informationen</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gesamt Einträge:</span>
                      <span className="font-medium ml-2">{getStorageInfo().totalEntries}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Arbeitseinträge:</span>
                      <span className="font-medium ml-2">{getStorageInfo().workEntries}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Abwesenheiten:</span>
                      <span className="font-medium ml-2">{getStorageInfo().absenceEntries}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Letztes Backup:</span>
                      <span className="font-medium ml-2">{getStorageInfo().lastBackup}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Speichergröße:</span>
                      <span className="font-medium ml-2">{getStorageInfo().storageSize}</span>
                    </div>
                  </div>
                </div>

                {/* Export/Import */}
                <div className="grid grid-cols-1 gap-3">
                  <Button onClick={exportData} className="w-full bg-transparent" variant="outline">
                    <Download className="mr-2" size={16} />
                    Daten exportieren (Backup)
                  </Button>

                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button className="w-full bg-transparent" variant="outline">
                      <Upload className="mr-2" size={16} />
                      Daten importieren (Wiederherstellen)
                    </Button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Gefahrenbereich
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Diese Aktionen können nicht rückgängig gemacht werden. Erstellen Sie vorher ein Backup.
                  </p>
                  <Button onClick={clearAllData} variant="destructive" className="w-full">
                    <Trash2 className="mr-2" size={16} />
                    Alle Daten löschen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sollstunden */}
            <Card>
              <CardHeader>
                <CardTitle>Sollstunden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="target-hours" className="text-sm">
                    Standard Sollstunden pro Tag
                  </Label>
                  <Input
                    id="target-hours"
                    type="number"
                    value={dailyTargetHours}
                    onChange={(e) => {
                      const hours = Number(e.target.value)
                      setDailyTargetHours(hours)
                      saveToStorage(timeEntries, hours, weeklyTargetHours, overtimeHistory, absenceSettings)
                    }}
                    className="mt-1"
                    min="1"
                    max="24"
                    step="0.5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Wöchentliche Sollstunden */}
            <Card>
              <CardHeader>
                <CardTitle>Wöchentliche Sollstunden</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(weeklyTargetHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between">
                    <Label className="text-sm capitalize">
                      {day === "monday" && "Montag"}
                      {day === "tuesday" && "Dienstag"}
                      {day === "wednesday" && "Mittwoch"}
                      {day === "thursday" && "Donnerstag"}
                      {day === "friday" && "Freitag"}
                      {day === "saturday" && "Samstag"}
                      {day === "sunday" && "Sonntag"}
                    </Label>
                    <Input
                      type="number"
                      value={hours}
                      onChange={(e) => {
                        const newHours = Number(e.target.value)
                        const updatedWeeklyHours = { ...weeklyTargetHours, [day]: newHours }
                        setWeeklyTargetHours(updatedWeeklyHours)
                        saveToStorage(
                          timeEntries,
                          dailyTargetHours,
                          updatedWeeklyHours,
                          overtimeHistory,
                          absenceSettings,
                        )
                      }}
                      className="w-20"
                      min="0"
                      max="24"
                      step="0.5"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Abwesenheits-Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="annual-vacation" className="text-sm">
                    Jahresurlaub (Tage)
                  </Label>
                  <Input
                    id="annual-vacation"
                    type="number"
                    value={absenceSettings.annualVacationDays}
                    onChange={(e) => {
                      const days = Number(e.target.value)
                      const updatedSettings = { ...absenceSettings, annualVacationDays: days }
                      setAbsenceSettings(updatedSettings)
                      saveToStorage(timeEntries, dailyTargetHours, weeklyTargetHours, overtimeHistory, updatedSettings)
                    }}
                    className="mt-1"
                    min="0"
                    max="50"
                  />
                </div>
                <div>
                  <Label htmlFor="current-year-vacation" className="text-sm">
                    Verfügbare Urlaubstage {new Date().getFullYear()}
                  </Label>
                  <Input
                    id="current-year-vacation"
                    type="number"
                    value={absenceSettings.currentYearVacationDays}
                    onChange={(e) => {
                      const days = Number(e.target.value)
                      const updatedSettings = { ...absenceSettings, currentYearVacationDays: days }
                      setAbsenceSettings(updatedSettings)
                      saveToStorage(timeEntries, dailyTargetHours, weeklyTargetHours, overtimeHistory, updatedSettings)
                    }}
                    className="mt-1"
                    min="0"
                    max="50"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="flex justify-around">
          <TabButton id="zeiterfassung" label="Zeit" icon={Clock} active={activeTab === "zeiterfassung"} />
          <TabButton id="abwesenheit" label="Abwesenheit" icon={Calendar} active={activeTab === "abwesenheit"} />
          <TabButton id="berichte" label="Berichte" icon={FileText} active={activeTab === "berichte"} />
          <TabButton id="einstellungen" label="Einstellungen" icon={Settings} active={activeTab === "einstellungen"} />
        </div>
      </div>
    </div>
  )
}

export default ZeiterfassungApp
