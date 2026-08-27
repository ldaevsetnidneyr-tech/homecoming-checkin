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
  Volume2,
  VolumeX,
  FlipHorizontal
} from 'lucide-react';

const INITIAL_GUESTS = [
  { id: 'ALUM-2015-01', name: '陳家豪 (Chan Ka Ho)', type: 'RSVP', year: '2015', role: '校友 / Alumnus', email: 'kahoc@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2018-02', name: '李詠琪 (Lee Wing Ki)', type: 'RSVP', year: '2018', role: '校友 / Alumna', email: 'wingki.lee@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2020-03', name: '張偉諾 (Cheung Wai Nok)', type: 'RSVP', year: '2020', role: '校友 / Alumnus', email: 'wncheung@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2022-04', name: '黃卓朗 (Wong Cheuk Long)', type: 'RSVP', year: '2022', role: '校友 / Alumnus', email: 'clwong@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2012-05', name: '梁美婷 (Leung Mei Ting)', type: 'RSVP', year: '2012', role: '校友 / Alumna', email: 'mt.leung@example.com', checkedIn: false, checkInTime: null },
  { id: 'GUEST-HON-01', name: '楊子熙 校董 (Mr. Yeung Tsz Hei, BBS, MH)', type: 'RSVP', year: '嘉賓 / Guest', role: '主禮嘉賓 / Guest of Honour', email: 'supervisor@example.com', checkedIn: false, checkInTime: null },
  { id: 'GUEST-HON-02', name: '黃國強 會長 (Mr. Keith Wong)', type: 'RSVP', year: '校友會 / Alumni Assoc.', role: '校友會會長 / President', email: 'keith.wong@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2016-06', name: '趙芷晴 (Chiu Tsz Ching)', type: 'RSVP', year: '2016', role: '校友 / Alumna', email: 'tcchiu@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2019-07', name: '郭俊廷 (Kwok Chun Ting)', type: 'RSVP', year: '2019', role: '校友 / Alumnus', email: 'ctkwok@example.com', checkedIn: false, checkInTime: null },
  { id: 'ALUM-2023-08', name: '何思穎 (Ho Sze Wing)', type: 'RSVP', year: '2023', role: '校友 / Alumna', email: 'swho@example.com', checkedIn: false, checkInTime: null }
];

export default function App() {
  const [guests, setGuests] = useState(() => {
    const local = localStorage.getItem('ymtkfas_homecoming_guests_v5');
    return local ? JSON.parse(local) : INITIAL_GUESTS;
  });
  
  const [activeTab, setActiveTab] = useState('scan');
  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInputId, setManualInputId] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraError, setCameraError] = useState('');

  // Walk-in 表單
  const [walkInName, setWalkInName] = useState('');
  const [walkInYear, setWalkInYear] = useState('2023');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isScanningLocked = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('ymtkfas_homecoming_guests_v5', JSON.stringify(guests));
    } catch (e) {
      console.error(e);
    }
  }, [guests]);

  // 載入備援解碼器 jsQR
  useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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
      console.log('Audio error');
    }
  };

  const stats = useMemo(() => {
    const rsvpList = guests.filter(g => g.type === 'RSVP');
    const walkInList = guests.filter(g => g.type === 'WALK-IN');
    const rsvpTotal = rsvpList.length;
    const rsvpAttended = rsvpList.filter(g => g.checkedIn).length;
    const walkInAttended = walkInList.length;
    const totalAttended = rsvpAttended + walkInAttended;
    const attendanceRate = rsvpTotal > 0 ? Math.round((rsvpAttended / rsvpTotal) * 100) : 0;

    return { rsvpTotal, rsvpAttended, walkInAttended, totalAttended, attendanceRate };
  }, [guests]);

  const handleCheckIn = (rawId) => {
    if (!rawId) return;
    const cleanId = String(rawId).trim();
    const guestIndex = guests.findIndex(g => g.id.toLowerCase() === cleanId.toLowerCase());

    if (guestIndex === -1) {
      playSound('error');
      setLastScannedResult({
        status: 'error',
        titleZh: '找不到此登記記錄',
        titleEn: 'Guest ID Not Found',
        messageZh: `ID: "${cleanId}" 不在名單內。請查核或進行即場登記。`,
        messageEn: `ID: "${cleanId}" not found. Please use Walk-in registration.`,
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
        titleZh: '⚠️ 此賓客已於較早前簽到！',
        titleEn: '⚠️ Already Checked In!',
        messageZh: `請勿重複簽到。首次簽到時間：${targetGuest.checkInTime}`,
        messageEn: `First checked in at: ${targetGuest.checkInTime}`,
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
      titleZh: '✅ 簽到成功！歡迎回校！',
      titleEn: '✅ Check-in Success! Welcome!',
      messageZh: `${updated[guestIndex].name} 已完成簽到手續。`,
      messageEn: `${updated[guestIndex].name} has checked in.`,
      timestamp: nowStr
    });
  };

  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkInName.trim()) return;

    const nowStr = new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newWalkIn = {
      id: `WALK-${Date.now().toString().slice(-4)}`,
      name: walkInName.trim(),
      type: 'WALK-IN',
      year: walkInYear.trim() || 'Walk-in',
      role: '即場校友 / Walk-in Guest',
      email: '即場登記 / Walk-in',
      checkedIn: true,
      checkInTime: nowStr
    };

    setGuests(prev => [newWalkIn, ...prev]);
    playSound('success');
    setLastScannedResult({
      status: 'success',
      guest: newWalkIn,
      titleZh: '🎉 Walk-in 登記並簽到成功！',
      titleEn: '🎉 Walk-in Registered & Checked-in!',
      messageZh: `${newWalkIn.name} 已加入名單。`,
      messageEn: `${newWalkIn.name} added to headcount.`,
      timestamp: nowStr
    });

    setWalkInName('');
    setIsWalkInModalOpen(false);
  };

  // 強化相機啟動程序：具備自動相容 fallback
  const startCamera = async () => {
    setCameraError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    let stream = null;
    try {
      // 優先嘗試指定鏡頭方向
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing }
      });
    } catch (err1) {
      console.warn("指定鏡頭失敗，嘗試通用視訊設定...", err1);
      try {
        // Fallback: 任何可用鏡頭皆可
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err2) {
        console.error("相機完全無法存取:", err2);
        setCameraActive(false);
        setCameraError(`無法啟動相機：${err2.name || '權限受阻'}。請確認瀏覽器已允許使用相機。`);
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setCameraActive(true);
      // 等待 DOM 更新後掛載 video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch(e => console.error("Play error:", e));
        }
      }, 100);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // 掃描偵測循環
  useEffect(() => {
    let animationId;
    let barcodeDetector = null;

    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const scanFrame = async () => {
      if (!cameraActive || !videoRef.current || isScanningLocked.current) {
        animationId = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              isScanningLocked.current = true;
              handleCheckIn(barcodes[0].rawValue);
              setTimeout(() => { isScanningLocked.current = false; }, 2000);
              animationId = requestAnimationFrame(scanFrame);
              return;
            }
          } catch (e) {}
        }

        if (canvasRef.current && window.jsQR) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            isScanningLocked.current = true;
            handleCheckIn(code.data);
            setTimeout(() => { isScanningLocked.current = false; }, 2000);
          }
        }
      }

      animationId = requestAnimationFrame(scanFrame);
    };

    if (cameraActive) {
      animationId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [cameraActive, guests]);

  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
    if (cameraActive) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  const exportToCSV = () => {
    const headers = ["ID,Name / 姓名,Type / 類型,Year / 畢業年份,Role / 身份,Status / 狀態,Check-in Time / 簽到時間"];
    const rows = guests.map(g => 
      `"${g.id}","${g.name}","${g.type}","${g.year}","${g.role}","${g.checkedIn ? 'Attended' : 'Absent'}","${g.checkInTime || '-'}"`
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Homecoming_Attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight">校友回家日 Check-in 系統</h1>
              <p className="text-xs text-emerald-200">Homecoming Day Check-in System</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-xs"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
            </button>
            <button 
              onClick={() => setIsWalkInModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-1 shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>即場 Walk-in</span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 flex border-t border-emerald-700/60 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`py-2.5 px-3.5 font-medium text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'scan' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <Camera className="w-4 h-4" /> 掃描簽到 (Scan)
          </button>
          <button 
            onClick={() => { setActiveTab('stats'); stopCamera(); }}
            className={`py-2.5 px-3.5 font-medium text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'stats' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" /> 即時統計 (Stats)
          </button>
          <button 
            onClick={() => { setActiveTab('guests'); stopCamera(); }}
            className={`py-2.5 px-3.5 font-medium text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'guests' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> 完整名冊 (Guests: {guests.length})
          </button>
          <button 
            onClick={() => { setActiveTab('qrcodes'); stopCamera(); }}
            className={`py-2.5 px-3.5 font-medium text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === 'qrcodes' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-emerald-100 hover:text-white'}`}
          >
            <QrCode className="w-4 h-4" /> 門票 QR 碼 (Passes)
          </button>
        </div>
      </header>

      {/* 統計概覽 */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">預先登記 (RSVP)</p>
            <p className="text-2xl font-bold text-slate-800">{stats.rsvpTotal} <span className="text-xs text-slate-400 font-normal">人</span></p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm">
            <p className="text-xs text-emerald-700 font-semibold">RSVP 已到場 (Attended)</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.rsvpAttended} <span className="text-xs text-emerald-700 font-medium">({stats.attendanceRate}%)</span></p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm">
            <p className="text-xs text-amber-700 font-semibold">即場 Walk-in</p>
            <p className="text-2xl font-bold text-amber-600">{stats.walkInAttended} <span className="text-xs text-amber-500 font-normal">人</span></p>
          </div>
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-3.5 rounded-xl shadow-md">
            <p className="text-xs text-emerald-200 font-medium">總出席人數 (Headcount)</p>
            <p className="text-3xl font-extrabold text-white tracking-tight">{stats.totalAttended} <span className="text-xs font-normal text-emerald-200">人</span></p>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-4">
        {activeTab === 'scan' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-600" />
                    相機 QR 掃描器 / Scanner
                  </h2>
                  <div className="flex items-center gap-2">
                    {cameraActive && (
                      <button 
                        onClick={toggleCameraFacing}
                        className="p-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
                        title="切換鏡頭"
                      >
                        <FlipHorizontal className="w-4 h-4" />
                      </button>
                    )}
                    {!cameraActive ? (
                      <button 
                        onClick={startCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <Camera className="w-3.5 h-3.5" /> 啟動相機
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

                {cameraError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border-2 border-slate-800">
                  {cameraActive ? (
                    <>
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover" 
                        playsInline 
                        muted 
                        autoPlay
                      ></video>
                      <canvas ref={canvasRef} className="hidden"></canvas>
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.6)]">
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 bg-black/75 text-emerald-300 text-xs px-3 py-1 rounded-full backdrop-blur">
                        對準 QR Code 即可自動感應
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                        <QrCode className="w-8 h-8" />
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm font-medium">相機已關閉 / Camera is Off</p>
                      <button 
                        onClick={startCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-lg inline-flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" /> 開啟鏡頭掃描
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-2">手動輸入 ID / Manual Check-in:</p>
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
                      placeholder="輸入 ID (例如 ALUM-2015-01)" 
                      value={manualInputId}
                      onChange={(e) => setManualInputId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                      type="submit"
                      disabled={!manualInputId.trim()}
                      className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg"
                    >
                      簽到
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* 即時反饋卡 */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm min-h-[380px] flex flex-col">
                <h3 className="font-bold text-slate-800 text-sm mb-3">即時簽到反饋 / Live Feedback</h3>

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
                          <h4 className="font-bold text-sm sm:text-base leading-snug">{lastScannedResult.titleZh}</h4>
                          <p className="text-xs font-semibold opacity-90">{lastScannedResult.titleEn}</p>
                          <p className="text-xs leading-relaxed opacity-80 pt-1">{lastScannedResult.messageZh}</p>
                          <p className="text-[11px] leading-relaxed opacity-70 italic">{lastScannedResult.messageEn}</p>
                        </div>
                      </div>

                      {lastScannedResult.guest && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60 bg-white/80 p-3 rounded-lg text-slate-800 space-y-1.5 text-xs shadow-inner">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">姓名 / Name:</span>
                            <span className="font-bold text-slate-900 text-sm">{lastScannedResult.guest.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">類別 / Category:</span>
                            <span className="font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              {lastScannedResult.guest.year} ({lastScannedResult.guest.role})
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">登記編號 / ID:</span>
                            <span className="font-mono">{lastScannedResult.guest.id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">簽到時間 / Time:</span>
                            <span className="font-semibold text-emerald-700">{lastScannedResult.guest.checkInTime}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <QrCode className="w-12 h-12 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">等待掃描中... / Ready to Scan</p>
                    <p className="text-xs text-slate-400">請將 QR Code 對準鏡頭</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 統計分頁 */}
        {activeTab === 'stats' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">出席統計數據 / Headcount Stats</h2>
              <button 
                onClick={exportToCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" /> 匯出 CSV 報告
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <p className="text-xs font-semibold text-blue-700">RSVP 出席人數</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.rsvpAttended} / {stats.rsvpTotal}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                <p className="text-xs font-semibold text-amber-700">Walk-in 即場人數</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{stats.walkInAttended}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700">總出席總數 (Headcount)</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">{stats.totalAttended}</p>
              </div>
            </div>
          </div>
        )}

        {/* 名冊分頁 */}
        {activeTab === 'guests' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="搜尋姓名或編號 / Search..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button 
                onClick={exportToCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 transition"
              >
                <Download className="w-4 h-4" /> 匯出
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-3">狀態</th>
                    <th className="py-3 px-3">姓名</th>
                    <th className="py-3 px-3">年份</th>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">時間</th>
                    <th className="py-3 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {guests
                    .filter(g => g.name.toLowerCase().includes(searchKeyword.toLowerCase()) || g.id.toLowerCase().includes(searchKeyword.toLowerCase()))
                    .map((guest) => (
                      <tr key={guest.id} className={guest.checkedIn ? 'bg-emerald-50/40' : ''}>
                        <td className="py-2.5 px-3">
                          {guest.checkedIn ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> 已出席
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">未到</span>
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

        {/* 門票 QR Code 分頁 */}
        {activeTab === 'qrcodes' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800">校友專屬入場門票 (測試用)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {guests.filter(g => g.type === 'RSVP').map(guest => (
                <div key={guest.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(guest.id)}`} 
                      alt={guest.name}
                      className="w-32 h-32"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{guest.name}</h4>
                    <p className="text-xs text-emerald-700 font-medium">{guest.year} ({guest.role})</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{guest.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Walk-in Modal */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                即場 Walk-in 賓客登記
              </h3>
              <button onClick={() => setIsWalkInModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">校友姓名 (Name) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="例如: 何小明"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">畢業年份 / 身份 (Year)</label>
                <input 
                  type="text" 
                  placeholder="例如: 2017"
                  value={walkInYear}
                  onChange={(e) => setWalkInYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-xs sm:text-sm"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow transition text-xs sm:text-sm"
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
