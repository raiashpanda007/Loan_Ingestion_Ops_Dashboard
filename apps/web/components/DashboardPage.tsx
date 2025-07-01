"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Separator } from "@workspace/ui/components/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  Edit, 
  X, 
  Save, 
  Filter,
  Search,
  TrendingUp,
  Database,
  AlertTriangle,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  DollarSign,
  Activity
} from 'lucide-react'

interface MetricsData {
  incomingRate: number
  processedRate: number
  activeWorkers: number
  timestamp: number
}

interface FailedLoan {
  id: string
  loanId: string
  name: string
  age: number
  email: string
  phone: string
  amount: number
  income: number
  creditScore: number
  purpose: string
  flagged: boolean
  flaggedNote: string | null
  failedAt: string
  retried: boolean
  createdAt: string
  errors: Array<{
    id: string
    failedLoanId: string
    code: string
    createdAt: string
  }>
}

interface FilterState {
  loanId: string
  email: string
  phone: string
  flagged: string
  retried: string
  from: string
  to: string
  errorId: string
}

interface EditLoanData {
  loanId: string
  application: {
    name: string
    age: number
    email: string
    phone: string
  }
  amount: number
  income: number
  creditScore: number
  purpose: string
}

export default function DashboardPage() {
  // WebSocket and Metrics State
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [metrics, setMetrics] = useState<MetricsData>({
    incomingRate: 0,
    processedRate: 0,
    activeWorkers: 0,
    timestamp: Date.now()
  })
  const [scatterData, setScatterData] = useState<Array<{x: number, y: number}>>([])
  
  // Track counts and timestamps for rate calculation
  const [counters, setCounters] = useState({
    incoming: { count: 0, lastUpdate: Date.now() },
    processed: { count: 0, lastUpdate: Date.now() },
    failed: { count: 0, lastUpdate: Date.now() }
  })

  // Use refs to avoid stale closure issues
  const countersRef = useRef(counters)
  const metricsRef = useRef(metrics)

  // Update refs when state changes
  useEffect(() => {
    countersRef.current = counters
  }, [counters])

  useEffect(() => {
    metricsRef.current = metrics
  }, [metrics])
  
  // Error Logs State
  const [errorLogs, setErrorLogs] = useState<FailedLoan[]>([])
  const [loading, setLoading] = useState(false)
  const [retryingLoan, setRetryingLoan] = useState<string | null>(null)
  
  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    loanId: '',
    email: '',
    phone: '',
    flagged: 'all',
    retried: 'all',
    from: '',
    to: '',
    errorId: ''
  })

  // Add state for error types (for dropdown)
  const [errorTypes, setErrorTypes] = useState<string[]>([])

  // Retry Dialog State
  const [retryDialogOpen, setRetryDialogOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<FailedLoan | null>(null)
  const [editFormData, setEditFormData] = useState<EditLoanData>({
    loanId: '',
    application: {
      name: '',
      age: 18,
      email: '',
      phone: ''
    },
    amount: 0,
    income: 0,
    creditScore: 300,
    purpose: ''
  })
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({})
  const [isSubmittingRetry, setIsSubmittingRetry] = useState(false)

  // Calculate rates from WebSocket counter updates - FIXED VERSION
  const calculateRates = useCallback((newCounters: typeof counters, previousCounters: typeof counters) => {
    const now = Date.now()
    
    // Calculate rates based on count changes over time
    const incomingTimeDiff = (now - previousCounters.incoming.lastUpdate) / 1000
    const processedTimeDiff = (now - previousCounters.processed.lastUpdate) / 1000
    
    const incomingDiff = newCounters.incoming.count - previousCounters.incoming.count
    const processedDiff = newCounters.processed.count - previousCounters.processed.count
    
    console.log('Rate calculation:', {
      incomingDiff,
      processedDiff,
      incomingTimeDiff,
      processedTimeDiff,
      newCounters,
      previousCounters
    })
    
    // Only calculate positive rates
    const incomingRate = incomingTimeDiff > 0 && incomingDiff > 0 ? 
      Math.round(incomingDiff / incomingTimeDiff) : 0
    const processedRate = processedTimeDiff > 0 && processedDiff > 0 ? 
      Math.round(processedDiff / processedTimeDiff) : 0
    
    // Estimate active workers based on processing rate
    const activeWorkers = processedRate > 0 ? Math.max(1, Math.ceil(processedRate / 5)) : 1
    
    const newMetrics = {
      incomingRate: Math.max(0, incomingRate),
      processedRate: Math.max(0, processedRate),
      activeWorkers,
      timestamp: now
    }
    
    console.log('New metrics calculated:', newMetrics)
    setMetrics(newMetrics)
    
    // Update scatter plot data (keep last 20 points) - only add meaningful data
    if (newMetrics.incomingRate > 0 || newMetrics.processedRate > 0) {
      setScatterData(prev => [
        ...prev.slice(-19),
        { x: newMetrics.incomingRate, y: newMetrics.processedRate }
      ])
    }
  }, [])

  // Fixed fetchErrorLogs function
  const fetchErrorLogs = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') queryParams.append(key, value)
      })
      
      // Updated to use your correct endpoint
      const url = `http://localhost:3001/api/loan/errors?${queryParams}`
      console.log('Fetching error logs from:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Error logs result:', result)
        
        // Handle your API response structure
        if (result.success && result.data) {
          setErrorLogs(result.data)
        } else {
          setErrorLogs([])
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch error logs:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Load error types for dropdown (from your geterrors endpoint)
  const fetchErrorTypes = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/loan/geterros')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Extract unique error codes from the failed loans
          const uniqueErrorCodes = [...new Set(
            result.data.flatMap((loan: FailedLoan) => 
              loan.errors.map(error => error.code)
            )
          )] as string[]
          setErrorTypes(uniqueErrorCodes)
        }
      }
    } catch (error) {
      console.error('Error fetching error types:', error)
    }
  }, [])

  // WebSocket Connection with Auto-reconnect - FIXED VERSION
  const connectWebSocket = useCallback(() => {
    try {
      setConnectionStatus('connecting')
      const websocket = new WebSocket('ws://localhost:8080')
      
      websocket.onopen = () => {
        console.log('WebSocket connected')
        setWs(websocket)
        setConnectionStatus('connected')
      }
      
      // Update the WebSocket message handlers to track counts for scatter plot
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          
          const now = Date.now()
          
          // Handle different WebSocket message types based on your backend
          if (message.type === 'count:incoming') {
            // Incoming count from ws.ts
            setCounters(prevCounters => {
              const newCounters = {
                ...prevCounters,
                incoming: { count: message.count, lastUpdate: now }
              }
              // Pass both new and previous counters to avoid stale closure
              calculateRates(newCounters, prevCounters)
              
              // Update scatter plot with actual counts (not rates)
              setScatterData(prev => [
                ...prev.slice(-19), // Keep last 19 points
                { 
                  x: message.count, // Incoming count
                  y: newCounters.processed.count // Current processed count
                }
              ])
              
              return newCounters
            })
            
          } else if (message.type === 'count:processed') {
            // Processed count from worker.ts
            setCounters(prevCounters => {
              const newCounters = {
                ...prevCounters,
                processed: { count: message.count, lastUpdate: now }
              }
              // Pass both new and previous counters to avoid stale closure
              calculateRates(newCounters, prevCounters)
              
              // Update scatter plot with actual counts (not rates)
              setScatterData(prev => [
                ...prev.slice(-19), // Keep last 19 points
                { 
                  x: newCounters.incoming.count, // Current incoming count
                  y: message.count // Processed count
                }
              ])
              
              return newCounters
            })
            
          } else if (message.type === 'count:failed') {
            // Failed count from worker.ts
            setCounters(prevCounters => {
              const newCounters = {
                ...prevCounters,
                failed: { count: message.count, lastUpdate: now }
              }
              return newCounters
            })
            // Refresh error logs when there are new failures
            fetchErrorLogs()
            
          } else if (message.type === 'success') {
            console.log('Loan processed successfully:', message.loanId)
            
          } else if (message.type === 'error') {
            console.log('Loan processing failed:', message.error)
            // Refresh error logs when there are new errors
            fetchErrorLogs()
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...')
        setWs(null)
        setConnectionStatus('disconnected')
        // Auto-reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('disconnected')
      }
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setConnectionStatus('disconnected')
      // Retry connection after 3 seconds
      setTimeout(connectWebSocket, 3000)
    }
  }, [calculateRates, fetchErrorLogs])

  // Open retry dialog with loan data
  const openRetryDialog = (loan: FailedLoan) => {
    setEditingLoan(loan)
    setEditFormData({
      loanId: loan.loanId,
      application: {
        name: loan.name,
        age: loan.age,
        email: loan.email,
        phone: loan.phone
      },
      amount: loan.amount,
      income: loan.income,
      creditScore: loan.creditScore,
      purpose: loan.purpose
    })
    setEditFormErrors({})
    setRetryDialogOpen(true)
  }

  // Close retry dialog
  const closeRetryDialog = () => {
    setRetryDialogOpen(false)
    setEditingLoan(null)
    setEditFormData({
      loanId: '',
      application: {
        name: '',
        age: 18,
        email: '',
        phone: ''
      },
      amount: 0,
      income: 0,
      creditScore: 300,
      purpose: ''
    })
    setEditFormErrors({})
  }

  // Handle form field changes
  const handleEditFormChange = (field: string, value: string | number) => {
    if (field.startsWith('application.')) {
      const appField = field.split('.')[1] as string
      setEditFormData(prev => ({
        ...prev,
        application: {
          ...prev.application,
          [appField]: value
        }
      }))
    } else {
      setEditFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
    
    // Clear error for this field
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Validate form data
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!editFormData.loanId.trim()) {
      errors.loanId = 'Loan ID is required'
    }

    if (!editFormData.application.name.trim()) {
      errors['application.name'] = 'Name is required'
    }

    if (editFormData.application.age < 18) {
      errors['application.age'] = 'Age must be at least 18'
    }

    if (!editFormData.application.email.trim()) {
      errors['application.email'] = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.application.email)) {
      errors['application.email'] = 'Invalid email format'
    }

    if (!editFormData.application.phone.trim()) {
      errors['application.phone'] = 'Phone is required'
    } else if (editFormData.application.phone.length < 10) {
      errors['application.phone'] = 'Phone must be at least 10 digits'
    }

    if (editFormData.amount < 100) {
      errors.amount = 'Amount must be at least 100'
    }

    if (editFormData.income < 0) {
      errors.income = 'Income must be a positive number'
    }

    if (editFormData.creditScore < 300 || editFormData.creditScore > 850) {
      errors.creditScore = 'Credit score must be between 300 and 850'
    }

    if (!editFormData.purpose.trim()) {
      errors.purpose = 'Purpose is required'
    }

    setEditFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit retry with edited data
  const submitRetry = async () => {
    if (!validateEditForm()) {
      return
    }

    setIsSubmittingRetry(true)
    try {
      const response = await fetch('http://localhost:3001/api/loan/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Loan retried successfully:', result)
        
        // Close dialog and refresh data
        closeRetryDialog()
        fetchErrorLogs()
        
        // You could also show a success toast here
        alert(`Loan ${editFormData.loanId} resubmitted successfully! Job ID: ${result.data?.jobId}`)
      } else {
        const errorText = await response.text()
        console.error('Failed to retry loan:', response.status, errorText)
        alert(`Failed to resubmit loan: ${errorText}`)
      }
    } catch (error) {
      console.error('Error retrying loan:', error)
      alert(`Error resubmitting loan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmittingRetry(false)
    }
  }

  // Initialize data loading
  useEffect(() => {
    connectWebSocket()
    fetchErrorLogs()
    fetchErrorTypes() // Load error types for dropdown
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  // Auto-fetch when filters change
  useEffect(() => {
    if (Object.values(filters).some(value => value && value !== 'all')) {
      fetchErrorLogs()
    }
  }, [filters, fetchErrorLogs])

  // Update filters handler
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Clear all filters to initial state
  const handleClearFilters = () => {
    setFilters({
      loanId: '',
      email: '',
      phone: '',
      flagged: 'all',
      retried: 'all',
      from: '',
      to: '',
      errorId: ''
    })
  }

  // Force refresh error logs
  const handleRefresh = () => {
    fetchErrorLogs()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md dark:bg-slate-900/80 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Loan Operations Dashboard
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Real-time monitoring via WebSocket</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    Incoming: <strong>{counters.incoming.count}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-blue-500" />
                    Processed: <strong>{counters.processed.count}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Failed: <strong>{counters.failed.count}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                className={`px-3 py-1 ${connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-100' 
                  : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                {connectionStatus === 'connected' ? 'Live Data' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </Badge>
              <Button onClick={handleRefresh} size="sm" variant="outline" className="shadow-sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Incoming Rate</CardTitle>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{metrics.incomingRate}/sec</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Total: {counters.incoming.count} requests
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Processed Rate</CardTitle>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{metrics.processedRate}/sec</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Total: {counters.processed.count} processed
              </p>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Active Workers</CardTitle>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{metrics.activeWorkers}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Failed: {counters.failed.count} loans
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Scatter Plot */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Processing Analytics</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Real-time incoming vs processed count visualization
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Database className="w-3 h-3 mr-1" />
                Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Incoming Count"
                    label={{ value: 'Total Incoming Count', position: 'insideBottom', offset: -10 }}
                    className="text-xs"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Processed Count"
                    label={{ value: 'Total Processed', angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg">
                            <p className="text-sm font-medium">Total Incoming: <span className="text-blue-600">{data.x}</span></p>
                            <p className="text-sm font-medium">Total Processed: <span className="text-green-600">{data.y}</span></p>
                            <p className="text-xs text-gray-500 mt-1">
                              Processing Rate: {data.y > 0 ? ((data.y / data.x) * 100).toFixed(1) : 0}%
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter dataKey="y" fill="url(#colorGradient)" />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Error Logs Section */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Error Logs & Management
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Search, filter, and manage failed loan applications
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {errorLogs.length} Records
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enhanced Filters Section */}
            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="filters" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Quick Search
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="filters" className="space-y-6 mt-6">
                <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter Options
                  </h3>
                  
                  {/* Primary Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="loanId" className="text-sm font-medium flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Loan ID
                      </Label>
                      <Input
                        id="loanId"
                        value={filters.loanId}
                        onChange={(e) => handleFilterChange('loanId', e.target.value)}
                        placeholder="e.g., LN-20250630006"
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        value={filters.email}
                        onChange={(e) => handleFilterChange('email', e.target.value)}
                        placeholder="Enter email"
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        value={filters.phone}
                        onChange={(e) => handleFilterChange('phone', e.target.value)}
                        placeholder="Enter phone"
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="errorId" className="text-sm font-medium">Error Code</Label>
                      <Select value={filters.errorId} onValueChange={(value) => handleFilterChange('errorId', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select error code" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Error Codes</SelectItem>
                          {errorTypes.map((errorCode) => (
                            <SelectItem key={errorCode} value={errorCode}>
                              {errorCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Secondary Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="flagged" className="text-sm font-medium">Status</Label>
                      <Select value={filters.flagged} onValueChange={(value) => handleFilterChange('flagged', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Records</SelectItem>
                          <SelectItem value="true">Flagged Only</SelectItem>
                          <SelectItem value="false">Not Flagged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="retried" className="text-sm font-medium">Retry Status</Label>
                      <Select value={filters.retried} onValueChange={(value) => handleFilterChange('retried', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Records</SelectItem>
                          <SelectItem value="true">Retried</SelectItem>
                          <SelectItem value="false">Not Retried</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="from" className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        From Date
                      </Label>
                      <Input
                        id="from"
                        type="date"
                        value={filters.from}
                        onChange={(e) => handleFilterChange('from', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="to" className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        To Date
                      </Label>
                      <Input
                        id="to"
                        type="date"
                        value={filters.to}
                        onChange={(e) => handleFilterChange('to', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={fetchErrorLogs} 
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {loading ? 'Searching...' : 'Apply Filters'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                    disabled={loading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={fetchErrorLogs} 
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="search" className="space-y-4 mt-6">
                <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg border">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Quick search by Loan ID, Email, or Phone..."
                        className="h-10"
                      />
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Enhanced Table */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Loan Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Contact Info
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Financial Info
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Errors
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {errorLogs.length > 0 ? (
                      errorLogs.map((loan, index) => (
                        <tr key={loan.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${
                          index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/50'
                        }`}>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                                {loan.loanId}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {loan.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(loan.failedAt).toLocaleString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                <Mail className="h-3 w-3 text-gray-400" />
                                {loan.email}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-gray-400" />
                                {loan.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-green-500" />
                                ${loan.amount.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  loan.creditScore < 600 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                }`}>
                                  Credit: {loan.creditScore}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {loan.errors.map((error) => (
                                <Badge key={error.id} variant="destructive" className="text-xs">
                                  {error.code}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              {loan.flagged && (
                                <Badge variant="outline" className="text-xs w-fit">
                                  Flagged
                                </Badge>
                              )}
                              {loan.retried && (
                                <Badge variant="secondary" className="text-xs w-fit">
                                  Retried
                                </Badge>
                              )}
                              {!loan.flagged && !loan.retried && (
                                <Badge variant="default" className="text-xs w-fit bg-blue-100 text-blue-700">
                                  New
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              size="sm"
                              onClick={() => openRetryDialog(loan)}
                              disabled={loan.retried}
                              className="flex items-center gap-1 h-8 px-3"
                              variant={loan.retried ? "outline" : "default"}
                            >
                              <Edit className="h-3 w-3" />
                              {loan.retried ? 'Retried' : 'Edit & Retry'}
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <AlertCircle className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {loading ? 'Loading error logs...' : 'No error logs found'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {loading ? 'Please wait while we fetch the data' : 'Try adjusting your filters or refresh the data'}
                              </p>
                            </div>
                            {!loading && (
                              <Button variant="outline" size="sm" onClick={fetchErrorLogs}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh Data
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Retry Dialog */}
      <Dialog open={retryDialogOpen} onOpenChange={setRetryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Edit & Retry Loan Application
            </DialogTitle>
            <DialogDescription className="text-sm">
              Review and modify the loan details below before resubmitting the application.
              {editingLoan && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Original Loan ID: {editingLoan.loanId}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Show original errors first */}
            {editingLoan && editingLoan.errors.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Previous Errors (Please address these):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {editingLoan.errors.map((error) => (
                    <Badge key={error.id} variant="destructive" className="text-xs">
                      {error.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields in organized sections */}
            <div className="grid gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b pb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-loanId" className="text-sm font-medium">Loan ID</Label>
                    <Input
                      id="edit-loanId"
                      value={editFormData.loanId}
                      onChange={(e) => handleEditFormChange('loanId', e.target.value)}
                      placeholder="Enter loan ID"
                      className="h-10"
                    />
                    {editFormErrors.loanId && (
                      <p className="text-sm text-red-500">{editFormErrors.loanId}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-purpose" className="text-sm font-medium">Purpose</Label>
                    <Textarea
                      id="edit-purpose"
                      value={editFormData.purpose}
                      onChange={(e) => handleEditFormChange('purpose', e.target.value)}
                      placeholder="Enter loan purpose"
                      rows={3}
                      className="resize-none"
                    />
                    {editFormErrors.purpose && (
                      <p className="text-sm text-red-500">{editFormErrors.purpose}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.application.name}
                      onChange={(e) => handleEditFormChange('application.name', e.target.value)}
                      placeholder="Enter full name"
                      className="h-10"
                    />
                    {editFormErrors['application.name'] && (
                      <p className="text-sm text-red-500">{editFormErrors['application.name']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-age" className="text-sm font-medium">Age</Label>
                    <Input
                      id="edit-age"
                      type="number"
                      min="18"
                      max="100"
                      value={editFormData.application.age}
                      onChange={(e) => handleEditFormChange('application.age', parseInt(e.target.value) || 18)}
                      className="h-10"
                    />
                    {editFormErrors['application.age'] && (
                      <p className="text-sm text-red-500">{editFormErrors['application.age']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-creditScore" className="text-sm font-medium">Credit Score</Label>
                    <Input
                      id="edit-creditScore"
                      type="number"
                      min="300"
                      max="850"
                      value={editFormData.creditScore}
                      onChange={(e) => handleEditFormChange('creditScore', parseInt(e.target.value) || 300)}
                      placeholder="300-850"
                      className="h-10"
                    />
                    {editFormErrors.creditScore && (
                      <p className="text-sm text-red-500">{editFormErrors.creditScore}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b pb-2">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.application.email}
                      onChange={(e) => handleEditFormChange('application.email', e.target.value)}
                      placeholder="Enter email address"
                      className="h-10"
                    />
                    {editFormErrors['application.email'] && (
                      <p className="text-sm text-red-500">{editFormErrors['application.email']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" className="text-sm font-medium">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      value={editFormData.application.phone}
                      onChange={(e) => handleEditFormChange('application.phone', e.target.value)}
                      placeholder="Enter phone number"
                      className="h-10"
                    />
                    {editFormErrors['application.phone'] && (
                      <p className="text-sm text-red-500">{editFormErrors['application.phone']}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide border-b pb-2">
                  Financial Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount" className="text-sm font-medium">Loan Amount ($)</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      min="100"
                      value={editFormData.amount}
                      onChange={(e) => handleEditFormChange('amount', parseFloat(e.target.value) || 0)}
                      placeholder="Enter loan amount"
                      className="h-10"
                    />
                    {editFormErrors.amount && (
                      <p className="text-sm text-red-500">{editFormErrors.amount}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-income" className="text-sm font-medium">Monthly Income ($)</Label>
                    <Input
                      id="edit-income"
                      type="number"
                      min="0"
                      value={editFormData.income}
                      onChange={(e) => handleEditFormChange('income', parseFloat(e.target.value) || 0)}
                      placeholder="Enter monthly income"
                      className="h-10"
                    />
                    {editFormErrors.income && (
                      <p className="text-sm text-red-500">{editFormErrors.income}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={closeRetryDialog} disabled={isSubmittingRetry}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={submitRetry} disabled={isSubmittingRetry} className="bg-blue-600 hover:bg-blue-700">
              {isSubmittingRetry ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Resubmit Loan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}