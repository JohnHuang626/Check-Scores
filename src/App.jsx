import React, { useState, useEffect, useMemo } from 'react';
// --- 標準 Firebase 引入方式 ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";

import { 
  BookOpen, Calendar, ChevronRight, LogOut, Menu, MessageSquare, 
  Bell, FileText, User, TrendingUp, X, Users, CheckCircle, 
  XCircle, Edit, Printer, Save, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Trash2, Key, BarChart2, Search, Download, Upload,
  School, Monitor, FileSpreadsheet, Settings, Database, AlertCircle, CloudOff,
  LineChart, Trophy
} from 'lucide-react';

// !!!!!!!!!!!!! 重要設定 !!!!!!!!!!!!!
// 請將此處替換為您的 Firebase 真實設定
const firebaseConfig = {
  apiKey: "AIzaSyC9xyXEs3lVqiSnv5JV2og7yjYMdf9Vr-M",
  authDomain: "smart-campus-db-919b9.firebaseapp.com",
  projectId: "smart-campus-db-919b9",
  storageBucket: "smart-campus-db-919b9.firebasestorage.app",
  messagingSenderId: "1054476837332",
  appId: "1:1054476837332:web:4ba66b14f114bcac42b641"
};

// --- Firebase 初始化邏輯 ---
let app;
let db;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
    console.log("未偵測到 Firebase Config，將啟動演示模式 (Demo Mode)");
  }
} catch (error) {
  console.warn("Firebase 初始化跳過:", error);
}

// --- 備用模擬資料 (單機演示模式用) ---
const MOCK_STUDENTS = [
  { id: "1", seat: 1, name: "範例王大明", account: "s11201", password: "123" },
  { id: "2", seat: 2, name: "範例林小美", account: "s11202", password: "123" },
  { id: "3", seat: 3, name: "範例張志豪", account: "s11203", password: "123" },
  { id: "4", seat: 4, name: "範例陳小明", account: "s11204", password: "123" }, 
  { id: "5", seat: 5, name: "範例李雅婷", account: "s11205", password: "123" },
];

const MOCK_GRADES = {
  "7-1-reg-0": { 
    "4": { chi: 80, eng: 85, math: 70, sci: 75, geo: 80, his: 82, civ: 80 }, 
    "1": { chi: 85, eng: 88, math: 80, sci: 82, geo: 85, his: 85, civ: 85 }, 
    "2": { chi: 90, eng: 92, math: 95, sci: 90, geo: 90, his: 90, civ: 90 },
  },
  "7-1-reg-1": { 
    "4": { chi: 85, eng: 90, math: 75, sci: 80, geo: 85, his: 85, civ: 85 }, 
    "1": { chi: 88, eng: 90, math: 85, sci: 85, geo: 88, his: 88, civ: 88 }, 
    "2": { chi: 92, eng: 95, math: 98, sci: 92, geo: 92, his: 92, civ: 92 },
  },
  "7-1-reg-2": { 
    "4": { chi: 82, eng: 88, math: 72, sci: 78, geo: 82, his: 84, civ: 82 }, 
    "1": { chi: 86, eng: 89, math: 82, sci: 84, geo: 86, his: 86, civ: 86 }, 
    "2": { chi: 91, eng: 94, math: 96, sci: 91, geo: 91, his: 91, civ: 91 },
  }
};

const DEFAULT_TEACHER = { 
  id: 'teacher', 
  name: '黃翰強', 
  className: '二年2班', 
  account: 't888', 
  password: '888' 
};

// --- Constants ---
const CAP_POINTS = { "A++": 7, "A+": 6, "A": 5, "B++": 4, "B+": 3, "B": 2, "C": 1 };
const CAP_OPTIONS = ["A++", "A+", "A", "B++", "B+", "B", "C"];

const generateExamOptions = () => {
  const grades = ['七年級', '八年級', '九年級'];
  const semesters = ['上學期', '下學期'];
  const regularExams = ['第一次段考', '第二次段考', '期末考']; 
  const reviewExams = ['學期複習考']; 
  const mockExams = ['第一次模擬考', '第二次模擬考', '第三次模擬考', '第四次模擬考', '會考模擬'];
  
  let regularOptions = [];
  let otherOptions = [];
  
  grades.forEach((g, gIdx) => {
    semesters.forEach((s, sIdx) => {
      regularExams.forEach((e, eIdx) => {
        regularOptions.push({
          id: `${gIdx+7}-${sIdx+1}-reg-${eIdx}`, 
          label: `${g} ${s} ${e}`,
          category: 'regular',
          group: `【段考】${g} ${s}`
        });
      });
      reviewExams.forEach((e, eIdx) => {
        otherOptions.push({
          id: `${gIdx+7}-${sIdx+1}-rev-${eIdx}`, 
          label: `${g} ${s} ${e}`,
          category: 'cap',
          group: `【模擬/複習】${g} ${s}`
        });
      });
      if (g === '九年級') {
        mockExams.forEach((m, mIdx) => {
           otherOptions.push({
            id: `9-${sIdx+1}-mock-${mIdx}`, 
            label: `${g} ${s} ${m}`,
            category: 'cap',
            group: `【模擬/複習】${g} ${s}`
          });
        });
      }
    });
  });
  return [...regularOptions, ...otherOptions];
};
const EXAM_OPTIONS = generateExamOptions();

const EXAM_GROUPS = EXAM_OPTIONS.reduce((groups, opt) => {
  const lastGroup = groups[groups.length - 1];
  if (lastGroup && lastGroup.label === opt.group) {
    lastGroup.options.push(opt);
  } else {
    groups.push({ label: opt.group, options: [opt] });
  }
  return groups;
}, []);

// --- Helper Functions ---
const getCurrentExamCategory = (examId) => {
  const exam = EXAM_OPTIONS.find(e => e.id === examId);
  return exam ? exam.category : 'regular';
};

const calculateStats = (scores, category) => {
  if (!scores) return { social: 0, total: 0, points: 0 };
  if (category === 'regular') {
    const social = parseFloat((( (scores.geo||0) + (scores.his||0) + (scores.civ||0) ) / 3).toFixed(1));
    const total = parseFloat(((scores.chi||0) + (scores.eng||0) + (scores.math||0) + (scores.sci||0) + social).toFixed(1));
    return { social, total };
  } else {
    let totalPoints = 0;
    ['chi', 'eng', 'math', 'sci', 'soc'].forEach(sub => {
      const rating = scores[sub] || 'C'; 
      totalPoints += (CAP_POINTS[rating] || 0); 
    });
    return { total: totalPoints }; 
  }
};

// --- Helper Components ---
const SortableHeader = ({ label, sortKey, className = "", sortConfig, onSort }) => (
  <th 
    className={`p-3 cursor-pointer hover:bg-gray-200 select-none transition-colors ${className}`}
    onClick={() => onSort && onSort(sortKey)}
  >
    <div className="flex items-center justify-center space-x-1">
      <span>{label}</span>
      {sortConfig && sortConfig.key === sortKey ? (
        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>
      ) : <ArrowUpDown size={14} className="text-gray-300 opacity-50" />}
    </div>
  </th>
);

const ComparisonBar = ({ subject, myScore, avgScore, maxScore = 100, isCap = false }) => {
  const displayScore = isCap && typeof myScore === 'string' ? (CAP_POINTS[myScore] || 0) : myScore;
  const numAvg = Number(avgScore);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-gray-700">{subject}</span>
        <div className="space-x-2">
          <span className="text-blue-600 font-bold">我: {myScore} {isCap ? `(${displayScore}分)` : ''}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">班均: {avgScore}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
        <div className="absolute top-0 bottom-0 bg-gray-400 w-1 z-10 opacity-50" style={{ left: `${(numAvg / maxScore) * 100}%` }}></div>
        <div className={`h-full rounded-full transition-all duration-500 ${displayScore >= numAvg ? 'bg-blue-500' : 'bg-orange-400'}`} style={{ width: `${(displayScore / maxScore) * 100}%` }}></div>
      </div>
    </div>
  );
};

// 更新 TrendChart 支援反轉 (reverse) 模式，用於排名顯示
const TrendChart = ({ data, title, reverse = false }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-sm p-4 text-center bg-gray-50 rounded-lg">尚無足夠數據繪製趨勢圖 (需至少一次考試成績)</div>;
  
  const scores = data.map(d => d.score);
  const maxVal = Math.max(...scores);
  
  const height = 150;
  const width = 300;
  const padding = 20;
  
  let minScore = 0;
  let maxScore = 100;

  if (reverse) {
    // 排名模式：1 是最好的，放上面
    minScore = 1;
    maxScore = Math.max(...scores, 5); // 確保圖表不會太扁，至少顯示到第5名或更低
  } else {
    // 分數模式
    const isRegularTotal = maxVal > 35;
    maxScore = isRegularTotal ? 500 : 35;
    minScore = 0;
  }
  
  const getX = (index) => {
    const count = data.length > 1 ? data.length - 1 : 1;
    if (data.length <= 1) return width / 2;
    return padding + (index * ((width - padding * 2) / (data.length - 1)));
  };
  
  const getY = (val) => {
    if (reverse) {
        // 反轉模式：值越小 (1) 越靠上 (padding)，值越大 (maxScore) 越靠下
        return padding + ((val - minScore) / (maxScore - minScore)) * (height - 2 * padding);
    } else {
        // 一般模式：值越大 (maxScore) 越靠上 (padding)
        return height - padding - ((val - minScore) / (maxScore - minScore)) * (height - 2 * padding);
    }
  };
  
  const points = data.length > 1 
    ? data.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ') 
    : "";

  const lineColor = reverse ? "#f59e0b" : "#2563eb"; // 排名用橘色，分數用藍色

  return (
    <div className="w-full overflow-x-auto">
      <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center">
        {title}
        {reverse && <span className="ml-2 text-xs text-gray-400 font-normal">(越低越好)</span>}
      </h4>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-white rounded-lg border border-gray-100" style={{ overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
           <line key={r} x1={padding} y1={height - padding - r*(height-2*padding)} x2={width-padding} y2={height - padding - r*(height-2*padding)} stroke="#eee" strokeWidth="1" />
        ))}
        {data.length > 1 && (
          <polyline points={points} fill="none" stroke={lineColor} strokeWidth="3" />
        )}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.score)} r="5" fill={lineColor} />
            <text x={getX(i)} y={getY(d.score) - 10} textAnchor="middle" fontSize="12" fill="#4b5563" fontWeight="bold">{d.score}</text>
            <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="10" fill="#9ca3af">{d.examLabel.split(' ').pop()}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('parent'); 
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMenu, setShowMenu] = useState(false);

  // --- States ---
  const [students, setStudents] = useState(db ? [] : MOCK_STUDENTS);
  const [gradesDB, setGradesDB] = useState(db ? {} : MOCK_GRADES);
  const [teacherProfile, setTeacherProfile] = useState(DEFAULT_TEACHER);
  const [connectionStatus, setConnectionStatus] = useState("demo"); 
  
  // UI States
  const [teacherExamId, setTeacherExamId] = useState(EXAM_OPTIONS[0].id);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [tempStudentData, setTempStudentData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'seat', direction: 'asc' });
  const [parentExamId, setParentExamId] = useState("7-1-reg-0"); 

  // --- Vercel Toolbar Blocker ---
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      vercel-live-feedback,
      #vercel-toolbar,
      vercel-toolbar,
      [data-testid="vercel-toolbar"],
      div[class*="vercel-toolbar"],
      [class*="vercel-toast"] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        z-index: -9999 !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // --- Sync Effects ---
  useEffect(() => {
    if (db) {
      setConnectionStatus("connecting");
      try {
        const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
          const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (studentList.length > 0) {
            studentList.sort((a, b) => a.seat - b.seat);
            setStudents(studentList);
            setConnectionStatus("connected");
          } else {
             setConnectionStatus("connected");
          }
        }, (err) => { 
            console.warn("Using Mock Data (Students)", err); 
            setConnectionStatus("error"); 
            setStudents(MOCK_STUDENTS);
        });
        return () => unsub();
      } catch (e) { 
          setConnectionStatus("error"); 
          setStudents(MOCK_STUDENTS);
      }
    } else { 
        setConnectionStatus("demo"); 
        setStudents(MOCK_STUDENTS);
    }
  }, []);

  useEffect(() => {
    if (db) {
      try {
        const unsub = onSnapshot(collection(db, "grades"), (snapshot) => {
          const gradesData = {};
          snapshot.docs.forEach(doc => { gradesData[doc.id] = doc.data(); });
          if (Object.keys(gradesData).length > 0) {
            setGradesDB(gradesData);
          } else {
             setGradesDB(MOCK_GRADES); 
          }
        }, (err) => {
           console.warn("Using Mock Data (Grades)");
           setGradesDB(MOCK_GRADES);
        });
        return () => unsub();
      } catch (e) { setGradesDB(MOCK_GRADES); }
    } else {
        setGradesDB(MOCK_GRADES);
    }
  }, []);

  useEffect(() => {
    if (db) {
      try {
        const unsub = onSnapshot(doc(db, "meta", "teacherProfile"), (docSnap) => {
          if (docSnap.exists()) setTeacherProfile(docSnap.data());
        });
        return () => unsub();
      } catch (e) {}
    }
  }, []);

  const initializeDatabase = async () => {
    if (!db) { alert("Demo Mode - 無法寫入"); return; }
    if(!confirm("確定寫入測試資料?")) return;
    try {
      await setDoc(doc(db, "meta", "teacherProfile"), DEFAULT_TEACHER);
      for (const s of MOCK_STUDENTS) { await setDoc(doc(db, "students", s.id), s); }
      for (const [examId, grades] of Object.entries(MOCK_GRADES)) { await setDoc(doc(db, "grades", examId), grades); }
      alert("初始化成功！"); window.location.reload();
    } catch (e) { alert("寫入失敗: " + e.message); }
  };

  const handleNavClick = (tab) => { setActiveTab(tab); setShowMenu(false); };
  
  const handleLogin = (role, account, password) => {
    const allowDefault = (connectionStatus !== 'connected' || students.length === 0 || students === MOCK_STUDENTS);
    if (role === 'teacher') {
      const isDefaultLogin = (allowDefault && account === DEFAULT_TEACHER.account && password === DEFAULT_TEACHER.password);
      const isProfileLogin = (account === teacherProfile.account && password === teacherProfile.password);

      if (isDefaultLogin || isProfileLogin) {
        setUserRole('teacher');
        setCurrentUser(isDefaultLogin ? DEFAULT_TEACHER : teacherProfile);
        setIsLoggedIn(true);
        setActiveTab('dashboard');
      } else { alert("教師帳號錯誤 (t888/888)"); }
    } else {
      const student = students.find(s => s.account === account && s.password === password);
      if (student) {
        setUserRole('parent');
        setCurrentUser(student);
        setIsLoggedIn(true);
        setActiveTab('dashboard');
        const regularExamIds = EXAM_OPTIONS.filter(opt => opt.category === 'regular').map(opt => opt.id);
        const lastRegularExamId = [...regularExamIds].reverse().find(eid => gradesDB[eid] && gradesDB[eid][student.id]);
        if (lastRegularExamId) { setParentExamId(lastRegularExamId); }
      } else { alert("學生帳號錯誤 (s11204/123)"); }
    }
  };

  // Teacher Handlers
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProfile = { ...teacherProfile, className: formData.get('className'), name: formData.get('name') };
    if(db && connectionStatus === 'connected') await setDoc(doc(db, "meta", "teacherProfile"), newProfile);
    else setTeacherProfile(newProfile);
    alert("更新成功");
  };
  const handleUpdateStudent = async () => {
    if(db && connectionStatus === 'connected') {
        if (editingStudentId === 'new') {
          const newStudentRef = doc(collection(db, "students")); 
          await setDoc(newStudentRef, { ...tempStudentData, id: newStudentRef.id });
        } else {
          await updateDoc(doc(db, "students", editingStudentId), tempStudentData);
        }
    } else {
        if (editingStudentId === 'new') {
            setStudents([...students, { ...tempStudentData, id: Date.now().toString() }]);
        } else {
            setStudents(students.map(s => s.id === editingStudentId ? tempStudentData : s));
        }
    }
    setEditingStudentId(null);
  };
  const handleDeleteStudent = async (id) => {
    if (confirm("確定要刪除這位學生嗎？")) {
      if(db && connectionStatus === 'connected') await deleteDoc(doc(db, "students", id));
      else setStudents(students.filter(s => s.id !== id));
    }
  };
  const handleGradeChange = async (studentId, subject, value) => {
    const currentCategory = getCurrentExamCategory(teacherExamId);
    let finalValue = value;
    if (currentCategory === 'regular') finalValue = Number(value);
    
    if(db && connectionStatus === 'connected') {
        await setDoc(doc(db, "grades", teacherExamId), {
            [studentId]: { ...(gradesDB[teacherExamId]?.[studentId] || {}), [subject]: finalValue }
        }, { merge: true });
    } else {
        setGradesDB(prev => ({
            ...prev,
            [teacherExamId]: { ...(prev[teacherExamId] || {}), [studentId]: { ...(prev[teacherExamId]?.[studentId] || {}), [subject]: finalValue } }
        }));
    }
  };
  const handleSort = (key) => {
    let direction = 'desc';
    if (key === 'seat' || key === 'rank') direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === direction) { direction = direction === 'asc' ? 'desc' : 'asc'; }
    setSortConfig({ key, direction });
  };
  
  // CSV Handlers
  const handleDownloadStudentTemplate = () => {
    const BOM = "\uFEFF"; 
    const headers = "座號,姓名,帳號,密碼";
    const csvContent = BOM + headers + "\n6,範例王小明,s11206,123456\n7,範例林小美,s11207,123456";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); 
    link.href = url; 
    link.download = "學生資料匯入範本.csv"; 
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const handleStudentUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const lines = content.split(/\r\n|\n/);
        let count = 0;
        // Parse CSV lines
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          // Ensure at least 4 columns
          if (parts.length >= 4) {
             const seat = parseInt(parts[0].trim());
             const name = parts[1].trim();
             const account = parts[2].trim();
             const password = parts[3].trim(); 
             if (!isNaN(seat) && name && account) {
               if(db && connectionStatus === 'connected') {
                 const newStudentRef = doc(collection(db, "students"));
                 await setDoc(newStudentRef, { id: newStudentRef.id, seat, name, account, password: password || "123" });
               } else {
                 setStudents(prev => [...prev, { id: Date.now() + Math.random(), seat, name, account, password: password || "123" }]);
               }
               count++;
             }
          }
        }
        if (count > 0) alert(`成功匯入 ${count} 筆學生資料！`);
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleDownloadGradeTemplate = () => {
    const currentCategory = getCurrentExamCategory(teacherExamId);
    const BOM = "\uFEFF"; 
    let headers = currentCategory === 'regular' ? "座號,姓名,國文,英語,數學,自然,地理,歷史,公民" : "座號,姓名,國文,英語,數學,自然,社會";
    let example = currentCategory === 'regular' ? "6,王小明,80,85,90,88,85,82,88" : "6,王小明,A++,A,B++,A+,B";
    const csvContent = BOM + headers + "\n" + example;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); 
    link.href = url; 
    link.download = `${currentCategory==='regular'?'段考':'模考'}_成績匯入範本.csv`; 
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGradeUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const currentCategory = getCurrentExamCategory(teacherExamId);
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const lines = content.split(/\r\n|\n/);
        const updates = {};
        let count = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          // Check format based on category
          const seat = parseInt(parts[0].trim());
          const student = students.find(s => s.seat === seat);
          
          if (student) {
             const scores = {};
             if (currentCategory === 'regular' && parts.length >= 9) {
                scores.chi = Number(parts[2]); scores.eng = Number(parts[3]);
                scores.math = Number(parts[4]); scores.sci = Number(parts[5]);
                scores.geo = Number(parts[6]); scores.his = Number(parts[7]); scores.civ = Number(parts[8]);
             } else if (currentCategory === 'cap' && parts.length >= 7) {
                scores.chi = parts[2].trim().toUpperCase(); scores.eng = parts[3].trim().toUpperCase();
                scores.math = parts[4].trim().toUpperCase(); scores.sci = parts[5].trim().toUpperCase(); scores.soc = parts[6].trim().toUpperCase();
             }
             if (Object.keys(scores).length > 0) {
               updates[student.id] = { ...(gradesDB[teacherExamId]?.[student.id] || {}), ...scores };
               count++;
             }
          }
        }
        if (count > 0) {
           if(db && connectionStatus === 'connected') await setDoc(doc(db, "grades", teacherExamId), updates, { merge: true });
           else setGradesDB(prev => ({ ...prev, [teacherExamId]: { ...prev[teacherExamId], ...updates } }));
           alert(`成功匯入 ${count} 筆成績！`);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  // --- Statistics Logic ---
  const calculateExamStatistics = (examId, studentsData, gradesData) => {
    const category = getCurrentExamCategory(examId);
    const examGrades = gradesData[examId] || {};
    const subjects = category === 'regular' 
      ? ['chi', 'eng', 'math', 'sci', 'geo', 'his', 'civ', 'social', 'total'] 
      : ['chi', 'eng', 'math', 'sci', 'soc', 'total'];
    
    let sums = {};
    let counts = {};
    let passCounts = {};
    subjects.forEach(sub => { sums[sub] = 0; counts[sub] = 0; passCounts[sub] = 0; });

    studentsData.forEach(student => {
      const sGrades = examGrades[student.id];
      if (sGrades) {
        const stats = calculateStats(sGrades, category);
        const merged = { ...sGrades, ...stats };
        subjects.forEach(sub => {
          let val = merged[sub];
          if (typeof val === 'string' && CAP_POINTS[val] !== undefined) val = CAP_POINTS[val];
          const numVal = Number(val);
          if (!isNaN(numVal)) {
            sums[sub] += numVal;
            counts[sub]++;
            if (category === 'regular' && sub !== 'total' && numVal >= 60) passCounts[sub]++;
          }
        });
      }
    });

    let averages = {};
    let passRates = {};
    subjects.forEach(sub => {
      averages[sub] = counts[sub] > 0 ? (sums[sub] / counts[sub]).toFixed(1) : '-';
      passRates[sub] = counts[sub] > 0 ? Math.round((passCounts[sub] / counts[sub]) * 100) : '-';
    });

    return { averages, passRates, hasData: counts['total'] > 0 };
  };

  const teacherExamStats = useMemo(() => calculateExamStatistics(teacherExamId, students, gradesDB), [teacherExamId, students, gradesDB]);
  const allExamStats = useMemo(() => EXAM_OPTIONS.map(opt => ({ ...opt, ...calculateExamStatistics(opt.id, students, gradesDB) })).filter(e => e.hasData), [students, gradesDB]);

  const currentTeacherExamCategory = getCurrentExamCategory(teacherExamId);
  
  // --- Data Prep Hooks (Parent) ---
  const currentExamData = useMemo(() => {
    if (!currentUser || userRole !== 'parent') return null;
    const category = getCurrentExamCategory(parentExamId);
    const examGrades = gradesDB[parentExamId] || {};
    const myScores = examGrades[currentUser.id] || {}; 
    const stats = calculateStats(myScores, category);
    
    if(!Array.isArray(students)) return null;

    const allStudentStats = students.map(s => {
      const scores = examGrades[s.id];
      if (!scores) return null;
      return calculateStats(scores, category).total;
    }).filter(t => t !== null).sort((a, b) => b - a);
    
    const rank = allStudentStats.indexOf(stats.total) + 1;
    const avgTotal = allStudentStats.length > 0 ? (allStudentStats.reduce((a, b) => a + b, 0) / allStudentStats.length).toFixed(1) : 0;
    
    const examStats = calculateExamStatistics(parentExamId, students, gradesDB);

    return { 
      myScores: { ...myScores, ...stats }, 
      rank, 
      totalStudents: students.length, 
      avgTotal, 
      classAvgs: examStats.averages, 
      category 
    };
  }, [currentUser, parentExamId, gradesDB, students]);

  // 分數走勢
  const trendData = useMemo(() => {
    if (!currentUser || userRole !== 'parent') return [];
    const currentCat = getCurrentExamCategory(parentExamId);
    const availableExams = EXAM_OPTIONS.filter(opt => gradesDB[opt.id] && gradesDB[opt.id][currentUser.id] && opt.category === currentCat);
    return availableExams.map(opt => {
      const scores = gradesDB[opt.id][currentUser.id];
      const { total } = calculateStats(scores, opt.category);
      return { examLabel: opt.label, score: parseFloat(total) };
    });
  }, [currentUser, gradesDB, parentExamId]);

  // 排名走勢
  const rankTrendData = useMemo(() => {
    if (!currentUser || userRole !== 'parent') return [];
    const currentCat = getCurrentExamCategory(parentExamId);
    const availableExams = EXAM_OPTIONS.filter(opt => gradesDB[opt.id] && gradesDB[opt.id][currentUser.id] && opt.category === currentCat);
    
    return availableExams.map(opt => {
      const examGrades = gradesDB[opt.id] || {};
      const myStats = calculateStats(examGrades[currentUser.id], opt.category);
      const myTotal = myStats.total;

      const allTotals = students.map(s => {
        const sScores = examGrades[s.id];
        if (!sScores) return -1;
        return calculateStats(sScores, opt.category).total;
      }).sort((a, b) => b - a);

      const rank = allTotals.indexOf(myTotal) + 1;
      return { examLabel: opt.label, score: rank };
    });
  }, [currentUser, gradesDB, parentExamId, students]);

  const teacherTableData = useMemo(() => {
    if (userRole !== 'teacher') return [];
    const currentCategory = getCurrentExamCategory(teacherExamId);
    let data = students.map(s => {
      const scores = gradesDB[teacherExamId]?.[s.id] || {};
      const stats = calculateStats(scores, currentCategory);
      return { ...s, scores, ...stats };
    });
    const sortedForRank = [...data].sort((a, b) => b.total - a.total);
    const rankMap = {};
    sortedForRank.forEach((item, index) => { rankMap[item.id] = index + 1; });
    data = data.map(item => ({ ...item, rank: rankMap[item.id] }));
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aValue, bValue;
        if (['chi', 'eng', 'math', 'sci', 'geo', 'his', 'civ', 'soc'].includes(sortConfig.key)) {
           if (currentCategory === 'cap') { aValue = CAP_POINTS[a.scores[sortConfig.key]] || 0; bValue = CAP_POINTS[b.scores[sortConfig.key]] || 0; } 
           else { aValue = a.scores[sortConfig.key] || 0; bValue = b.scores[sortConfig.key] || 0; }
        } else { aValue = a[sortConfig.key]; bValue = b[sortConfig.key]; }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [students, gradesDB, teacherExamId, sortConfig, userRole]);


  // --- Render ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
          <style>{`vercel-live-feedback, #vercel-toolbar, vercel-toolbar, [data-testid="vercel-toolbar"], div[class*="vercel-toolbar"], [class*="vercel-toast"] { display: none !important; opacity: 0 !important; pointer-events: none !important; visibility: hidden !important; z-index: -9999 !important; width: 0 !important; height: 0 !important; overflow: hidden !important; }`}</style>
           <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full flex items-center ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
            <Database size={12} className="mr-1"/> {connectionStatus==='connected'?'雲端已連線':'演示模式'}
           </div>
           <div className="text-center mb-6"><h1 className="text-2xl font-bold text-gray-800">{teacherProfile.className} 成績查詢系統</h1></div>
           <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
             <button className={`flex-1 py-2 rounded-md ${userRole==='parent'?'bg-white shadow text-blue-600':'text-gray-500'}`} onClick={()=>setUserRole('parent')}>我是家長</button>
             <button className={`flex-1 py-2 rounded-md ${userRole==='teacher'?'bg-white shadow text-blue-600':'text-gray-500'}`} onClick={()=>setUserRole('teacher')}>我是老師</button>
           </div>
           <form onSubmit={(e) => { e.preventDefault(); handleLogin(userRole, e.target.account.value, e.target.password.value); }} className="space-y-4">
             <div><label className="text-sm text-gray-700">帳號 {userRole==='parent' && <span className="text-xs text-gray-400">(輸入學號)</span>}</label><input name="account" className="w-full border p-3 rounded-lg" placeholder="請輸入帳號"/></div>
             <div><label className="text-sm text-gray-700">密碼 {userRole==='parent' && <span className="text-xs text-gray-400">(身分證後4碼)</span>}</label><input name="password" type="password" className="w-full border p-3 rounded-lg" placeholder="請輸入密碼"/></div>
             <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">登入</button>
           </form>
           {/* 在模擬模式或資料庫為空時顯示初始化按鈕 */}
           {(connectionStatus === 'demo' || (connectionStatus === 'connected' && students.length === 0 && students !== MOCK_STUDENTS)) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
               <button onClick={initializeDatabase} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center"><Database size={16} className="mr-2"/> 初始化測試資料 (寫入 Firebase)</button>
            </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <span className="font-bold text-lg">{teacherProfile.className} 智慧校園</span>
        <button onClick={() => setShowMenu(!showMenu)}><Menu/></button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${showMenu ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform w-64 bg-white shadow-lg z-40 flex flex-col print:hidden`}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-blue-600">{teacherProfile.className} 智慧校園</h2>
          <p className="text-sm text-gray-500 mt-1">你好，{currentUser.name} {userRole === 'teacher' ? '老師' : ''}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {userRole === 'teacher' ? (
            <>
              <button onClick={() => handleNavClick('dashboard')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Monitor size={20}/><span>教師控制台</span></button>
              <button onClick={() => handleNavClick('stats')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'stats' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><LineChart size={20}/><span>班級各次段考平均</span></button>
              <button onClick={() => handleNavClick('students')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'students' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Users size={20}/><span>學生資料管理</span></button>
              <button onClick={() => handleNavClick('grades')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'grades' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Edit size={20}/><span>成績登錄管理</span></button>
              <button onClick={() => handleNavClick('settings')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Settings size={20}/><span>班級設定</span></button>
            </>
          ) : (
            <>
              <button onClick={() => handleNavClick('dashboard')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><TrendingUp size={20}/><span>成績分析總覽</span></button>
              <button onClick={() => handleNavClick('stats')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'stats' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><LineChart size={20}/><span>班級各次段考平均</span></button>
            </>
          )}
        </nav>
        <div className="p-4 border-t"><button onClick={() => setIsLoggedIn(false)} className="flex items-center space-x-3 text-red-500 p-2"><LogOut size={20}/><span>登出</span></button></div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen print:h-auto print:overflow-visible">
        
        {/* ================= NEW: CLASS STATISTICS TAB (TEACHER & PARENT) ================= */}
        {activeTab === 'stats' && (
          <div className="w-full space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <LineChart className="mr-2 text-blue-600"/> 
              班級各次段考平均與統計
            </h2>
            {/* 只有表格，沒有走勢圖 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">各次考試詳細平均數據</div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="p-3 w-32">考試名稱</th>
                        <th className="p-3 text-center">國文</th>
                        <th className="p-3 text-center">英語</th>
                        <th className="p-3 text-center">數學</th>
                        <th className="p-3 text-center">自然</th>
                        <th className="p-3 text-center">社會/社均</th>
                        <th className="p-3 text-center font-bold text-blue-700">總分/積分</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {allExamStats.map(stat => (
                         <tr key={stat.id} className="hover:bg-gray-50">
                           <td className="p-3 font-medium text-gray-800">{stat.label} <span className="text-xs text-gray-400 block">{stat.category==='cap'?'會考制':'段考'}</span></td>
                           {['chi','eng','math','sci'].map(sub => (
                             <td key={sub} className="p-3 text-center">
                               <div>{stat.averages[sub]}</div>
                               {stat.category === 'regular' && <div className="text-xs text-green-600">({stat.passRates[sub]}%)</div>}
                             </td>
                           ))}
                           <td className="p-3 text-center">{stat.averages[stat.category==='regular'?'social':'soc']}</td>
                           <td className="p-3 text-center font-bold text-blue-700">{stat.averages.total}</td>
                         </tr>
                       ))}
                       {allExamStats.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">目前尚無任何考試資料</td></tr>}
                    </tbody>
                 </table>
               </div>
               <div className="p-3 bg-gray-50 text-xs text-gray-500 text-center">
                 括號內數字為該科及格率 (%)，僅適用於百分制段考。
               </div>
            </div>
          </div>
        )}

        {/* ... (Settings, Students tabs - omitted for brevity, using same components) ... */}
        {userRole === 'teacher' && activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Settings className="mr-2 text-blue-600"/> 班級與導師設定</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">班級名稱</label><input name="className" defaultValue={teacherProfile.className} className="w-full border border-gray-300 rounded-lg p-3"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">導師姓名</label><input name="name" defaultValue={teacherProfile.name} className="w-full border border-gray-300 rounded-lg p-3"/></div>
                <div className="pt-4 border-t border-gray-100"><button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center"><Save className="mr-2" size={20}/> 儲存設定</button></div>
              </form>
            </div>
          </div>
        )}
        
        {userRole === 'teacher' && activeTab === 'students' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Users className="mr-2 text-blue-600"/> 學生資料與帳號管理</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="font-bold text-gray-700">學生列表 ({students.length}人)</span>
                <div className="flex gap-2">
                   <button onClick={handleDownloadStudentTemplate} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm flex items-center hover:bg-gray-200"><Download size={16} className="mr-1"/> 下載範本</button>
                   <label className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm flex items-center hover:bg-blue-200 cursor-pointer"><Upload size={16} className="mr-1"/> 批次匯入<input type="file" accept=".csv" className="hidden" onChange={handleStudentUpload} /></label>
                   <button onClick={() => { setEditingStudentId('new'); setTempStudentData({ seat: '', name: '', account: '', password: '' }); }} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center hover:bg-green-700"><Plus size={16} className="mr-1"/> 新增學生</button>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm"><tr><th className="p-4">座號</th><th className="p-4">姓名</th><th className="p-4">帳號</th><th className="p-4">密碼</th><th className="p-4 text-center">操作</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {editingStudentId === 'new' && (
                    <tr className="bg-green-50">
                      <td className="p-4"><input className="w-16 border rounded p-1" value={tempStudentData.seat} onChange={e => setTempStudentData({...tempStudentData, seat: Number(e.target.value)})}/></td>
                      <td className="p-4"><input className="w-32 border rounded p-1" value={tempStudentData.name} onChange={e => setTempStudentData({...tempStudentData, name: e.target.value})}/></td>
                      <td className="p-4"><input className="w-32 border rounded p-1" value={tempStudentData.account} onChange={e => setTempStudentData({...tempStudentData, account: e.target.value})}/></td>
                      <td className="p-4"><input className="w-32 border rounded p-1" value={tempStudentData.password} onChange={e => setTempStudentData({...tempStudentData, password: e.target.value})}/></td>
                      <td className="p-4 text-center"><button onClick={handleUpdateStudent} className="text-green-600 mr-2"><Save size={18}/></button></td>
                    </tr>
                  )}
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50">
                       <td className="p-4">{student.seat}</td>
                       <td className="p-4 font-bold text-gray-700">{student.name}</td>
                       <td className="p-4 text-gray-500">{student.account}</td>
                       <td className="p-4 font-mono text-gray-400">••••••</td>
                       <td className="p-4 text-center"><button onClick={() => { setEditingStudentId(student.id); setTempStudentData(student); }} className="text-blue-500 hover:text-blue-700"><Edit size={18}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TEACHER: GRADE MANAGEMENT ================= */}
        {userRole === 'teacher' && activeTab === 'grades' && (
          <div className="w-full space-y-4">
            {/* Same Grade Management Logic ... */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
               <div className="flex items-center space-x-4 w-full md:w-auto">
                 <div className="p-2 bg-blue-100 rounded-lg"><BookOpen className="text-blue-600"/></div>
                 <div className="w-full">
                   <label className="block text-xs text-gray-500 font-bold mb-1">選擇考試場次</label>
                   <select className="w-full md:w-64 border border-gray-300 rounded-lg p-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={teacherExamId} onChange={(e) => setTeacherExamId(e.target.value)}>
                     {EXAM_GROUPS.map(group => (<optgroup label={group.label} key={group.label}>{group.options.map(opt => (<option key={opt.id} value={opt.id}>{opt.label.split(' ').pop()} {opt.category === 'cap' ? '(積分)' : ''}</option>))}</optgroup>))}
                   </select>
                 </div>
               </div>
               <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                 <button onClick={handleDownloadGradeTemplate} className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200"><FileSpreadsheet size={16}/><span>下載範本</span></button>
                 <label className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 cursor-pointer"><Upload size={16}/><span>批次匯入</span><input type="file" accept=".csv" className="hidden" onChange={handleGradeUpload} /></label>
                 <button onClick={() => window.print()} className="flex items-center space-x-1 bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700"><Printer size={16}/><span>列印</span></button>
               </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-none">
              <div className="hidden print:block text-center p-4">
                 <h1 className="text-2xl font-bold">{EXAM_OPTIONS.find(e => e.id === teacherExamId)?.label} 成績一覽表</h1>
                 <p className="text-gray-600">{teacherProfile.className} | 導師: {teacherProfile.name}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-sm print:bg-gray-200">
                    <tr>
                      <SortableHeader label="座號" sortKey="seat" className="text-center w-16" sortConfig={sortConfig} onSort={handleSort}/>
                      <SortableHeader label="姓名" sortKey="name" className="w-24" sortConfig={sortConfig} onSort={handleSort}/>
                      <SortableHeader label="國文" sortKey="chi" className="text-center" sortConfig={sortConfig} onSort={handleSort}/>
                      <SortableHeader label="英語" sortKey="eng" className="text-center" sortConfig={sortConfig} onSort={handleSort}/>
                      <SortableHeader label="數學" sortKey="math" className="text-center" sortConfig={sortConfig} onSort={handleSort}/>
                      <SortableHeader label="自然" sortKey="sci" className="text-center" sortConfig={sortConfig} onSort={handleSort}/>
                      {currentTeacherExamCategory === 'regular' ? (
                        <>
                          <SortableHeader label="地理" sortKey="geo" className="text-center bg-yellow-50/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="歷史" sortKey="his" className="text-center bg-yellow-50/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="公民" sortKey="civ" className="text-center bg-yellow-50/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="社均" sortKey="social" className="text-center font-bold text-yellow-800 bg-yellow-100/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="總分" sortKey="total" className="text-center font-bold text-blue-800 bg-blue-50" sortConfig={sortConfig} onSort={handleSort}/>
                        </>
                      ) : (
                        <>
                          <SortableHeader label="社會" sortKey="soc" className="text-center bg-yellow-50/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="積分" sortKey="total" className="text-center font-bold text-blue-800 bg-blue-50" sortConfig={sortConfig} onSort={handleSort}/>
                        </>
                      )}
                      <SortableHeader label="排名" sortKey="rank" className="text-center font-bold text-red-600" sortConfig={sortConfig} onSort={handleSort}/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teacherTableData.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="p-3 text-center text-gray-600">{student.seat}</td>
                        <td className="p-3 font-medium text-gray-800">{student.name}</td>
                        {(currentTeacherExamCategory === 'regular' ? ['chi', 'eng', 'math', 'sci', 'geo', 'his', 'civ'] : ['chi', 'eng', 'math', 'sci', 'soc']).map(sub => (
                          <td key={sub} className="p-1">
                            {currentTeacherExamCategory === 'regular' ? (
                                <input type="number" className="w-full text-center p-1 border border-transparent hover:border-blue-300 focus:border-blue-500 rounded bg-transparent focus:bg-white" value={student.scores[sub] || ''} placeholder="-" onChange={(e) => handleGradeChange(student.id, sub, e.target.value)} />
                            ) : (
                                <select className="w-full text-center p-1 border border-transparent hover:border-blue-300 focus:border-blue-500 rounded bg-transparent focus:bg-white appearance-none cursor-pointer" value={student.scores[sub] || ''} onChange={(e) => handleGradeChange(student.id, sub, e.target.value)} >
                                  <option value="">-</option>
                                  {CAP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            )}
                          </td>
                        ))}
                        {currentTeacherExamCategory === 'regular' ? (
                           <>
                             <td className="p-3 text-center font-bold text-yellow-700 bg-yellow-50/30">{student.social}</td>
                             <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/30">{student.total}</td>
                           </>
                        ) : (
                           <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/30">{student.total}</td>
                        )}
                        <td className="p-3 text-center font-bold text-red-600">#{student.rank}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* NEW: Table Footer for Averages */}
                  <tfoot className="bg-gray-100 font-bold text-gray-700 border-t-2 border-gray-200">
                     <tr>
                        <td colSpan="2" className="p-3 text-center">班級平均</td>
                        {currentTeacherExamCategory === 'regular' ? (
                          <>
                            {['chi','eng','math','sci','geo','his','civ','social','total'].map(sub => (
                              <td key={sub} className="p-3 text-center">{teacherExamStats.averages[sub]}</td>
                            ))}
                            <td></td>
                          </>
                        ) : (
                          <>
                            {['chi','eng','math','sci','soc','total'].map(sub => (
                              <td key={sub} className="p-3 text-center">{teacherExamStats.averages[sub]}</td>
                            ))}
                            <td></td>
                          </>
                        )}
                     </tr>
                     {currentTeacherExamCategory === 'regular' && (
                       <tr className="bg-green-50 text-green-800 text-xs">
                          <td colSpan="2" className="p-2 text-center">及格率 (%)</td>
                          {['chi','eng','math','sci','geo','his','civ'].map(sub => (
                              <td key={sub} className="p-2 text-center">{teacherExamStats.passRates[sub]}%</td>
                          ))}
                          <td colSpan="3"></td>
                       </tr>
                     )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= PARENT: DASHBOARD ================= */}
        {userRole === 'parent' && activeTab === 'dashboard' && currentExamData && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">成績分析總覽</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                 <Calendar className="text-blue-600"/>
                 <select value={parentExamId} onChange={(e) => setParentExamId(e.target.value)} className="bg-transparent font-bold text-gray-700 focus:outline-none cursor-pointer">
                   {EXAM_GROUPS.map(group => (
                        <optgroup label={group.label} key={group.label}>
                          {group.options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label.split(' ').pop()} {opt.category === 'cap' ? '(模考)' : '(段考)'}
                            </option>
                          ))}
                        </optgroup>
                   ))}
                 </select>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-blue-100 text-sm">{currentExamData.category === 'regular' ? '本次總分' : '會考總積分'}</p>
                    <h3 className="text-5xl font-bold mt-2">{currentExamData.myScores.total}</h3>
                    <div className="mt-4 flex items-baseline space-x-2">
                      <span className="bg-white/20 px-3 py-1 rounded-lg text-2xl font-bold">班排 #{currentExamData.rank}</span>
                      <span className="text-sm text-blue-100">/ {currentExamData.totalStudents} 人</span>
                    </div>
                  </div>
                  <TrendingUp className="absolute right-0 bottom-0 text-white opacity-10 w-32 h-32 -mb-4 -mr-4" />
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-gray-500 text-sm font-bold mb-2">班級統計比較</h4>
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-gray-600 text-sm">班級平均</span>
                       <span className="font-bold text-gray-800 text-2xl">{currentExamData.avgTotal}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-4">
                       <span className="text-gray-600 text-sm">與平均差距</span>
                       <span className={`font-bold text-xl ${currentExamData.myScores.total >= currentExamData.avgTotal ? 'text-green-500' : 'text-red-500'}`}>
                         {currentExamData.myScores.total >= currentExamData.avgTotal ? '+' : ''}
                         {(currentExamData.myScores.total - currentExamData.avgTotal).toFixed(1)}
                       </span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Charts: Score Trend & Rank Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <TrendChart data={trendData} title={currentExamData.category==='regular' ? "我的段考總分走勢" : "我的模考積分走勢"} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <TrendChart data={rankTrendData} title="我的班排走勢" reverse={true} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-blue-600"/> 科目強弱分析</h3>
                  <div className="space-y-4">
                    {(currentExamData.category === 'regular' ? ['chi', 'eng', 'math', 'sci', 'geo', 'his', 'civ'] : ['chi', 'eng', 'math', 'sci', 'soc']).map(subKey => {
                        const labels = { chi: '國文', eng: '英語', math: '數學', sci: '自然', geo: '地理', his: '歷史', civ: '公民', soc: '社會' };
                        return (<ComparisonBar key={subKey} subject={labels[subKey]} myScore={currentExamData.myScores[subKey] || (currentExamData.category === 'cap' ? 'C' : 0)} avgScore={currentExamData.classAvgs[subKey] || 0} maxScore={currentExamData.category === 'regular' ? 100 : 7} isCap={currentExamData.category === 'cap'} />);
                     })}
                  </div>
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                 <h3 className="font-bold text-gray-800 mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-blue-600"/> 成績明細表</h3>
                 <table className="w-full text-sm">
                   <thead className="bg-gray-50 text-gray-500"><tr><th className="p-3 text-left">科目</th><th className="p-3 text-center">成績</th></tr></thead>
                   <tbody className="divide-y divide-gray-100">
                      {(currentExamData.category === 'regular' ? [{l:'國文',k:'chi'}, {l:'英語',k:'eng'}, {l:'數學',k:'math'}, {l:'自然',k:'sci'}, {l:'地理',k:'geo'}, {l:'歷史',k:'his'}, {l:'公民',k:'civ'}, {l:'社會平均', k:'social'}] : [{l:'國文',k:'chi'}, {l:'英語',k:'eng'}, {l:'數學',k:'math'}, {l:'自然',k:'sci'}, {l:'社會',k:'soc'}]).map(sub => (
                        <tr key={sub.k}>
                          <td className="p-3 font-medium">{sub.l}</td>
                          <td className="p-3 text-center font-bold text-blue-600">{currentExamData.myScores[sub.k] || '-'}</td>
                        </tr>
                      ))}
                   </tbody>
                   <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td className="p-3 font-bold text-gray-600">班級平均</td>
                        <td className="p-3 text-center font-bold text-gray-600">{currentExamData.avgTotal}</td>
                      </tr>
                   </tfoot>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* ================= CONSOLE DASHBOARD ================= */}
        {userRole === 'teacher' && activeTab === 'dashboard' && (
          <div className="flex flex-col h-full space-y-6">
             <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">{teacherProfile.className} 班級管理</h1>
                <div className="text-sm">學生人數: {students.length}</div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button onClick={() => handleNavClick('stats')} className="p-6 bg-white shadow-sm border border-gray-100 rounded-xl hover:shadow-md transition-all text-left">
                 <div className="flex items-center space-x-4 mb-2"><div className="p-3 bg-purple-50 rounded-lg"><LineChart className="w-8 h-8 text-purple-600"/></div><h3 className="font-bold text-gray-800 text-lg">班級各次段考平均</h3></div><p className="text-sm text-gray-500">查看班級歷史成績統計分析。</p>
               </button>
               <button onClick={() => handleNavClick('grades')} className="p-6 bg-white shadow-sm border border-gray-100 rounded-xl hover:shadow-md transition-all text-left">
                 <div className="flex items-center space-x-4 mb-2"><div className="p-3 bg-green-50 rounded-lg"><Edit className="w-8 h-8 text-green-600"/></div><h3 className="font-bold text-gray-800 text-lg">成績登錄管理</h3></div><p className="text-sm text-gray-500">輸入成績並檢視單次考試排名。</p>
               </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}