import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Server, Cpu, Command, ExternalLink, Shield, Wifi, WifiOff, HardDrive, Cpu as CpuIcon, FolderOpen, List, Info, X, FileText, Folder, ChevronRight, Trash2, BarChart3, Eye, Download, Image, Search, Plus, Upload, Edit, Copy, Move, Home, ArrowUp, ArrowLeft, RefreshCw, Grid, ListIcon, Monitor, Volume2, Power, Settings, Database, Zap, Play, Camera } from 'lucide-react';

// NOTE: In production, change this to your actual server URL (e.g., ws://192.168.1.50:8001)
const WS_URL = "wss://omni-backend-603531145334.asia-south1.run.app/ws/dashboard";

// Helper function to format bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Function to parse and render AI response in a structured format
const renderAIResponse = (responseText) => {
  if (!responseText) return null;

  // Parse the markdown-style response
  const sections = {};
  const lines = responseText.split('\n');
  let currentSection = null;
  let currentContent = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Check for section headers
    if (trimmedLine.startsWith('## 📊 ANALYSIS SUMMARY')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = 'summary';
      currentContent = [];
    } else if (trimmedLine.startsWith('## 🔍 DETAILED INSIGHTS')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = 'insights';
      currentContent = [];
    } else if (trimmedLine.startsWith('## ⚠️ ISSUES IDENTIFIED')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = 'issues';
      currentContent = [];
    } else if (trimmedLine.startsWith('## 💡 RECOMMENDATIONS')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = 'recommendations';
      currentContent = [];
    } else if (trimmedLine.startsWith('## 🛠️ SUGGESTED COMMANDS')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = 'commands';
      currentContent = [];
    } else if (trimmedLine.startsWith('## 📈 NEXT STEPS')) {
      if (currentSection && currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      currentSection = 'nextsteps';
      currentContent = [];
    } else if (currentSection && trimmedLine && !trimmedLine.startsWith('##')) {
      currentContent.push(line);
    }
  });

  // Add the last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n');
  }

  // Parse insights into metrics for table display
  const parseInsights = (text) => {
    const metrics = [];
    if (text) {
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const match = line.match(/\*\s*\*\*(.+?)\s*\(([^)]+)\):\*\*(.+)/);
        if (match) {
          metrics.push({
            metric: match[1],
            value: match[2],
            description: match[3].trim()
          });
        }
      });
    }
    return metrics;
  };

  const parseIssues = (text) => {
    const issues = [];
    if (text) {
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        if (line.includes('🔴') || line.includes('🟡') || line.includes('🟢')) {
          const severity = line.includes('🔴') ? 'Critical' : line.includes('🟡') ? 'Warning' : 'Info';
          const description = line.replace(/[🔴🟡🟢]\s*\*\*\w+:\*\*/, '').trim();
          issues.push({ severity, description });
        }
      });
    }
    return issues;
  };

  const parseRecommendations = (text) => {
    const recommendations = [];
    if (text) {
      const lines = text.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const match = line.match(/(\d+)\.\s*\*\*(.+?):\*\*(.+)/);
        if (match) {
          recommendations.push({
            priority: match[1],
            title: match[2],
            description: match[3].trim()
          });
        }
      });
    }
    return recommendations;
  };

  const metrics = parseInsights(sections.insights);
  const issues = parseIssues(sections.issues);
  const recommendations = parseRecommendations(sections.recommendations);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {sections.summary && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <h5 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
            📊 Analysis Summary
          </h5>
          <p className="text-slate-300 text-sm">{sections.summary.trim()}</p>
        </div>
      )}

      {/* System Metrics Table */}
      {metrics.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <h5 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
            🔍 System Metrics
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left text-slate-400 font-medium py-2">Metric</th>
                  <th className="text-left text-slate-400 font-medium py-2">Current Value</th>
                  <th className="text-left text-slate-400 font-medium py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr key={idx} className="border-b border-slate-700">
                    <td className="py-2 text-white font-medium">{metric.metric}</td>
                    <td className="py-2">
                      <span className="bg-slate-700 px-2 py-1 rounded text-emerald-400 font-mono">
                        {metric.value}
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">{metric.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issues Table */}
      {issues.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <h5 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
            ⚠️ Issues Identified
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left text-slate-400 font-medium py-2">Severity</th>
                  <th className="text-left text-slate-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, idx) => (
                  <tr key={idx} className="border-b border-slate-700">
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        issue.severity === 'Critical' ? 'bg-red-900 text-red-300' :
                        issue.severity === 'Warning' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-green-900 text-green-300'
                      }`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">{issue.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations Table */}
      {recommendations.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <h5 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
            💡 Recommendations
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left text-slate-400 font-medium py-2">Priority</th>
                  <th className="text-left text-slate-400 font-medium py-2">Action</th>
                  <th className="text-left text-slate-400 font-medium py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec, idx) => (
                  <tr key={idx} className="border-b border-slate-700">
                    <td className="py-2">
                      <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                        #{rec.priority}
                      </span>
                    </td>
                    <td className="py-2 text-white font-medium">{rec.title}</td>
                    <td className="py-2 text-slate-300">{rec.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {sections.nextsteps && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <h5 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
            📈 Next Steps
          </h5>
          <div className="text-slate-300 text-sm whitespace-pre-line">{sections.nextsteps.trim()}</div>
        </div>
      )}

      {/* Fallback for unstructured content */}
      {Object.keys(sections).length === 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <div className="text-slate-300 text-sm whitespace-pre-wrap">{responseText}</div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [socket, setSocket] = useState(null);
  const [devices, setDevices] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [commandInput, setCommandInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('terminal');
  const [processes, setProcesses] = useState([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [directoryContents, setDirectoryContents] = useState([]);
  const [systemInfo, setSystemInfo] = useState({});
  const [commandHistory, setCommandHistory] = useState([]);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [networkHistory, setNetworkHistory] = useState([]);
  const [processCountHistory, setProcessCountHistory] = useState([]);
  const [diskUsageHistory, setDiskUsageHistory] = useState([]);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("file"); // "file" or "folder"
  const [createName, setCreateName] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [clipboard, setClipboard] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [sortBy, setSortBy] = useState("name"); // "name", "size", "modified"
  const [sortOrder, setSortOrder] = useState("asc");
  const terminalEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // New feature states
  const [livePreview, setLivePreview] = useState(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [streamQuality, setStreamQuality] = useState('medium'); // low, medium, high
  const [streamInterval, setStreamInterval] = useState(1); // seconds
  const [lastFrameTime, setLastFrameTime] = useState(null);
  const [audioInfo, setAudioInfo] = useState({ volume: 50, muted: false, devices: [] });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [services, setServices] = useState([]);
  const [environmentVars, setEnvironmentVars] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [logType, setLogType] = useState("system");
  
  // AI Assistant states - stored per device
  const [deviceAiStates, setDeviceAiStates] = useState({});
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiAnalysisType, setAiAnalysisType] = useState("general");
  const [aiLoading, setAiLoading] = useState(false);
  const [securityReport, setSecurityReport] = useState(null);
  const [performanceReport, setPerformanceReport] = useState(null);
  const [systemContext, setSystemContext] = useState(null);

  // --- MOCK DATA FOR PREVIEW MODE (If server is not running) ---
  const [isMock, setIsMock] = useState(false);
  const [requestId, setRequestId] = useState(1);
  
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
        setIsMock(false);
        console.log("Connected to Control Server");
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Fallback to mock mode if connection fails immediately (for preview purposes)
        if (!isConnected) setIsMock(true); 
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      };

      setSocket(ws);
    } catch (e) {
      setIsMock(true);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Mock Data Generator for Preview
  useEffect(() => {
    if (!isMock) return;
    const interval = setInterval(() => {
        const mockId = "laptop-alpha-01";
        const mockId2 = "workstation-delta-05";
        
        handleMessage({
            type: "stats",
            device_id: mockId,
            data: {
                cpu_percent: Math.floor(Math.random() * 30) + 10,
                ram_percent: Math.floor(Math.random() * 20) + 40,
                disk_percent: Math.floor(Math.random() * 10) + 15,
                process_count: Math.floor(Math.random() * 50) + 150,
                network_io: {
                    bytes_sent: Math.floor(Math.random() * 1000000) + 5000000,
                    bytes_recv: Math.floor(Math.random() * 2000000) + 10000000,
                    packets_sent: Math.floor(Math.random() * 1000) + 5000,
                    packets_recv: Math.floor(Math.random() * 2000) + 10000
                },
                platform: "Linux (Ubuntu 22.04)",
                hostname: mockId
            }
        });
        
         handleMessage({
            type: "stats",
            device_id: mockId2,
            data: {
                cpu_percent: Math.floor(Math.random() * 15) + 5,
                ram_percent: Math.floor(Math.random() * 10) + 20,
                disk_percent: Math.floor(Math.random() * 5) + 8,
                process_count: Math.floor(Math.random() * 30) + 120,
                network_io: {
                    bytes_sent: Math.floor(Math.random() * 500000) + 3000000,
                    bytes_recv: Math.floor(Math.random() * 1500000) + 8000000,
                    packets_sent: Math.floor(Math.random() * 500) + 3000,
                    packets_recv: Math.floor(Math.random() * 1500) + 8000
                },
                platform: "Windows 11",
                hostname: mockId2
            }
        });
        
        handleMessage({ type: "device_list", devices: [mockId, mockId2] });
    }, 2000);
    return () => clearInterval(interval);
  }, [isMock]);

  // Auto-manage live preview with periodic frame requests
  useEffect(() => {
    let interval;
    
    if (isLiveStreaming && selectedDevice && activeTab === 'desktop') {
      // Start requesting frames at the specified interval
      interval = setInterval(() => {
        sendRequest("get_live_frame", { quality: streamQuality });
      }, streamInterval * 1000);
    }
    
    // Cleanup function
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      
      // Stop live preview if not on desktop tab or no device selected
      if (isLiveStreaming && (activeTab !== 'desktop' || !selectedDevice)) {
        stopLivePreview();
      }
    };
  }, [isLiveStreaming, selectedDevice, activeTab, streamInterval, streamQuality]);


  const handleMessage = (msg) => {
    console.log("Received message:", msg);
    
    if (msg.type === "stats") {
      setDevices(prev => ({
        ...prev,
        [msg.device_id]: {
          ...(prev[msg.device_id] || {}),
          ...msg.data,
          lastSeen: new Date()
        }
      }));
      
      // Update performance history for charts
      const timestamp = Date.now();
      if (msg.data?.cpu_percent !== undefined) {
        setCpuHistory(prev => {
          const newHistory = [...prev, { time: timestamp, value: msg.data.cpu_percent }];
          return newHistory.slice(-30); // Keep last 30 points
        });
      }
      if (msg.data?.ram_percent !== undefined) {
        setMemoryHistory(prev => {
          const newHistory = [...prev, { time: timestamp, value: msg.data.ram_percent }];
          return newHistory.slice(-30);
        });
      }
      if (msg.data?.disk_percent !== undefined) {
        setDiskUsageHistory(prev => {
          const newHistory = [...prev, { time: timestamp, value: msg.data.disk_percent }];
          return newHistory.slice(-30);
        });
      }
      if (msg.data?.network_io) {
        setNetworkHistory(prev => {
          const currentTime = timestamp;
          const currentRx = msg.data.network_io.bytes_recv || 0;
          const currentTx = msg.data.network_io.bytes_sent || 0;
          
          // Calculate rate if we have previous data
          let rxRate = 0;
          let txRate = 0;
          
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const timeDiff = (currentTime - lastPoint.time) / 1000; // seconds
            
            if (timeDiff > 0) {
              rxRate = Math.max(0, (currentRx - lastPoint.rxBytes) / timeDiff); // bytes per second
              txRate = Math.max(0, (currentTx - lastPoint.txBytes) / timeDiff);
            }
          }
          
          const newHistory = [...prev, { 
            time: currentTime, 
            rx: rxRate, 
            tx: txRate,
            rxBytes: currentRx,
            txBytes: currentTx
          }];
          return newHistory.slice(-30);
        });
      }
      if (msg.data?.process_count !== undefined) {
        setProcessCountHistory(prev => {
          const newHistory = [...prev, { time: timestamp, value: msg.data.process_count }];
          return newHistory.slice(-30);
        });
      }
    } else if (msg.type === "response") {
      console.log("Response received:", msg.request_type, msg.result);
      
      if (msg.request_type === "execute") {
        // Handle execute response properly - extract text content
        let outputText = "";
        if (typeof msg.result === 'object' && msg.result !== null) {
          if (msg.result.output !== undefined) {
            outputText = msg.result.output;
          } else if (msg.result.error !== undefined) {
            outputText = `Error: ${msg.result.error}`;
          } else {
            outputText = JSON.stringify(msg.result, null, 2);
          }
        } else {
          outputText = String(msg.result || "");
        }
        
        setTerminalOutput(prev => [...prev, { 
          source: msg.device_id, 
          text: outputText, 
          type: 'output' 
        }]);
        
        // Update current path if command execution returns working directory
        if (msg.result?.working_dir) {
          setCurrentPath(msg.result.working_dir);
        }
      } else if (msg.request_type === "get_processes") {
        console.log("Setting processes:", msg.result?.processes?.length);
        setProcesses(msg.result?.processes || []);
      } else if (msg.request_type === "get_directory") {
        console.log("Setting directory:", msg.result?.current_path);
        setCurrentPath(msg.result?.current_path || '.');
        setDirectoryContents(msg.result?.items || []);
      } else if (msg.request_type === "get_system_info") {
        console.log("Setting system info:", Object.keys(msg.result || {}));
        setSystemInfo(msg.result || {});
      } else if (msg.request_type === "read_file") {
        console.log("File content received:", msg.result?.type);
        setFileContent(msg.result);
        setFileViewerOpen(true);
      } else if (msg.request_type === "open_file") {
        console.log("File opened with system:", msg.result?.success || msg.result?.error);
      } else if (msg.request_type === "download_file") {
        if (msg.result?.content) {
          // Create download link
          const byteCharacters = atob(msg.result.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: msg.result.mime_type });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = msg.result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (msg.request_type === "search_files") {
        console.log("Search results received:", msg.result?.results?.length);
        setSearchResults(msg.result?.results || []);
      } else if (msg.request_type === "create_file" || msg.request_type === "create_directory" || 
                 msg.request_type === "delete_item" || msg.request_type === "rename_item" || 
                 msg.request_type === "copy_item" || msg.request_type === "upload_file") {
        console.log("File operation result:", msg.result?.success || msg.result?.error);
        // Refresh directory after file operations
        setTimeout(() => loadDirectory(currentPath), 500);
      } else if (msg.request_type === "take_screenshot" || msg.request_type === "start_live_preview" || msg.request_type === "live_frame" || msg.request_type === "get_live_frame") {
        console.log("Live frame/Screenshot received:", msg.result?.width, msg.result?.height);
        
        // Only update live preview if we have valid image data
        if (msg.result && msg.result.image && !msg.result.error) {
          setLivePreview(msg.result);
          setLastFrameTime(new Date());
        } else if (msg.result && msg.result.error) {
          console.error("Live frame error:", msg.result.error);
          // Don't update livePreview if there's an error
        }
        
        setIsCapturingScreen(false);
      } else if (msg.request_type === "get_audio_info") {
        console.log("Audio info received:", msg.result);
        setAudioInfo(msg.result);
      } else if (msg.request_type === "set_volume") {
        console.log("Volume set:", msg.result?.success || msg.result?.error);
        // Refresh audio info after volume change
        setTimeout(() => sendRequest("get_audio_info"), 200);
      } else if (msg.request_type === "power_operation") {
        console.log("Power operation:", msg.result?.success || msg.result?.error);
        alert(msg.result?.success || msg.result?.error);
      } else if (msg.request_type === "get_network_info") {
        console.log("Network info received:", msg.result);
        setNetworkInfo(msg.result);
      } else if (msg.request_type === "get_services") {
        console.log("Services received:", msg.result?.services?.length);
        setServices(msg.result?.services || []);
      } else if (msg.request_type === "get_environment_variables") {
        console.log("Environment variables received:", msg.result?.variables?.length);
        setEnvironmentVars(msg.result?.variables || []);
      } else if (msg.request_type === "get_system_logs") {
        console.log("System logs received:", msg.result?.logs?.length);
        setSystemLogs(msg.result?.logs || []);
      } else if (msg.request_type === "ai_analyze_system") {
        console.log("AI analysis received:", msg.result);
        setAiResponse(msg.result);
        setAiLoading(false);
      } else if (msg.request_type === "ai_security_analysis") {
        console.log("Security analysis received:", msg.result);
        setSecurityReport(msg.result);
        setAiLoading(false);
      } else if (msg.request_type === "ai_performance_optimization") {
        console.log("Performance analysis received:", msg.result);
        setPerformanceReport(msg.result);
        setAiLoading(false);
      } else if (msg.request_type === "get_system_context") {
        console.log("System context received:", msg.result);
        setSystemContext(msg.result);
      }
    } else if (msg.type === "device_list") {
        msg.devices.forEach(d => {
            setDevices(prev => ({
                ...prev,
                [d]: prev[d] || { hostname: d, status: 'online' }
            }))
        });
    }
  };

  const sendCommand = (e) => {
    e.preventDefault();
    if (!commandInput.trim() || !selectedDevice) return;

    const cmd = commandInput;
    
    setTerminalOutput(prev => [...prev, { 
      source: "ME", 
      text: `${selectedDevice}:${currentPath}$ ${cmd}`, 
      type: 'input' 
    }]);

    // Add to command history
    setCommandHistory(prev => {
      const newHistory = [cmd, ...prev.filter(c => c !== cmd)];
      return newHistory.slice(0, 10); // Keep last 10 commands
    });

    if (isMock) {
        setTimeout(() => {
            setTerminalOutput(prev => [...prev, {
                source: selectedDevice,
                text: `Executing on ${selectedDevice}...\nOutput: Command simulated successfully in Preview Mode.`,
                type: 'output'
            }]);
        }, 500);
    } else if (socket && socket.readyState === WebSocket.OPEN) {
      const reqId = requestId;
      setRequestId(prev => prev + 1);
      
      socket.send(JSON.stringify({
        type: "command",
        target: selectedDevice,
        request_id: reqId,
        cmd: cmd
      }));
    }

    setCommandInput("");
  };

  const startLivePreview = () => {
    if (!selectedDevice || isLiveStreaming) return;
    
    setIsLiveStreaming(true);
    sendRequest("start_live_preview", { 
      quality: streamQuality,
      interval: streamInterval
    });
  };

  const stopLivePreview = () => {
    setIsLiveStreaming(false);
    sendRequest("stop_live_preview");
  };

  const toggleLivePreview = () => {
    if (isLiveStreaming) {
      stopLivePreview();
    } else {
      startLivePreview();
    }
  };

  const captureScreenshot = () => {
    if (!selectedDevice) return;
    
    setIsCapturingScreen(true);
    sendRequest("take_screenshot", { quality: streamQuality });
  };

  const sendRequest = (type, data = {}) => {
    if (!selectedDevice || !socket || socket.readyState !== WebSocket.OPEN) {
      console.log("Cannot send request - no connection");
      return;
    }
    
    const reqId = requestId;
    setRequestId(prev => prev + 1);
    
    const requestData = {
      type: "request",
      target: selectedDevice,
      request_id: reqId,
      request_type: type,
      ...data
    };
    
    console.log("Sending request:", requestData);
    socket.send(JSON.stringify(requestData));
  };

  const loadProcesses = () => {
    console.log("Loading processes...");
    sendRequest("get_processes");
  };
  
  const loadDirectory = (path) => {
    console.log("Loading directory:", path);
    sendRequest("get_directory", { path });
  };
  
  const loadSystemInfo = () => {
    console.log("Loading system info...");
    sendRequest("get_system_info");
  };
  
  const killProcess = (pid) => {
    console.log("Killing process:", pid);
    sendRequest("kill_process", { pid });
  };

  const openFile = (filePath, fileName) => {
    console.log("Opening file:", filePath);
    sendRequest("read_file", { file_path: filePath });
  };

  const openWithSystem = (filePath) => {
    console.log("Opening with system:", filePath);
    sendRequest("open_file", { file_path: filePath });
  };

  const downloadFile = (filePath) => {
    console.log("Downloading file:", filePath);
    sendRequest("download_file", { file_path: filePath });
  };

  const searchFiles = () => {
    if (!searchQuery.trim()) return;
    console.log("Searching files:", searchQuery, "in:", currentPath);
    sendRequest("search_files", { query: searchQuery, path: currentPath });
  };

  const createNewItem = () => {
    if (!createName.trim()) return;
    
    const fullPath = `${currentPath}/${createName}`;
    
    if (createType === "file") {
      sendRequest("create_file", { file_path: fullPath, content: "" });
    } else {
      sendRequest("create_directory", { dir_path: fullPath });
    }
    
    setShowCreateModal(false);
    setCreateName("");
  };

  const deleteItem = (itemPath) => {
    if (confirm("Are you sure you want to delete this item?")) {
      sendRequest("delete_item", { path: itemPath });
    }
  };

  const renameItem = (itemPath) => {
    const currentName = itemPath.split('/').pop();
    const newName = prompt("Enter new name:", currentName);
    if (newName && newName !== currentName) {
      sendRequest("rename_item", { old_path: itemPath, new_name: newName });
    }
  };

  const copyItem = (itemPath) => {
    setClipboard({ path: itemPath, operation: "copy" });
  };

  const cutItem = (itemPath) => {
    setClipboard({ path: itemPath, operation: "cut" });
  };

  const pasteItem = () => {
    if (!clipboard) return;
    
    const itemName = clipboard.path.split('/').pop();
    const destPath = `${currentPath}/${itemName}`;
    
    if (clipboard.operation === "copy") {
      sendRequest("copy_item", { source_path: clipboard.path, dest_path: destPath });
    } else if (clipboard.operation === "cut") {
      sendRequest("rename_item", { old_path: clipboard.path, new_name: destPath });
    }
    
    setClipboard(null);
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      console.log("Uploading file:", file.name, "size:", file.size);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Convert ArrayBuffer to base64
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
          }
          const base64Content = btoa(binaryString);
          
          const filePath = `${currentPath}/${file.name}`;
          console.log("Sending upload request for:", filePath);
          
          sendRequest("upload_file", { file_path: filePath, content: base64Content });
          
        } catch (error) {
          console.error("Upload error:", error);
          alert(`Upload failed for ${file.name}: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        console.error("File read error for:", file.name);
        alert(`Failed to read file: ${file.name}`);
      };
      
      reader.readAsArrayBuffer(file);
    });
    
    event.target.value = ""; // Reset input
  };

  // AI Assistant Functions
  const askAI = () => {
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    sendRequest("ai_analyze_system", { 
      query: aiQuery, 
      context_type: aiAnalysisType 
    });
  };

  const runSecurityAnalysis = () => {
    setAiLoading(true);
    sendRequest("ai_security_analysis");
  };

  const runPerformanceAnalysis = () => {
    setAiLoading(true);
    sendRequest("ai_performance_optimization");
  };

  const executeAISuggestedCommand = (command) => {
    if (window.confirm(`Execute command: ${command}?`)) {
      setTerminalOutput(prev => [...prev, { 
        source: selectedDevice, 
        text: command, 
        type: 'input' 
      }]);
      
      const reqId = requestId;
      setRequestId(prev => prev + 1);
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "command",
          target: selectedDevice,
          request_id: reqId,
          cmd: command
        }));
      }
    }
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  // Auto-load data when device is selected and manage per-device AI states
  useEffect(() => {
    if (selectedDevice && !isMock) {
      // Save current AI state before switching (if there was a previous device)
      const currentDeviceId = Object.keys(devices).find(id => devices[id] === selectedDevice);
      if (currentDeviceId) {
        setDeviceAiStates(prev => ({
          ...prev,
          [currentDeviceId]: {
            aiQuery,
            aiResponse,
            aiAnalysisType,
            securityReport,
            performanceReport,
            systemContext
          }
        }));
      }
      
      // Clear historical monitoring data when switching devices
      setCpuHistory([]);
      setMemoryHistory([]);
      setNetworkHistory([]);
      setProcessCountHistory([]);
      setDiskUsageHistory([]);
      
      // Clear other data that might be device-specific
      setTerminalOutput([]);
      setSystemInfo({});
      setProcesses([]);
      setDirectoryContents([]);
      setServices([]);
      setEnvironmentVars([]);
      setSystemLogs([]);
      setAudioInfo({ volume: 50, muted: false, devices: [] });
      setNetworkInfo(null);
      setLivePreview(null);
      setIsLiveStreaming(false);
      
      // Restore AI state for the selected device or set defaults
      const deviceId = Object.keys(devices).find(id => devices[id] === selectedDevice);
      const savedAiState = deviceAiStates[deviceId];
      if (savedAiState) {
        setAiQuery(savedAiState.aiQuery || "");
        setAiResponse(savedAiState.aiResponse || null);
        setAiAnalysisType(savedAiState.aiAnalysisType || "general");
        setSecurityReport(savedAiState.securityReport || null);
        setPerformanceReport(savedAiState.performanceReport || null);
        setSystemContext(savedAiState.systemContext || null);
      } else {
        // Set defaults for new device
        setAiQuery("");
        setAiResponse(null);
        setAiAnalysisType("general");
        setSecurityReport(null);
        setPerformanceReport(null);
        setSystemContext(null);
      }
      
      // Reset loading state
      setAiLoading(false);
      
      // Load fresh data for the new device
      loadSystemInfo();
    }
  }, [selectedDevice]);

  // Auto-save AI state when AI data changes
  useEffect(() => {
    if (selectedDevice && !isMock) {
      const deviceId = Object.keys(devices).find(id => devices[id] === selectedDevice);
      if (deviceId) {
        setDeviceAiStates(prev => ({
          ...prev,
          [deviceId]: {
            aiQuery,
            aiResponse,
            aiAnalysisType,
            securityReport,
            performanceReport,
            systemContext
          }
        }));
      }
    }
  }, [selectedDevice, aiQuery, aiResponse, aiAnalysisType, securityReport, performanceReport, systemContext, devices]);

  // Handle tab switching and load appropriate data
  useEffect(() => {
    if (selectedDevice && !isMock) {
      // Load data specific to the current tab
      switch(activeTab) {
        case 'processes':
          loadProcesses();
          break;
        case 'files':
          loadDirectory(currentPath);
          break;
        case 'monitor':
          sendRequest('get_system_info');
          break;
        case 'services':
          sendRequest('get_services');
          break;
        case 'env':
          sendRequest('get_environment_variables');
          break;
        case 'logs':
          sendRequest('get_system_logs', { log_type: logType });
          break;
        case 'audio':
          sendRequest('get_audio_info');
          break;
        case 'network':
          sendRequest('get_network_info');
          break;
        case 'desktop':
          if (!isLiveStreaming) {
            captureScreenshot();
          }
          break;
      }
    }
  }, [selectedDevice, activeTab, currentPath, logType, isLiveStreaming]);

  // Auto-refresh data based on current tab
  useEffect(() => {
    if (selectedDevice && !isMock) {
      let interval;
      
      switch(activeTab) {
        case 'processes':
          interval = setInterval(loadProcesses, 5000);
          break;
        case 'monitor':
          interval = setInterval(() => sendRequest('get_system_info'), 3000);
          break;
        case 'services':
          interval = setInterval(() => sendRequest('get_services'), 10000);
          break;
        case 'env':
          interval = setInterval(() => sendRequest('get_environment_variables'), 10000);
          break;
        case 'logs':
          interval = setInterval(() => sendRequest('get_system_logs', { log_type: logType }), 5000);
          break;
        case 'audio':
          interval = setInterval(() => sendRequest('get_audio_info'), 5000);
          break;
        case 'network':
          interval = setInterval(() => sendRequest('get_network_info'), 5000);
          break;
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [selectedDevice, activeTab, logType]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + ` - Focus terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        if (selectedDevice) {
          setActiveTab('terminal');
          // Focus terminal input after a short delay to ensure tab switch
          setTimeout(() => {
            const terminalInput = document.querySelector('#terminal-input');
            if (terminalInput) {
              terminalInput.focus();
            }
          }, 100);
        }
      }
      
      // Ctrl + L - Focus terminal (alternative shortcut)
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        if (selectedDevice) {
          setActiveTab('terminal');
          // Focus terminal input after a short delay to ensure tab switch
          setTimeout(() => {
            const terminalInput = document.querySelector('#terminal-input');
            if (terminalInput) {
              terminalInput.focus();
            }
          }, 100);
        }
      }
      
      // Ctrl + F - Focus files tab
      if (e.ctrlKey && e.key === 'f' && !e.shiftKey) {
        e.preventDefault();
        if (selectedDevice) {
          setActiveTab('files');
        }
      }
      
      // Ctrl + M - Focus monitor tab
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        if (selectedDevice) {
          setActiveTab('monitor');
        }
      }
      
      // Ctrl + H - Go back to home (no device selected)
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setSelectedDevice(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDevice]);

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden">
      {/* Global Styles for Scrollbar and Custom Animations */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-soft { animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      {/* Sidebar: Device List */}
      <div className="w-80 bg-[#1e293b] border-r border-slate-700/50 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between bg-[#1e293b]">
          <h1 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <div className="bg-emerald-500/20 p-1.5 rounded-lg">
              <Shield className="text-emerald-400 w-6 h-6" />
            </div>
            <span>OMNICONTROL</span>
          </h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-[10px] font-bold text-rose-500 uppercase">Offline</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <div className="px-2 pb-2">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Nodes</h2>
          </div>
          
          {Object.entries(devices).map(([id, stats]) => (
            <button 
              key={id}
              onClick={() => setSelectedDevice(id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 border group ${
                selectedDevice === id 
                ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' 
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`font-bold text-sm truncate ${selectedDevice === id ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {stats.hostname || id}
                </span>
                <Wifi className={`w-3.5 h-3.5 ${selectedDevice === id ? 'text-emerald-400' : 'text-slate-500'}`} />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1.5"><CpuIcon className="w-3 h-3" /> CPU</span>
                  <span className="font-mono text-slate-300">{stats.cpu_percent}%</span>
                </div>
                <div className="w-full bg-slate-900/50 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${stats.cpu_percent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${stats.cpu_percent || 0}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500 flex items-center gap-1.5"><Activity className="w-3 h-3" /> RAM</span>
                  <span className="font-mono text-slate-300">{stats.ram_percent}%</span>
                </div>
                <div className="w-full bg-slate-900/50 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${stats.ram_percent || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center gap-2 overflow-hidden">
                <Server className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="text-[10px] text-slate-500 truncate italic">{stats.platform || 'Kernel unknown'}</span>
              </div>
            </button>
          ))}

          {Object.keys(devices).length === 0 && (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/20">
              <WifiOff className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Waiting for laptop agents to broadcast...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#0f172a] relative">
        
        {/* Header Navigation */}
        <div className="h-20 border-b border-slate-800/50 flex items-center justify-between px-8 bg-[#1e293b]/30 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            {selectedDevice ? (
              <>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <Terminal className="text-emerald-400 w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Active Session</h2>
                  <p className="text-xl font-bold text-white">{selectedDevice}</p>
                </div>
              </>
            ) : (
               <div className="flex items-center gap-3 text-slate-500">
                 <Command className="w-5 h-5 animate-pulse-soft" />
                 <span className="text-sm font-medium tracking-wide">Waiting for session selection...</span>
               </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {selectedDevice && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700 transition-colors text-slate-400 hover:text-emerald-400 mr-2"
                  title="Back to Home"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                  {['terminal', 'files', 'processes', 'monitor', 'info', 'desktop', 'audio', 'power', 'network', 'services', 'env', 'logs', 'ai'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      activeTab === tab 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {tab === 'terminal' && <Terminal className="w-4 h-4 inline mr-1" />}
                    {tab === 'files' && <FolderOpen className="w-4 h-4 inline mr-1" />}
                    {tab === 'processes' && <List className="w-4 h-4 inline mr-1" />}
                    {tab === 'monitor' && <BarChart3 className="w-4 h-4 inline mr-1" />}
                    {tab === 'info' && <Info className="w-4 h-4 inline mr-1" />}
                    {tab === 'desktop' && <Monitor className="w-4 h-4 inline mr-1" />}
                    {tab === 'audio' && <Volume2 className="w-4 h-4 inline mr-1" />}
                    {tab === 'power' && <Power className="w-4 h-4 inline mr-1" />}
                    {tab === 'network' && <Wifi className="w-4 h-4 inline mr-1" />}
                    {tab === 'services' && <Settings className="w-4 h-4 inline mr-1" />}
                    {tab === 'env' && <Database className="w-4 h-4 inline mr-1" />}
                    {tab === 'logs' && <FileText className="w-4 h-4 inline mr-1" />}
                    {tab === 'ai' && <Zap className="w-4 h-4 inline mr-1" />}
                    {tab === 'desktop' ? 'Remote Desktop' : 
                     tab === 'env' ? 'Environment' : 
                     tab === 'ai' ? 'AI Assistant' : 
                     tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs font-mono text-slate-400">
                0.0.0.0:8001
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - Different views based on active tab */}
        <div className={`flex-1 overflow-hidden flex flex-col ${selectedDevice ? 'p-6' : 'p-8'}`}>
          {selectedDevice ? (
            <>
              {activeTab === 'terminal' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 font-mono text-[13px] overflow-y-auto custom-scrollbar shadow-2xl relative group">
                  <div className="absolute top-4 right-4 text-[10px] text-slate-700 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Terminal Live Stream
                  </div>
                  <div className="text-emerald-500/50 mb-6 flex items-start gap-3">
                    <Shield className="w-4 h-4 mt-1" />
                    <span>
                      OmniControl Remote Shell [Version 1.0.4]<br/>
                      Established secure tunnel to node: {selectedDevice}<br/>
                      ---
                    </span>
                  </div>
                  
                  {terminalOutput.map((log, idx) => (
                    <div key={idx} className="mb-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      {log.type === 'input' ? (
                         <div className="flex gap-2">
                            <span className="text-emerald-500 font-bold">➜</span>
                            <span className="text-white font-medium">{log.text}</span>
                         </div>
                      ) : (
                         <div className="pl-6 text-slate-400 leading-relaxed border-l-2 border-slate-800/50 ml-1.5 whitespace-pre-wrap">
                            {typeof log.text === 'object' ? JSON.stringify(log.text, null, 2) : log.text}
                         </div>
                      )}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              )}

              {activeTab === 'files' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                  {/* File Manager Header */}
                  <div className="p-4 border-b border-slate-800/50 space-y-4">
                    {/* Top Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="text-emerald-400 w-5 h-5" />
                        <span className="text-emerald-500/50 text-sm">Advanced File Manager</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex rounded-lg bg-slate-800/50 p-1">
                          <button
                            onClick={() => setViewMode("list")}
                            className={`p-1 rounded ${viewMode === "list" ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <ListIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1 rounded ${viewMode === "grid" ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <Grid className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => loadDirectory(currentPath)}
                          className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Navigation Bar */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => loadDirectory("/")}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"
                        title="Home"
                      >
                        <Home className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => loadDirectory(currentPath + "/..")}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"
                        title="Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      
                      {/* Breadcrumb */}
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-xs text-slate-500 mr-2">Path:</span>
                        <div className="bg-slate-900/50 rounded px-3 py-1 text-xs font-mono text-slate-300 truncate">
                          {currentPath}
                        </div>
                      </div>
                    </div>
                    
                    {/* Search and Actions Bar */}
                    <div className="flex items-center gap-2">
                      {/* Search */}
                      <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg px-3 py-2 flex-1">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
                          placeholder="Search files and folders..."
                          className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-slate-500"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <button 
                        onClick={() => { setCreateType("folder"); setShowCreateModal(true); }}
                        className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1"
                        title="New Folder"
                      >
                        <Folder className="w-4 h-4" />
                        <span className="hidden sm:inline">Folder</span>
                      </button>
                      
                      <button 
                        onClick={() => { setCreateType("file"); setShowCreateModal(true); }}
                        className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs flex items-center gap-1"
                        title="New File"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">File</span>
                      </button>
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-xs flex items-center gap-1"
                        title="Upload"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Upload</span>
                      </button>
                      
                      {clipboard && (
                        <button 
                          onClick={pasteItem}
                          className="px-3 py-2 bg-orange-600/80 hover:bg-orange-600 text-white rounded-lg text-xs flex items-center gap-1"
                          title="Paste"
                        >
                          <Copy className="w-4 h-4" />
                          Paste
                        </button>
                      )}
                    </div>
                    
                    {/* Sort Options */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Sort by:</span>
                      {['name', 'size', 'modified'].map(option => (
                        <button
                          key={option}
                          onClick={() => setSortBy(option)}
                          className={`px-2 py-1 rounded ${sortBy === option ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-2 py-1 rounded text-slate-400 hover:text-white"
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                  
                  {/* File Content Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {searchResults.length > 0 ? (
                      /* Search Results */
                      <div className="p-4">
                        <div className="text-sm text-slate-400 mb-4">
                          Found {searchResults.length} results for "{searchQuery}"
                        </div>
                        <div className="space-y-2">
                          {searchResults.map((item, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-all group cursor-pointer"
                              onClick={() => {
                                if (item.type === 'directory') {
                                  loadDirectory(item.path);
                                } else {
                                  openFile(item.path, item.name);
                                }
                                setSearchResults([]);
                                setSearchQuery("");
                              }}
                            >
                              {item.type === 'directory' ? (
                                <Folder className="w-4 h-4 text-blue-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-slate-400" />
                              )}
                              <div className="flex-1">
                                <div className="text-white text-sm">{item.name}</div>
                                <div className="text-xs text-slate-500">
                                  {item.parent} • {item.type === 'file' ? `${(item.size / 1024).toFixed(1)} KB` : 'Folder'}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Regular File Browser */
                      <div className="p-4">
                        <div className={viewMode === 'grid' ? 'grid grid-cols-4 gap-3' : 'space-y-1'}>
                          {directoryContents
                            .sort((a, b) => {
                              let aVal = a[sortBy];
                              let bVal = b[sortBy];
                              
                              if (sortBy === 'size') {
                                aVal = a.size || 0;
                                bVal = b.size || 0;
                              }
                              
                              if (sortOrder === 'desc') {
                                [aVal, bVal] = [bVal, aVal];
                              }
                              
                              return aVal > bVal ? 1 : -1;
                            })
                            .map((item, idx) => (
                              viewMode === 'grid' ? (
                                /* Grid View */
                                <div 
                                  key={idx}
                                  className={`p-3 rounded-lg border transition-all group cursor-pointer ${
                                    !item.error ? 'hover:bg-slate-800 border-slate-700/50' : 'border-red-500/20 opacity-50'
                                  } ${item.name === '..' ? 'border-emerald-500/20' : ''}`}
                                >
                                  <div 
                                    onClick={() => {
                                      if (!item.error) {
                                        if (item.type === 'directory') {
                                          loadDirectory(item.path);
                                        } else {
                                          openFile(item.path, item.name);
                                        }
                                      }
                                    }}
                                    className="flex flex-col items-center text-center"
                                  >
                                    {item.type === 'directory' ? (
                                      <Folder className={`w-8 h-8 mb-2 ${item.error ? 'text-red-400' : 'text-blue-400'}`} />
                                    ) : (
                                      <FileText className={`w-8 h-8 mb-2 ${item.error ? 'text-red-400' : 'text-slate-400'}`} />
                                    )}
                                    <span className="text-white text-xs truncate w-full">{item.name}</span>
                                    <span className="text-slate-500 text-xs">
                                      {item.type === 'file' && !item.error ? `${(item.size / 1024).toFixed(1)} KB` : ''}
                                    </span>
                                  </div>
                                  
                                  {/* Grid Actions */}
                                  {item.type === 'file' && !item.error && (
                                    <div className="mt-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); openFile(item.path, item.name); }}
                                        className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400"
                                        title="View"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); downloadFile(item.path); }}
                                        className="p-1 hover:bg-purple-500/20 rounded text-purple-400"
                                        title="Download"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); deleteItem(item.path); }}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* List View */
                                <div 
                                  key={idx}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-all group ${
                                    !item.error ? 'hover:bg-slate-800 cursor-pointer' : ''
                                  } ${item.name === '..' ? 'border-b border-slate-800/50 mb-2' : ''} ${
                                    item.error ? 'opacity-50' : ''
                                  }`}
                                >
                                  {item.type === 'directory' ? (
                                    <Folder className={`w-4 h-4 ${item.error ? 'text-red-400' : 'text-blue-400'}`} />
                                  ) : (
                                    <FileText className={`w-4 h-4 ${item.error ? 'text-red-400' : 'text-slate-400'}`} />
                                  )}
                                  <div 
                                    className="flex-1"
                                    onClick={() => {
                                      if (!item.error) {
                                        if (item.type === 'directory') {
                                          loadDirectory(item.path);
                                        } else {
                                          openFile(item.path, item.name);
                                        }
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-white text-sm">{item.name}</span>
                                      {item.error && (
                                        <span className="text-xs text-red-400 bg-red-500/10 px-1 rounded">!</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 space-y-1">
                                      {item.type === 'file' && !item.error && (
                                        <div>{(item.size / 1024).toFixed(1)} KB • {item.modified}</div>
                                      )}
                                      {item.permissions && (
                                        <div className="font-mono">{item.permissions}</div>
                                      )}
                                      {item.error && (
                                        <div className="text-red-400">{item.modified}</div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* List Actions */}
                                  {!item.error && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {item.type === 'file' && (
                                        <>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); openFile(item.path, item.name); }}
                                            className="p-1 hover:bg-emerald-500/20 rounded text-emerald-400"
                                            title="View File"
                                          >
                                            <Eye className="w-3 h-3" />
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); openWithSystem(item.path); }}
                                            className="p-1 hover:bg-blue-500/20 rounded text-blue-400"
                                            title="Open with System"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); downloadFile(item.path); }}
                                            className="p-1 hover:bg-purple-500/20 rounded text-purple-400"
                                            title="Download"
                                          >
                                            <Download className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); renameItem(item.path); }}
                                        className="p-1 hover:bg-yellow-500/20 rounded text-yellow-400"
                                        title="Rename"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); copyItem(item.path); }}
                                        className="p-1 hover:bg-green-500/20 rounded text-green-400"
                                        title="Copy"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); deleteItem(item.path); }}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  {item.type === 'directory' && !item.error && <ChevronRight className="text-slate-500 w-4 h-4" />}
                                </div>
                              )
                            ))}
                        </div>
                        
                        {directoryContents.length === 0 && (
                          <div className="text-center py-8 text-slate-500">
                            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No files or permission denied</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Hidden file input for uploads */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    multiple
                  />
                </div>
              )}

              {activeTab === 'processes' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <List className="text-emerald-400 w-5 h-5" />
                    <span className="text-emerald-500/50 text-sm">Process Manager</span>
                    <button 
                      onClick={loadProcesses}
                      className="ml-auto px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="text-left p-2">PID</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">CPU %</th>
                          <th className="text-left p-2">Memory %</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processes.map((proc, idx) => (
                          <tr key={idx} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                            <td className="p-2 font-mono">{proc.pid}</td>
                            <td className="p-2">{proc.name}</td>
                            <td className="p-2">{proc.cpu_percent?.toFixed(1) || '0.0'}</td>
                            <td className="p-2">{proc.memory_percent?.toFixed(1) || '0.0'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                proc.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                              }`}>
                                {proc.status}
                              </span>
                            </td>
                            <td className="p-2">
                              <button 
                                onClick={() => killProcess(proc.pid)}
                                className="p-1 hover:bg-rose-500/20 rounded text-rose-400"
                                title="Kill Process"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'monitor' && (
                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                  {/* Real-time Metrics Overview */}
                  <div className="grid grid-cols-4 gap-4">
                    {selectedDevice && devices[selectedDevice] && (
                      <>
                        <div className="bg-[#020617] rounded-xl border border-slate-800 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CpuIcon className="w-4 h-4 text-emerald-400" />
                            <span className="text-slate-400 text-sm">CPU</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{devices[selectedDevice].cpu_percent?.toFixed(1) || '0'}%</div>
                          <div className="text-xs text-slate-500">Usage</div>
                        </div>
                        
                        <div className="bg-[#020617] rounded-xl border border-slate-800 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-slate-400 text-sm">Memory</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{devices[selectedDevice].ram_percent?.toFixed(1) || '0'}%</div>
                          <div className="text-xs text-slate-500">Used</div>
                        </div>
                        
                        <div className="bg-[#020617] rounded-xl border border-slate-800 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="w-4 h-4 text-yellow-400" />
                            <span className="text-slate-400 text-sm">Disk</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{devices[selectedDevice].disk_percent?.toFixed(1) || '0'}%</div>
                          <div className="text-xs text-slate-500">Used</div>
                        </div>
                        
                        <div className="bg-[#020617] rounded-xl border border-slate-800 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-purple-400" />
                            <span className="text-slate-400 text-sm">Processes</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{devices[selectedDevice]?.process_count || processes.length || '0'}</div>
                          <div className="text-xs text-slate-500">Active</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* CPU & Memory Trends */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#020617] rounded-2xl border border-slate-800 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CpuIcon className="text-emerald-400 w-5 h-5" />
                        <span className="text-white font-medium">CPU Usage Trend</span>
                        <span className="text-slate-500 text-sm ml-auto">(Last 30 points)</span>
                      </div>
                      <div className="h-40 bg-slate-900/30 rounded-lg p-3 relative">
                        <svg width="100%" height="100%" className="absolute inset-3">
                          {cpuHistory.length > 1 && (
                            <>
                              {/* Grid lines */}
                              {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={`${100-y}%`} x2="100%" y2={`${100-y}%`} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                              ))}
                              
                              {/* CPU line */}
                              <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                points={cpuHistory.map((point, i) => 
                                  `${(i / (cpuHistory.length - 1)) * 100},${100 - point.value}`
                                ).join(' ')}
                              />
                              
                              {/* Data points */}
                              {cpuHistory.map((point, i) => (
                                <circle
                                  key={i}
                                  cx={`${(i / (cpuHistory.length - 1)) * 100}%`}
                                  cy={`${100 - point.value}%`}
                                  r="2"
                                  fill="#10b981"
                                />
                              ))}
                            </>
                          )}
                        </svg>
                        {/* Y-axis labels */}
                        <div className="absolute inset-y-0 -left-8 flex flex-col justify-between text-xs text-slate-400">
                          <span>100%</span>
                          <span>75%</span>
                          <span>50%</span>
                          <span>25%</span>
                          <span>0%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#020617] rounded-2xl border border-slate-800 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Activity className="text-blue-400 w-5 h-5" />
                        <span className="text-white font-medium">Memory Usage Trend</span>
                        <span className="text-slate-500 text-sm ml-auto">(Last 30 points)</span>
                      </div>
                      <div className="h-40 bg-slate-900/30 rounded-lg p-3 relative">
                        <svg width="100%" height="100%" className="absolute inset-3">
                          {memoryHistory.length > 1 && (
                            <>
                              {/* Grid lines */}
                              {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={`${100-y}%`} x2="100%" y2={`${100-y}%`} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                              ))}
                              
                              {/* Memory line */}
                              <polyline
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                points={memoryHistory.map((point, i) => 
                                  `${(i / (memoryHistory.length - 1)) * 100},${100 - point.value}`
                                ).join(' ')}
                              />
                              
                              {/* Data points */}
                              {memoryHistory.map((point, i) => (
                                <circle
                                  key={i}
                                  cx={`${(i / (memoryHistory.length - 1)) * 100}%`}
                                  cy={`${100 - point.value}%`}
                                  r="2"
                                  fill="#3b82f6"
                                />
                              ))}
                            </>
                          )}
                        </svg>
                        {/* Y-axis labels */}
                        <div className="absolute inset-y-0 -left-8 flex flex-col justify-between text-xs text-slate-400">
                          <span>100%</span>
                          <span>75%</span>
                          <span>50%</span>
                          <span>25%</span>
                          <span>0%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Network Activity & Process Count */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-[#020617] rounded-2xl border border-slate-800 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Wifi className="text-purple-400 w-5 h-5" />
                        <span className="text-white font-medium">Network Activity</span>
                        <span className="text-slate-500 text-sm ml-auto">RX/TX Bytes</span>
                      </div>
                      <div className="h-40 bg-slate-900/30 rounded-lg p-3 relative">
                        <svg width="100%" height="100%" className="absolute inset-3">
                          {networkHistory.length > 1 && (
                            <>
                              {/* Grid lines */}
                              {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={`${100-y}%`} x2="100%" y2={`${100-y}%`} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                              ))}
                              
                              {/* RX line */}
                              <polyline
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="2"
                                points={networkHistory.map((point, i) => {
                                  const maxRate = Math.max(...networkHistory.map(p => Math.max(p.rx || 0, p.tx || 0)), 1024); // at least 1KB
                                  const normalizedRx = ((point.rx || 0) / maxRate) * 100;
                                  return `${(i / (networkHistory.length - 1)) * 100},${100 - normalizedRx}`;
                                }).join(' ')}
                              />
                              
                              {/* TX line */}
                              <polyline
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                points={networkHistory.map((point, i) => {
                                  const maxRate = Math.max(...networkHistory.map(p => Math.max(p.rx || 0, p.tx || 0)), 1024);
                                  const normalizedTx = ((point.tx || 0) / maxRate) * 100;
                                  return `${(i / (networkHistory.length - 1)) * 100},${100 - normalizedTx}`;
                                }).join(' ')}
                              />
                            </>
                          )}
                          {networkHistory.length <= 1 && (
                            <text x="50%" y="50%" textAnchor="middle" fill="#64748b" fontSize="12">
                              Collecting network data...
                            </text>
                          )}
                        </svg>
                        <div className="absolute bottom-2 right-2 flex gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            <span className="text-slate-400">RX</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-slate-400">TX</span>
                          </div>
                        </div>
                        {/* Current rate display */}
                        {networkHistory.length > 0 && (
                          <div className="absolute top-2 left-2 text-xs text-slate-400">
                            <div>RX: {formatBytes(networkHistory[networkHistory.length - 1]?.rx || 0)}/s</div>
                            <div>TX: {formatBytes(networkHistory[networkHistory.length - 1]?.tx || 0)}/s</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-[#020617] rounded-2xl border border-slate-800 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Server className="text-green-400 w-5 h-5" />
                        <span className="text-white font-medium">Process Count</span>
                        <span className="text-slate-500 text-sm ml-auto">Active Processes</span>
                      </div>
                      <div className="h-40 bg-slate-900/30 rounded-lg p-3 relative">
                        <svg width="100%" height="100%" className="absolute inset-3">
                          {processCountHistory.length > 1 && (
                            <>
                              {/* Grid lines */}
                              {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={`${100-y}%`} x2="100%" y2={`${100-y}%`} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                              ))}
                              
                              {/* Process count line */}
                              <polyline
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="2"
                                points={processCountHistory.map((point, i) => {
                                  const maxCount = Math.max(...processCountHistory.map(p => p.value), 100);
                                  const minCount = Math.min(...processCountHistory.map(p => p.value));
                                  const range = Math.max(maxCount - minCount, 10); // Minimum range of 10
                                  const normalized = ((point.value - minCount) / range) * 100;
                                  return `${(i / (processCountHistory.length - 1)) * 100},${100 - normalized}`;
                                }).join(' ')}
                              />
                              
                              {/* Data points */}
                              {processCountHistory.map((point, i) => {
                                const maxCount = Math.max(...processCountHistory.map(p => p.value), 100);
                                const minCount = Math.min(...processCountHistory.map(p => p.value));
                                const range = Math.max(maxCount - minCount, 10);
                                const normalized = ((point.value - minCount) / range) * 100;
                                return (
                                  <circle
                                    key={i}
                                    cx={`${(i / (processCountHistory.length - 1)) * 100}%`}
                                    cy={`${100 - normalized}%`}
                                    r="2"
                                    fill="#22c55e"
                                  />
                                );
                              })}
                            </>
                          )}
                          {processCountHistory.length <= 1 && (
                            <text x="50%" y="50%" textAnchor="middle" fill="#64748b" fontSize="12">
                              Collecting process data...
                            </text>
                          )}
                        </svg>
                        {/* Current count display */}
                        {processCountHistory.length > 0 && (
                          <div className="absolute top-2 left-2 text-xs text-slate-400">
                            Current: {processCountHistory[processCountHistory.length - 1]?.value || 0} processes
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* System Load Distribution */}
                  <div className="bg-[#020617] rounded-2xl border border-slate-800 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <BarChart3 className="text-emerald-400 w-5 h-5" />
                      <span className="text-white font-medium">System Load Distribution</span>
                    </div>
                    
                    {selectedDevice && devices[selectedDevice] && (
                      <div className="grid grid-cols-3 gap-6">
                        {/* CPU Load Gauge */}
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#334155"
                                strokeWidth="8"
                                fill="none"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#10b981"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${(devices[selectedDevice].cpu_percent * 3.52)} 400`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-xl font-bold text-white">{devices[selectedDevice].cpu_percent?.toFixed(0)}%</div>
                                <div className="text-xs text-slate-400">CPU</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Memory Load Gauge */}
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#334155"
                                strokeWidth="8"
                                fill="none"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#3b82f6"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${(devices[selectedDevice].ram_percent * 3.52)} 400`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-xl font-bold text-white">{devices[selectedDevice].ram_percent?.toFixed(0)}%</div>
                                <div className="text-xs text-slate-400">RAM</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Disk Load Gauge */}
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#334155"
                                strokeWidth="8"
                                fill="none"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="#f59e0b"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${((devices[selectedDevice].disk_percent || 0) * 3.52)} 400`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-xl font-bold text-white">{devices[selectedDevice].disk_percent?.toFixed(0) || '0'}%</div>
                                <div className="text-xs text-slate-400">Disk</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'info' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4 mb-6">
                    <Info className="text-emerald-400 w-5 h-5" />
                    <span className="text-emerald-500/50 text-sm">System Information</span>
                    <button 
                      onClick={loadSystemInfo}
                      className="ml-auto px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  <div className="space-y-6 text-sm">
                    {Object.entries(systemInfo).map(([key, value]) => (
                      <div key={key} className="border-b border-slate-800/30 pb-3">
                        <div className="text-slate-400 mb-1 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-white font-mono text-xs">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remote Desktop Tab */}
              {activeTab === 'desktop' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col space-y-4 mb-6">
                    {/* Header and Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Monitor className="text-emerald-400 w-5 h-5" />
                        <span className="text-emerald-500/50 text-sm">Remote Desktop Live Preview</span>
                        {isLiveStreaming && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400 text-xs">Live Streaming</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={captureScreenshot}
                          disabled={isCapturingScreen}
                          className={`px-3 py-1 rounded text-xs transition-all ${
                            isCapturingScreen 
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >
                          {isCapturingScreen ? 'Capturing...' : 'Screenshot'}
                        </button>
                        <button 
                          onClick={toggleLivePreview}
                          className={`px-3 py-1 rounded text-xs transition-all ${
                            isLiveStreaming 
                              ? 'bg-red-600 hover:bg-red-500 text-white' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isLiveStreaming ? 'Stop Live' : 'Start Live'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Settings Controls */}
                    <div className="flex items-center gap-6 p-3 bg-slate-900/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <label className="text-slate-400 text-sm">Stream Interval:</label>
                        <select 
                          value={streamInterval}
                          onChange={(e) => setStreamInterval(Number(e.target.value))}
                          className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-1 text-xs"
                          disabled={isLiveStreaming}
                        >
                          <option value={0.5}>0.5 seconds</option>
                          <option value={1}>1 second</option>
                          <option value={2}>2 seconds</option>
                          <option value={3}>3 seconds</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-slate-400 text-sm">Quality:</label>
                        <select 
                          value={streamQuality}
                          onChange={(e) => setStreamQuality(e.target.value)}
                          className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-1 text-xs"
                        >
                          <option value="low">Low (Fast)</option>
                          <option value="medium">Medium (Balanced)</option>
                          <option value="high">High (Quality)</option>
                        </select>
                      </div>
                      
                      {lastFrameTime && (
                        <div className="text-slate-400 text-xs">
                          Last frame: {lastFrameTime.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Live Preview Display */}
                  {livePreview && livePreview.image && !livePreview.error ? (
                    <div className="space-y-4">
                      {/* Live Stream Image with Enhanced Display */}
                      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700">
                          <div className="flex items-center gap-3">
                            <Monitor className="w-4 h-4 text-emerald-400" />
                            <span className="text-white text-sm font-medium">Live Desktop View</span>
                            <span className="text-slate-400 text-xs">{livePreview.width}×{livePreview.height}</span>
                            {isLiveStreaming && (
                              <span className="flex items-center gap-1 text-green-400 text-xs">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                Streaming
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Fullscreen toggle functionality
                                const img = document.getElementById('live-preview');
                                if (img && img.requestFullscreen) {
                                  img.requestFullscreen();
                                }
                              }}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="relative group cursor-pointer">
                            <img 
                              id="live-preview"
                              src={livePreview?.image ? `data:image/png;base64,${livePreview.image}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzNzQxNTEiLz48L3N2Zz4='} 
                              alt="Live Desktop Preview"
                              className="max-w-full h-auto rounded border border-slate-600 transition-transform hover:scale-105"
                              style={{ maxHeight: '70vh' }}
                              onError={(e) => {
                                console.error('Image load error:', e);
                                // Fallback to a placeholder
                                e.target.style.display = 'none';
                              }}
                            />
                            
                            {/* Overlay with info on hover */}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-3 py-2 rounded text-sm">
                                {isLiveStreaming ? 'Live streaming - Click for fullscreen' : 'Click to view fullscreen'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Live Preview Information */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Resolution</div>
                          <div className="text-white text-sm font-medium">{livePreview.width} × {livePreview.height}</div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Format</div>
                          <div className="text-white text-sm font-medium">{livePreview.format || 'PNG'}</div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Quality</div>
                          <div className="text-white text-sm font-medium capitalize">{streamQuality}</div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">Live Stream</div>
                          <div className={`text-sm font-medium ${
                            isLiveStreaming ? 'text-green-400' : 'text-slate-400'
                          }`}>
                            {isLiveStreaming ? `Every ${streamInterval}s` : 'Stopped'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2 justify-center pt-4">
                        <button 
                          onClick={() => {
                            if (livePreview?.image) {
                              const link = document.createElement('a');
                              link.href = `data:image/png;base64,${livePreview.image}`;
                              link.download = `desktop-preview-${new Date().toISOString().slice(0, 19)}.png`;
                              link.click();
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Frame
                        </button>
                        
                        <button 
                          onClick={captureScreenshot}
                          disabled={isCapturingScreen}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                            isCapturingScreen 
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >
                          <RefreshCw className={`w-4 h-4 ${isCapturingScreen ? 'animate-spin' : ''}`} />
                          Screenshot
                        </button>
                        
                        <button 
                          onClick={toggleLivePreview}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                            isLiveStreaming 
                              ? 'bg-red-600 hover:bg-red-500 text-white' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isLiveStreaming ? <X className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {isLiveStreaming ? 'Stop Live' : 'Start Live'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                      <div className="relative mb-6">
                        <Monitor className="w-24 h-24 opacity-50" />
                        {isCapturingScreen && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {isLiveStreaming && !livePreview && (
                          <div className="absolute -top-2 -right-2">
                            <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        {isCapturingScreen ? 'Capturing screenshot...' : 
                         isLiveStreaming ? 'Starting live stream...' : 'Remote Desktop Live Preview'}
                      </h3>
                      <p className="text-center max-w-md mb-6">
                        {isCapturingScreen ? 'Please wait while we capture the remote desktop...' : 
                         isLiveStreaming ? 'Connecting to live stream...' :
                         'Start live streaming for real-time desktop viewing, or capture a single screenshot.'}
                      </p>
                      {!isCapturingScreen && !isLiveStreaming && (
                        <div className="flex gap-2">
                          <button 
                            onClick={startLivePreview}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Start Live Preview
                          </button>
                          <button 
                            onClick={captureScreenshot}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            Take Screenshot
                          </button>
                        </div>
                      )}
                      {isLiveStreaming && (
                        <button 
                          onClick={stopLivePreview}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Stop Live Preview
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Control Tab */}
              {activeTab === 'audio' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Volume2 className="text-emerald-400 w-5 h-5" />
                      <span className="text-emerald-500/50 text-sm">Audio Control</span>
                    </div>
                    <button 
                      onClick={() => sendRequest("get_audio_info")}
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-white font-semibold mb-3">Volume Control</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Volume2 className="w-4 h-4 text-slate-400" />
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={audioInfo.volume}
                            onChange={(e) => {
                              const volume = parseInt(e.target.value);
                              setAudioInfo(prev => ({ ...prev, volume }));
                              sendRequest("set_volume", { volume });
                            }}
                            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-white font-mono text-sm w-12">{audioInfo.volume}%</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Status: {audioInfo.muted ? "Muted" : "Active"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-white font-semibold mb-3">Audio Devices</h4>
                      <div className="space-y-2">
                        {audioInfo.devices.map((device, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-slate-300">{device}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Power Management Tab */}
              {activeTab === 'power' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4 mb-6">
                    <Power className="text-red-400 w-5 h-5" />
                    <span className="text-red-500/50 text-sm">Power Management</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => sendRequest("power_operation", { operation: "shutdown" })}
                      className="p-4 bg-red-900 border border-red-700 rounded-lg text-white hover:bg-red-800 transition-colors"
                    >
                      <Power className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-semibold">Shutdown</div>
                      <div className="text-xs opacity-70">Power off the system</div>
                    </button>
                    
                    <button 
                      onClick={() => sendRequest("power_operation", { operation: "restart" })}
                      className="p-4 bg-orange-900 border border-orange-700 rounded-lg text-white hover:bg-orange-800 transition-colors"
                    >
                      <RefreshCw className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-semibold">Restart</div>
                      <div className="text-xs opacity-70">Reboot the system</div>
                    </button>
                    
                    <button 
                      onClick={() => sendRequest("power_operation", { operation: "sleep" })}
                      className="p-4 bg-blue-900 border border-blue-700 rounded-lg text-white hover:bg-blue-800 transition-colors"
                    >
                      <Monitor className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-semibold">Sleep</div>
                      <div className="text-xs opacity-70">Put system to sleep</div>
                    </button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-red-950/30 border border-red-800/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="text-red-400 font-semibold mb-1">Warning</div>
                        <div className="text-red-300/70">
                          Power operations will immediately affect the remote system. 
                          Make sure all important work is saved before proceeding.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Network Monitor Tab */}
              {activeTab === 'network' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Wifi className="text-emerald-400 w-5 h-5" />
                      <span className="text-emerald-500/50 text-sm">Network Monitoring</span>
                    </div>
                    <button 
                      onClick={() => sendRequest("get_network_info")}
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  {networkInfo ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-white font-semibold mb-2">Data Sent</h4>
                          <div className="text-emerald-400 font-mono">{(networkInfo.total_sent / (1024*1024)).toFixed(2)} MB</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-white font-semibold mb-2">Data Received</h4>
                          <div className="text-emerald-400 font-mono">{(networkInfo.total_recv / (1024*1024)).toFixed(2)} MB</div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-white font-semibold mb-3">Network Interfaces</h4>
                        <div className="space-y-3">
                          {networkInfo.interfaces?.map((iface, idx) => (
                            <div key={idx} className="border-l-2 border-emerald-500 pl-3">
                              <div className="text-emerald-400 font-semibold">{iface.name}</div>
                              {iface.addresses.map((addr, addrIdx) => (
                                <div key={addrIdx} className="text-sm text-slate-300 ml-2">
                                  {addr.family}: {addr.address}
                                  {addr.netmask && ` / ${addr.netmask}`}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-white font-semibold mb-3">Active Connections</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {networkInfo.connections?.map((conn, idx) => (
                            <div key={idx} className="text-xs font-mono text-slate-300 border-b border-slate-800 pb-1">
                              {conn.local} → {conn.remote} ({conn.status})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Wifi className="w-16 h-16 mb-4 opacity-50" />
                      <p>Click "Refresh" to load network information</p>
                    </div>
                  )}
                </div>
              )}

              {/* Services Tab */}
              {activeTab === 'services' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Settings className="text-emerald-400 w-5 h-5" />
                      <span className="text-emerald-500/50 text-sm">Service Management</span>
                    </div>
                    <button 
                      onClick={() => sendRequest("get_services")}
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      Refresh Services
                    </button>
                  </div>
                  
                  {services.length > 0 ? (
                    <div className="space-y-2">
                      {services.map((service, idx) => (
                        <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              service.status?.includes('RUNNING') || service.status?.includes('active') ? 'bg-emerald-500' : 
                              service.status?.includes('STOPPED') || service.status?.includes('inactive') ? 'bg-red-500' : 
                              'bg-yellow-500'
                            }`}></div>
                            <div>
                              <div className="text-white font-semibold text-sm">{service.name}</div>
                              <div className="text-slate-400 text-xs">{service.display_name || service.name}</div>
                            </div>
                          </div>
                          <div className="text-xs font-mono">
                            <span className={`px-2 py-1 rounded ${
                              service.status?.includes('RUNNING') || service.status?.includes('active') ? 'bg-emerald-500/20 text-emerald-400' : 
                              service.status?.includes('STOPPED') || service.status?.includes('inactive') ? 'bg-red-500/20 text-red-400' : 
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {service.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Settings className="w-16 h-16 mb-4 opacity-50" />
                      <p>Click "Refresh Services" to load system services</p>
                    </div>
                  )}
                </div>
              )}

              {/* Environment Variables Tab */}
              {activeTab === 'env' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <Database className="text-emerald-400 w-5 h-5" />
                      <span className="text-emerald-500/50 text-sm">Environment Variables</span>
                    </div>
                    <button 
                      onClick={() => sendRequest("get_environment_variables")}
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  {environmentVars.length > 0 ? (
                    <div className="space-y-2">
                      {environmentVars.map((envVar, idx) => (
                        <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${envVar.priority === 0 ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                              <span className="text-emerald-400 font-mono text-sm">{envVar.name}</span>
                            </div>
                          </div>
                          <div className="text-slate-300 text-xs font-mono mt-2 pl-4 border-l-2 border-slate-700">
                            {envVar.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Database className="w-16 h-16 mb-4 opacity-50" />
                      <p>Click "Refresh" to load environment variables</p>
                    </div>
                  )}
                </div>
              )}

              {/* System Logs Tab */}
              {activeTab === 'logs' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <FileText className="text-emerald-400 w-5 h-5" />
                      <span className="text-emerald-500/50 text-sm">System Logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={logType}
                        onChange={(e) => setLogType(e.target.value)}
                        className="px-2 py-1 bg-slate-800 text-white rounded text-xs"
                      >
                        <option value="system">System</option>
                        <option value="application">Application</option>
                        <option value="auth">Authentication</option>
                      </select>
                      <button 
                        onClick={() => sendRequest("get_system_logs", { log_type: logType, lines: 50 })}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-xs"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  {systemLogs.length > 0 ? (
                    <div className="space-y-1 font-mono text-xs">
                      {systemLogs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded border-l-2 border-slate-700">
                          <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            log.level === 'ERROR' ? 'bg-red-500' : 
                            log.level === 'WARNING' ? 'bg-yellow-500' : 
                            'bg-emerald-500'
                          }`}></div>
                          <div className="flex-1">
                            {log.timestamp && (
                              <span className="text-slate-500 mr-2">{log.timestamp}</span>
                            )}
                            {log.source && (
                              <span className="text-emerald-400 mr-2">[{log.source}]</span>
                            )}
                            <span className="text-slate-300">{log.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <FileText className="w-16 h-16 mb-4 opacity-50" />
                      <p>Click "Refresh" to load system logs</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Assistant Tab */}
              {activeTab === 'ai' && (
                <div className="flex-1 bg-[#020617] rounded-2xl border border-slate-800 p-6 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4 mb-6">
                    <Zap className="text-emerald-400 w-5 h-5" />
                    <span className="text-emerald-500/50 text-sm">AI System Assistant</span>
                    <div className="ml-auto px-2 py-1 bg-emerald-900 text-emerald-400 rounded text-xs">
                      Powered by Omni AI
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* AI Query Section */}
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        Ask AI Assistant
                      </h4>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <select 
                            value={aiAnalysisType}
                            onChange={(e) => setAiAnalysisType(e.target.value)}
                            className="px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-600"
                          >
                            <option value="general">General Analysis</option>
                            <option value="troubleshooting">Troubleshooting</option>
                            <option value="optimization">Optimization</option>
                            <option value="security">Security Review</option>
                            <option value="commands">Command Generation</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && askAI()}
                            placeholder="Ask anything about your system... (e.g., 'analyze performance', 'find large files', 'security issues')"
                            className="flex-1 bg-slate-800 text-white p-3 rounded border border-slate-600 focus:border-emerald-500 outline-none"
                          />
                          <button
                            onClick={askAI}
                            disabled={aiLoading || !aiQuery.trim()}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {aiLoading ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            {aiLoading ? 'Analyzing...' : 'Ask AI'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={runSecurityAnalysis}
                        disabled={aiLoading}
                        className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-white hover:bg-red-900/50 transition-colors disabled:opacity-50"
                      >
                        <Shield className="w-6 h-6 mx-auto mb-2 text-red-400" />
                        <div className="font-semibold">Security Scan</div>
                        <div className="text-xs opacity-70">AI security analysis</div>
                      </button>
                      
                      <button
                        onClick={runPerformanceAnalysis}
                        disabled={aiLoading}
                        className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg text-white hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                      >
                        <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                        <div className="font-semibold">Performance</div>
                        <div className="text-xs opacity-70">Optimization tips</div>
                      </button>
                      
                      <button
                        onClick={() => sendRequest("get_system_context")}
                        disabled={aiLoading}
                        className="p-4 bg-emerald-900/30 border border-emerald-700/50 rounded-lg text-white hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                      >
                        <Info className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                        <div className="font-semibold">System Context</div>
                        <div className="text-xs opacity-70">Gather system data</div>
                      </button>
                    </div>

                    {/* AI Response */}
                    {aiResponse && (
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          AI Analysis Result
                        </h4>
                        {renderAIResponse(aiResponse.response || aiResponse.error)}
                        {aiResponse.suggested_commands && aiResponse.suggested_commands.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-white font-semibold mb-2">Suggested Commands:</h5>
                            <div className="space-y-2">
                              {aiResponse.suggested_commands.map((cmd, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-800 p-2 rounded">
                                  <code className="flex-1 text-emerald-400 text-sm">{cmd}</code>
                                  <button
                                    onClick={() => executeAISuggestedCommand(cmd)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                                  >
                                    Execute
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Security Report */}
                    {securityReport && (
                      <div className="bg-slate-900 rounded-lg p-4 border border-red-700/50">
                        <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Security Analysis Report
                        </h4>
                        <div className="text-slate-300 text-sm whitespace-pre-wrap">
                          {securityReport.security_report || securityReport.error}
                        </div>
                        {securityReport.processes_analyzed && (
                          <div className="mt-3 text-xs text-slate-400">
                            Analyzed: {securityReport.processes_analyzed} processes, {securityReport.connections_analyzed} connections
                          </div>
                        )}
                      </div>
                    )}

                    {/* Performance Report */}
                    {performanceReport && (
                      <div className="bg-slate-900 rounded-lg p-4 border border-blue-700/50">
                        <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Performance Optimization Report
                        </h4>
                        <div className="text-slate-300 text-sm whitespace-pre-wrap mb-4">
                          {performanceReport.optimization_report || performanceReport.error}
                        </div>
                        {performanceReport.current_performance && (
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-emerald-400">{performanceReport.current_performance.cpu}%</div>
                              <div className="text-xs text-slate-400">CPU Usage</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-400">{performanceReport.current_performance.memory}%</div>
                              <div className="text-xs text-slate-400">Memory Usage</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-400">{performanceReport.current_performance.disk.toFixed(1)}%</div>
                              <div className="text-xs text-slate-400">Disk Usage</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* System Context Display */}
                    {systemContext && (
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          System Context Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-400">{systemContext.system_stats?.cpu_percent}%</div>
                            <div className="text-slate-400">CPU</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-400">{systemContext.system_stats?.ram_percent}%</div>
                            <div className="text-slate-400">RAM</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400">{systemContext.processes?.processes?.length}</div>
                            <div className="text-slate-400">Processes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-400">{systemContext.network?.interfaces?.length}</div>
                            <div className="text-slate-400">Interfaces</div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-slate-400">
                          Platform: {systemContext.platform} | Host: {systemContext.hostname} | Working Dir: {systemContext.working_directory}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Welcome Dashboard - shown when no device is selected
            <div className="flex-1 flex flex-row gap-8 overflow-y-auto custom-scrollbar">
              
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col">
                {/* Hero Section */}
                <div className="relative bg-gradient-to-br from-slate-900/50 via-emerald-950/20 to-blue-950/20 rounded-2xl border border-slate-800 p-8 mb-6 w-full">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent rounded-2xl"></div>
                <div className="relative z-10 text-center w-full">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-emerald-500/30">
                        <Server className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl blur opacity-50 animate-pulse"></div>
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-200 to-blue-200 bg-clip-text text-transparent mb-3">
                    OmniControl Dashboard
                  </h1>
                  <p className="text-slate-400 max-w-2xl mx-auto">
                    Advanced remote system administration and monitoring platform. Select a device from the left panel to begin remote operations.
                  </p>
                </div>
              </div>

              {/* Quick Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6 w-full">
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Connected Devices</div>
                      <div className="text-slate-400 text-sm">Active nodes</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{Object.keys(devices).length}</div>
                </div>

                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Session Status</div>
                      <div className="text-slate-400 text-sm">Connection state</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                    <span className={`font-semibold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isConnected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Command className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Commands</div>
                      <div className="text-slate-400 text-sm">Executed today</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{terminalOutput.filter(o => o.type === 'input').length}</div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mb-6 w-full">
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    Available Features
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Remote Terminal', desc: 'Execute shell commands remotely', icon: Terminal },
                      { name: 'File Management', desc: 'Browse and manage files', icon: FolderOpen },
                      { name: 'Process Monitor', desc: 'View and manage processes', icon: Activity },
                      { name: 'System Monitoring', desc: 'Real-time system metrics', icon: BarChart3 },
                      { name: 'Remote Desktop', desc: 'View screen remotely', icon: Monitor },
                      { name: 'AI Assistant', desc: 'Intelligent system analysis', icon: Zap }
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <feature.icon className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-white text-sm font-medium">{feature.name}</div>
                          <div className="text-slate-500 text-xs">{feature.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-400" />
                    Getting Started
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">1</div>
                      <div>
                        <div className="text-white text-sm font-medium">Connect Device</div>
                        <div className="text-slate-500 text-xs">Select an available device from the sidebar</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">2</div>
                      <div>
                        <div className="text-white text-sm font-medium">Choose Feature</div>
                        <div className="text-slate-500 text-xs">Select a tab to access different tools</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">3</div>
                      <div>
                        <div className="text-white text-sm font-medium">Start Managing</div>
                        <div className="text-slate-500 text-xs">Control your systems remotely</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    System Overview
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Total Devices</span>
                      <span className="text-emerald-400 font-semibold">{Object.keys(devices).length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Active Sessions</span>
                      <span className="text-blue-400 font-semibold">{Object.keys(devices).filter(d => devices[d]).length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Commands Executed</span>
                      <span className="text-purple-400 font-semibold">{terminalOutput.filter(o => o.type === 'input').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Uptime</span>
                      <span className="text-orange-400 font-semibold">Connected</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity or Device List */}
              {Object.keys(devices).length > 0 && (
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6 w-full">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-400" />
                    Available Devices
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full">
                    {Object.entries(devices).map(([deviceId, device]) => (
                      <div 
                        key={deviceId}
                        onClick={() => setSelectedDevice(deviceId)}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                            <Server className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{deviceId}</div>
                            <div className="text-emerald-400 text-xs">Online</div>
                          </div>
                        </div>
                        <div className="text-slate-400 text-xs">
                          {device.platform || 'System ready'}
                        </div>
                        {device.cpu_percent && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-slate-500">CPU:</span>
                            <span className="text-emerald-400">{device.cpu_percent.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto pt-6 border-t border-slate-800/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>OmniControl v1.0.4 • Advanced Remote Administration</div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span>System Online</span>
                  </div>
                </div>
              </div>
              </div>

              {/* Live System Info - Visible in both fullscreen and normal view */}
              <div className="w-96 flex flex-col gap-4">
                
                {/* Device Performance Metrics */}
                {selectedDevice && devices[selectedDevice] ? (
                  <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-400" />
                      {selectedDevice} Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${devices[selectedDevice].cpu_percent > 80 ? 'bg-red-400' : devices[selectedDevice].cpu_percent > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                          <span className="text-slate-300 text-sm">CPU Usage</span>
                        </div>
                        <span className={`text-xs font-medium ${devices[selectedDevice].cpu_percent > 80 ? 'text-red-400' : devices[selectedDevice].cpu_percent > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {devices[selectedDevice].cpu_percent ? `${devices[selectedDevice].cpu_percent.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${devices[selectedDevice].ram_percent > 80 ? 'bg-red-400' : devices[selectedDevice].ram_percent > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                          <span className="text-slate-300 text-sm">Memory</span>
                        </div>
                        <span className={`text-xs font-medium ${devices[selectedDevice].ram_percent > 80 ? 'text-red-400' : devices[selectedDevice].ram_percent > 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {devices[selectedDevice].ram_percent ? `${devices[selectedDevice].ram_percent.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-slate-300 text-sm">Platform</span>
                        </div>
                        <span className="text-green-400 text-xs font-medium">
                          {devices[selectedDevice].platform || 'Unknown'}
                        </span>
                      </div>
                      
                      {devices[selectedDevice].hostname && (
                        <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-slate-300 text-sm">Hostname</span>
                          </div>
                          <span className="text-blue-400 text-xs font-medium">
                            {devices[selectedDevice].hostname}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Quick Tips
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div className="p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                          <span className="text-emerald-400 font-medium">Keyboard Shortcuts</span>
                        </div>
                        <div className="text-slate-400">Ctrl+` = Terminal • Ctrl+L = Terminal • Ctrl+F = Files • Ctrl+M = Monitor</div>
                      </div>
                      
                      <div className="p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                          <span className="text-blue-400 font-medium">Navigation</span>
                        </div>
                        <div className="text-slate-400">Ctrl+H = Home • Double-click = Open folders</div>
                      </div>
                      
                      <div className="p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                          <span className="text-purple-400 font-medium">AI Assistant</span>
                        </div>
                        <div className="text-slate-400">Ask questions about system performance</div>
                      </div>
                      
                      <div className="p-2 bg-slate-800/20 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                          <span className="text-cyan-400 font-medium">Auto-Refresh</span>
                        </div>
                        <div className="text-slate-400">Charts update every 5 seconds automatically</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real Terminal Activity */}
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    Recent Commands
                  </h3>
                  <div className="space-y-2 text-xs">
                    {terminalOutput.filter(output => output.type === 'input').slice(-4).map((cmd, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/20 rounded">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                        <span className="text-slate-300 flex-1 font-mono truncate">{cmd.text}</span>
                        <span className="text-slate-500">recent</span>
                      </div>
                    )).reverse()}
                    {terminalOutput.filter(output => output.type === 'input').length === 0 && (
                      <div className="text-center py-4">
                        <div className="text-slate-400 text-sm">No commands yet</div>
                        <div className="text-slate-500 text-xs mt-1">Terminal history will appear here</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Status */}
                <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-emerald-400" />
                    Connection Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${socket?.readyState === WebSocket.OPEN ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-slate-300 text-sm">WebSocket</span>
                      </div>
                      <span className={`text-xs font-medium ${socket?.readyState === WebSocket.OPEN ? 'text-green-400' : 'text-red-400'}`}>
                        {socket?.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-slate-300 text-sm">Devices</span>
                      </div>
                      <span className="text-blue-400 text-xs font-medium">{Object.keys(devices).length} Online</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-slate-800/20 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-slate-300 text-sm">Commands</span>
                      </div>
                      <span className="text-purple-400 text-xs font-medium">{terminalOutput.filter(o => o.type === 'input').length} Executed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Command Input Area - Only show for terminal tab */}
        {selectedDevice && activeTab === 'terminal' && (
          <div className="p-8 bg-[#0f172a] border-t border-slate-800/50">
            <form onSubmit={sendCommand} className="relative max-w-5xl mx-auto group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <span className="text-emerald-500 font-black text-lg select-none group-focus-within:scale-125 transition-transform italic">λ</span>
              </div>
              <input
                id="terminal-input"
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                disabled={!selectedDevice}
                placeholder={selectedDevice ? `Send command to ${selectedDevice}...` : "Remote input disabled"}
                className="w-full bg-[#1e293b]/50 text-white py-5 pl-14 pr-32 rounded-2xl border-2 border-slate-800 focus:border-emerald-500/50 focus:bg-[#1e293b] outline-none transition-all duration-300 font-mono text-sm placeholder:text-slate-600 disabled:opacity-30 shadow-xl"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-bold uppercase mr-2 hidden md:block">Press Enter</span>
                <button 
                    type="submit"
                    disabled={!selectedDevice || !commandInput}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:opacity-0 disabled:pointer-events-none shadow-lg shadow-emerald-900/20"
                >
                    Execute
                </button>
              </div>
            </form>
            
            {/* Command History */}
            {commandHistory.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 mr-2">Recent:</span>
                {commandHistory.slice(0, 5).map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCommandInput(cmd)}
                    className="px-2 py-1 bg-slate-800/50 text-slate-400 rounded text-xs hover:bg-slate-700 transition-all"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-center gap-6 text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
              <span>Secure Tunnel: AES-256</span>
              <span>•</span>
              <span>Latency: {isMock ? '< 1ms' : 'Calculating...'}</span>
              <span>•</span>
              <span>Buffer: Clear</span>
            </div>
          </div>
        )}
      </div>
      
      {/* File Viewer Modal */}
      {fileViewerOpen && fileContent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {fileContent.type === 'text' && <FileText className="text-emerald-400 w-5 h-5" />}
                {fileContent.type === 'image' && <Image className="text-blue-400 w-5 h-5" />}
                {fileContent.type === 'binary' && <FileText className="text-slate-400 w-5 h-5" />}
                <div>
                  <h3 className="text-white font-bold">File Viewer</h3>
                  <p className="text-slate-400 text-sm">
                    {fileContent.type} • {(fileContent.size / 1024).toFixed(1)} KB
                    {fileContent.extension && ` • ${fileContent.extension}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setFileViewerOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {fileContent.error ? (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-2">Error</div>
                  <div className="text-slate-500">{fileContent.error}</div>
                </div>
              ) : fileContent.type === 'text' ? (
                <pre className="bg-[#020617] p-4 rounded-lg text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-auto">
                  {fileContent.content}
                </pre>
              ) : fileContent.type === 'image' ? (
                <div className="text-center">
                  <img 
                    src={`data:${fileContent.mime_type};base64,${fileContent.content}`}
                    alt="File preview"
                    className="max-w-full max-h-[400px] mx-auto rounded-lg border border-slate-700"
                  />
                </div>
              ) : fileContent.type === 'binary' ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                  <div className="text-slate-400 mb-2">Binary File</div>
                  <div className="text-slate-500 text-sm">{fileContent.info}</div>
                  <div className="mt-4 space-x-2">
                    <button 
                      onClick={() => { openWithSystem(currentPath); setFileViewerOpen(false); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                    >
                      Open with System
                    </button>
                    <button 
                      onClick={() => { downloadFile(currentPath); setFileViewerOpen(false); }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      
      {/* Create New Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-white font-bold">Create New {createType}</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-slate-400 text-sm mb-2">
                  {createType === "file" ? "File" : "Folder"} Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createNewItem()}
                  placeholder={`Enter ${createType} name...`}
                  className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:border-emerald-500 outline-none"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewItem}
                  disabled={!createName.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}