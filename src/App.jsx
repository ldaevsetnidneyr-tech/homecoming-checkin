import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QrCode, 
  Camera, 
  Users, 
  UserCheck, 
  UserPlus, 
  BarChart3, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  XCircle, 
  Sparkles,
  Award,
  Volume2,
  VolumeX,
  FlipHorizontal
} from 'lucide-react';

// 預設校友回家日名單資料
const INITIAL_GUESTS = [
  { id: 'ALUM-2015-01', name: '陳家豪 (Chan Ka Ho)', type: 'RSVP', year: '2015', role: '校友', email: 'kahoc@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2018-02', name: '李詠琪 (Lee Wing Ki)', type: 'RSVP', year: '2018', role: '校友', email: 'wingki.lee@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2020-03', name: '張偉諾 (Cheung Wai Nok)', type: 'RSVP', year: '2020', role: '校友', email: 'wncheung@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2022-04', name: '黃卓朗 (Wong Cheuk Long)', type: 'RSVP', year: '2022', role: '校友', email: 'clwong@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2012-05', name: '梁美婷 (Leung Mei Ting)', type: 'RSVP', year: '2012', role: '校友', email: 'mt.leung@example.com', checkedIn: false, checkInTime: null },
  { id: 'GUEST-HON-01', name: '楊子熙 校董 (Mr. Yeung Tsz Hei, BBS, MH)', type: 'RSVP', year: '嘉賓', role: '主禮嘉賓', email: 'supervisor@example.com', checkedIn: false, checkInTime: null },
  { id: 'GUEST-HON-02', name: '黃國強 會長 (Mr. Wong Kwok Keung, Keith)', type: 'RSVP', year: '校友會', role: '校友會會長', email: 'keith.wong@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2016-06', name: '趙芷晴 (Chiu Tsz Ching)', type: 'RSVP', year: '2016', role: '校友', email: 'tcchiu@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2019-07', name: '郭俊廷 (Kwok Chun Ting)', type: 'RSVP', year: '2019', role: '校友', email: 'ctkwok@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2023-08', name: '何思穎 (Ho Sze Wing)', type: 'RSVP', year: '2023', role: '校友', email: 'swho@example.com', checkedIn: false, checkInTime: null }
];

export default function App() {
  const [guests, setGuests] = useState(() => {
    const local = localStorage.getItem('ymtkfas_homecoming_guests_v2');
    return local ? JSON.parse(local) : INITIAL_GUESTS;
  });
  
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'stats' | 'guests' | 'qrcodes'
  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInputId, setManualInputId] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'

  // Walk-in 表單 State
  const [walkInName, setWalkInName] = useState('');
  const [walkInYear, setWalkInYear] = useState('2023');
  const [walkInRemarks, setWalkInRemarks] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // 儲存至 LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('ymtkfas_homecoming_guests_v2', JSON.stringify(guests));
    } catch (e) {
      console.error(e);
    }
  }, [guests]);

  // 音效反饋 (Web Audio API)
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'warning') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.setValueAtTime(280, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.log('Audio not allowed yet');
    }
  };

  // 統計數據
  const stats = useMemo(() => {
    const rsvpList = guests.filter(g => g.type === 'RSVP');
    const walkInList = guests.filter(g => g.type === 'WALK-IN');
    
    const rsvpTotal = rsvpList.length;
    const rsvpAttended = rsvpList.filter(g => g.checkedIn).length;
    const walkInAttended = walkInList.length;
    const totalAttended = rsvpAttended + walkInAttended;
    const attendanceRate = rsvpTotal > 0 ? Math.round((rsvpAttended / rsvpTotal) * 100) : 0;

    const yearDistribution = {};
    guests.filter(g => g.checkedIn).forEach(g => {
      const yr = g.year || '其他';
      yearDistribution[yr] = (yearDistribution[yr] || 0) + 1;
    });

    return {
      rsvpTotal,
      rsvpAttended,
      rsvpAbsent: rsvpTotal - rsvpAttended,
      walkInAttended,
      totalAttended,
      attendanceRate,
      yearDistribution
    };
  }, [guests]);

  // 處理 Check-in 邏輯
  const handleCheckIn = (rawId) => {
    if (!rawId) return;
    const cleanId = rawId.trim();
    const guestIndex = guests.findIndex(g => g.id.toLowerCase() === cleanId.toLowerCase());

    if (guestIndex === -1) {
      playSound('error');
      setLastScannedResult({
        status: 'error',
        title: '找不到此 QR Code 記錄',
        message: `ID: "${cleanId}" 不在預先登記名單內。請確認 ID 是否正確，或協助校友進行 Walk-in 即場登記。`,
        timestamp: new Date().toLocaleTimeString('zh-HK')
      });
      return;
    }

    const targetGuest = guests[guestIndex];

    if (targetGuest.checkedIn) {
      playSound('warning');
      setLastScannedResult({
        status: 'warning',
        guest: targetGuest,
        title: '⚠️ 此賓客已於較早前簽到！',
        message: `請勿重複簽到。首次簽到時間為：${targetGuest.checkInTime}`,
        timestamp: new Date().toLocaleTimeString('zh-HK')
      });
      return;
    }

    const nowStr = new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const updated = [...guests];
    updated[guestIndex] = {
      ...targetGuest,
      checkedIn: true,
      checkInTime: nowStr
    };

    setGuests(updated);
    playSound('success');
    setLastScannedResult({
      status: 'success',
      guest: updated[guestIndex],
      title: '✅ 簽到成功！歡迎回校！',
      message: `${updated[guestIndex].name} (${updated[guestIndex].year}年畢業/類別) 已成功簽到。`,
      timestamp: nowStr
    });
  };

  // 即場 Walk-in 登記
  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkInName.trim()) return;

    const nowStr = new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newWalkIn = {
      id: `WALK-${Date.now().toString().slice(-4)}`,
      name: walkInName.trim(),
      type: 'WALK-IN',
      year: walkInYear.trim() || 'Walk-in',
      role: '即場校友/嘉賓',
      email: walkInRemarks.trim() || '即場登記',
      checkedIn: true,
      checkInTime: nowStr
    };

    setGuests(prev => [newWalkIn, ...prev]);
    playSound('success');
    setLastScannedResult({
      status: 'success',
      guest: newWalkIn,
      title: '🎉 Walk-in 登記並簽到成功！',
      message: `${newWalkIn.name} 已加入名單並自動計入當日總出席人數。`,
      timestamp: nowStr
    });

    setWalkInName('');
    setWalkInRemarks('');
    setIsWalkInModalOpen(false);
  };

  // 啟用 / 關閉 鏡頭掃描
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraActive(false);
      setLastScannedResult({
        status: 'error',
        title: '無法啟動相機鏡頭',
        message: '請確保已允許瀏覽器使用相機權限，或使用手動輸入功能。',
        timestamp: new Date().toLocaleTimeString('zh-HK')
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
    }
    setCameraActive(false);
  };

  // 載入 jsQR 腳本
  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // 鏡頭 QR 解碼循環
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (window.jsQR) {
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            handleCheckIn(code.data);
            setTimeout(() => {
              if (active) scanLoopRef.current = requestAnimationFrame(tick);
            }, 2500);
            return;
          }
        }
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    };

    if (cameraActive) {
      scanLoopRef.current = requestAnimationFrame(tick);
    } else {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    }

    return () => {
      active = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive, guests]);

  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
    if (cameraActive) {
      stopCamera();
      setTimeout(startCamera, 300);
    }
  };

  // 匯出 CSV 報告
  const exportToCSV = () => {
    const headers = ["ID,姓名,類型,畢業年份/組別,身份,電郵/備註,出席狀態,簽到時間"];
    const rows = guests.map(g => 
      `"${g.id}","${g.name}","${g.type}","${g.year}","${g.role}","${g.email}","${g.checkedIn ? '已出席' : '未出席'}","${g.checkInTime || '-'}"`
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Homecoming_Attendance_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 重設數據
  const resetAttendance = () => {
    if (window.confirm("確定要重設所有簽到記錄嗎？這將清空所有出席時間並移除 Walk-in 記錄。")) {
      setGuests(INITIAL_GUESTS);
      setLastScannedResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      {/* 頂部導航欄 Header */}
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                校友回家日 Check-in 系統
                <span className="text-xs bg-emerald-700 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500">Reception</span>
              </h1>
              <p className="text-xs text-emerald-200">接待處專用簽到與即時人數追蹤系統</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "關閉音效" : "開啟音效"}
              className="p-2 rounded-lg bg-emerald-700/70 hover:bg-emerald-600 text-emerald-100 text-xs flex items-center gap-1"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
            </button>
            <button 
              onClick={() => setIsWalkInModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 shadow transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>即場 Walk-in</span>
            </button>
          </div>
        </div>

        {/* 頁面切換 Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex border-t border-emerald-700/60 overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('scan'); }}
            className={`py-2.5 px-4 font-medium text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'scan' ? 'border-amber-400 text-amber-300' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <Camera className="w-4 h-4" /> 掃描簽到
          </button>
          <button 
            onClick={() => { setActiveTab('stats'); stopCamera(); }}
            className={`py-2.5 px-4 font-medium text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'stats' ? 'border-amber-400 text-amber-300' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" /> 即時統計
          </button>
          <button 
            onClick={() => { setActiveTab('guests'); stopCamera(); }}
            className={`py-2.5 px-4 font-medium text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'guests' ? 'border-amber-400 text-amber-300' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> 完整名冊 ({guests.length})
          </button>
          <button 
            onClick={() => { setActiveTab('qrcodes'); stopCamera(); }}
            className={`py-2.5 px-4 font-medium text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'qrcodes' ? 'border-amber-400 text-amber-300' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <QrCode className="w-4 h-4" /> 門票 QR 碼發放
          </button>
        </div>
      </header>

      {/* 核心實時數據面板 */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">預先報名 (RSVP)</p>
              <p className="text-2xl font-bold text-slate-800">{stats.rsvpTotal} <span className="text-xs text-slate-400 font-normal">人</span></p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
            <div>
              <p className="text-xs text-emerald-700 font-semibold">RSVP 已到場</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.rsvpAttended} 
                <span className="text-xs text-emerald-700 font-medium ml-1.5">({stats.attendanceRate}%)</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-semibold">即場 Walk-in</p>
              <p className="text-2xl font-bold text-amber-600">{stats.walkInAttended} <span className="text-xs text-amber-500 font-normal">人</span></p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-3.5 rounded-xl shadow-md flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-200 font-medium">當晚總出席人數</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{stats.totalAttended} <span className="text-xs font-normal text-emerald-200">人</span></p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/10 text-amber-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 主內容區 */}
      <main className="max-w-5xl mx-auto px-4 pt-4">
        {/* TAB 1: 掃描簽到 */}
        {activeTab === 'scan' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-600" />
                    相機 QR Code 掃描器
                  </h2>
                  <div className="flex items-center gap-2">
                    {cameraActive && (
                      <button 
                        onClick={toggleCameraFacing}
                        className="p-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
                        title="切換前後鏡頭"
                      >
                        <FlipHorizontal className="w-4 h-4" />
                      </button>
                    )}
                    {!cameraActive ? (
                      <button 
                        onClick={startCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition"
                      >
                        <Camera className="w-3.5 h-3.5" /> 啟動相機掃描
                      </button>
                    ) : (
                      <button 
                        onClick={stopCamera}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> 停止相機
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border-2 border-slate-800">
                  {cameraActive ? (
                    <>
                      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted></video>
                      <canvas ref={canvasRef} className="hidden"></canvas>
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
                        請將校友門票 QR 碼置於框內
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <QrCode className="w-8 h-8 text-emerald-400" />
                      </div>
                      <p className="text-slate-300 text-sm font-medium">相機目前處於關閉狀態</p>
                      <button 
                        onClick={startCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg inline-flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" /> 開啟鏡頭掃描
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-2">手動輸入代碼：</p>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCheckIn(manualInputId);
                      setManualInputId('');
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      type="text" 
                      placeholder="輸入 ID (例如: ALUM-2015-01)" 
                      value={manualInputId}
                      onChange={(e) => setManualInputId(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      type="submit"
                      disabled={!manualInputId.trim()}
                      className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                    >
                      手動確認
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* 即時反饋卡 */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-h-[380px] flex flex-col">
                <h3 className="font-bold text-slate-800 text-sm mb-3">即時掃描反饋</h3>

                {lastScannedResult ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className={`p-4 rounded-xl border ${
                      lastScannedResult.status === 'success' 
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
                        : lastScannedResult.status === 'warning'
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}>
                      <div className="flex items-start gap-3">
                        {lastScannedResult.status === 'success' && <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />}
                        {lastScannedResult.status === 'warning' && <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />}
                        {lastScannedResult.status === 'error' && <XCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />}
                        
                        <div className="space-y-1">
                          <h4 className="font-bold text-base">{lastScannedResult.title}</h4>
                          <p className="text-xs leading-relaxed opacity-90">{lastScannedResult.message}</p>
                        </div>
                      </div>

                      {lastScannedResult.guest && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60 bg-white/70 p-3 rounded-lg text-slate-800 space-y-1.5 text-xs shadow-inner">
                          <div className="flex justify-between">
                            <span className="text-slate-600">賓客姓名:</span>
                            <span className="font-bold text-slate-900 text-sm">{lastScannedResult.guest.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">畢業年份 / 身份:</span>
                            <span className="font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              {lastScannedResult.guest.year} ({lastScannedResult.guest.role})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">登記編號:</span>
                            <span className="font-mono">{lastScannedResult.guest.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">簽到時間:</span>
                            <span className="font-semibold text-emerald-700">{lastScannedResult.guest.checkInTime}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <QrCode className="w-12 h-12 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">等待掃描中...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 即時統計 */}
        {activeTab === 'stats' && (
          <div className="space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">活動出席進度儀表板</h2>
                  <p className="text-xs text-slate-500">實時反映 RSVP 預約與 Walk-in 到場對比情況</p>
                </div>
                <button 
                  onClick={exportToCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-4 h-4" /> 匯出完整名單 (CSV)
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">RSVP 出席達成率</span>
                  <span className="font-bold text-emerald-600">{stats.rsvpAttended} / {stats.rsvpTotal} ({stats.attendanceRate}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.attendanceRate, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700">預先 RSVP 已到</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{stats.rsvpAttended}</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700">即場 Walk-in 人數</p>
                  <p className="text-3xl font-bold text-amber-900 mt-1">{stats.walkInAttended}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-700">當晚全場總人數</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">{stats.totalAttended}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 完整名冊 */}
        {activeTab === 'guests' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="搜尋姓名、ID、畢業年份..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={exportToCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition"
                >
                  <Download className="w-4 h-4" /> 匯出 CSV
                </button>
                <button 
                  onClick={resetAttendance}
                  className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1 border border-slate-200 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 重設
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">狀態</th>
                    <th className="py-3 px-3">賓客姓名</th>
                    <th className="py-3 px-3">類別/年份</th>
                    <th className="py-3 px-3">登記 ID</th>
                    <th className="py-3 px-3">簽到時間</th>
                    <th className="py-3 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guests
                    .filter(g => 
                      g.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      g.id.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                      g.year.toLowerCase().includes(searchKeyword.toLowerCase())
                    )
                    .map((guest) => (
                      <tr key={guest.id} className={guest.checkedIn ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3">
                          {guest.checkedIn ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> 已出席
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full text-[11px]">
                              未到
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{guest.name}</td>
                        <td className="py-2.5 px-3">{guest.year}</td>
                        <td className="py-2.5 px-3 font-mono">{guest.id}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-700">{guest.checkInTime || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              if (guest.checkedIn) {
                                setGuests(guests.map(g => g.id === guest.id ? { ...g, checkedIn: false, checkInTime: null } : g));
                              } else {
                                handleCheckIn(guest.id);
                              }
                            }}
                            className="text-[11px] px-2.5 py-1 rounded font-medium bg-slate-100 hover:bg-slate-200"
                          >
                            {guest.checkedIn ? '取消' : '簽到'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: 門票 QR 碼 */}
        {activeTab === 'qrcodes' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800">校友專屬入場門票 (QR Code Passes)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {guests.filter(g => g.type === 'RSVP').map(guest => (
                <div key={guest.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(guest.id)}`} 
                      alt={guest.name}
                      className="w-28 h-28"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{guest.name}</h4>
                    <p className="text-xs text-emerald-700 font-medium">{guest.year} 屆校友</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{guest.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* WALK-IN MODAL */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                即場 Walk-in 賓客登記
              </h3>
              <button onClick={() => setIsWalkInModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">賓客 / 校友姓名 *</label>
                <input 
                  type="text" 
                  required
                  placeholder="例如: 何小明 (Ho Siu Ming)"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">畢業年份 / 身份</label>
                <input 
                  type="text" 
                  placeholder="例如: 2017 / 嘉賓朋友"
                  value={walkInYear}
                  onChange={(e) => setWalkInYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold shadow transition"
                >
                  完成登記並簽到
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}