import React, { useState, useEffect, useMemo } from 'react';
// --- 標準 Firebase 引入方式 ---
// 確保 package.json 中已有 "firebase"
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";

import { 
  BookOpen, Calendar, ChevronRight, LogOut, Menu, MessageSquare, 
  Bell, FileText, User, TrendingUp, X, Users, CheckCircle, 
  XCircle, Edit, Printer, Save, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Trash2, Key, BarChart2, Search, Download, Upload,
  School, Monitor, FileSpreadsheet, Settings, Database, AlertCircle, CloudOff
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
  // 只有當 apiKey 有值時才連線，否則使用單機模式
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
    console.log("未偵測到 Firebase Config，將啟動演示模式 (Demo Mode)");
  }
} catch (error) {
  console.error("Firebase 初始化失敗:", error);
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
  
  let options = [];
  grades.forEach((g, gIdx) => {
    semesters.forEach((s, sIdx) => {
      regularExams.forEach((e, eIdx) => {
        options.push({ id: `${gIdx+7}-${sIdx+1}-reg-${eIdx}`, label: `${g} ${s} ${e}`, category: 'regular' });
      });
      reviewExams.forEach((e, eIdx) => {
        options.push({ id: `${gIdx+7}-${sIdx+1}-rev-${eIdx}`, label: `${g} ${s} ${e}`, category: 'cap' });
      });
      if (g === '九年級') {
        mockExams.forEach((m, mIdx) => {
           options.push({ id: `9-${sIdx+1}-mock-${mIdx}`, label: `${g} ${s} ${m}`, category: 'cap' });
        });
      }
    });
  });
  return options;
};
const EXAM_OPTIONS = generateExamOptions();

// --- Helper Components ---
const SortableHeader = ({ label, sortKey, className = "", sortConfig, onSort }) => (
  <th 
    className={`p-3 cursor-pointer hover:bg-gray-200 select-none transition-colors ${className}`}
    onClick={() => onSort(sortKey)}
  >
    <div className="flex items-center justify-center space-x-1">
      <span>{label}</span>
      {sortConfig.key === sortKey ? (
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

const TrendChart = ({ data, title }) => {
  if (!data || data.length === 0) return <div className="text-gray-400 text-sm">尚無足夠數據繪製趨勢圖</div>;
  const scores = data.map(d => d.score);
  const maxVal = Math.max(...scores);
  const isRegularTotal = maxVal > 35; 
  const height = 150;
  const width = 300;
  const padding = 20;
  const maxScore = isRegularTotal ? 500 : 35;
  const minScore = 0;
  const getX = (index) => padding + (index * ((width - padding * 2) / (data.length - 1 || 1)));
  const getY = (score) => height - padding - ((score - minScore) / (maxScore - minScore)) * (height - padding * 2);
  const points = data.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <h4 className="text-sm font-bold text-gray-600 mb-2">{title}</h4>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-white rounded-lg border border-gray-100">
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
           <line key={r} x1={padding} y1={height - padding - r*(height-2*padding)} x2={width-padding} y2={height - padding - r*(height-2*padding)} stroke="#eee" strokeWidth="1" />
        ))}
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.score)} r="4" fill="#2563eb" />
            <text x={getX(i)} y={getY(d.score) - 8} textAnchor="middle" fontSize="10" fill="#666">{d.score}</text>
            <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="8" fill="#999">{d.examLabel.split(' ').pop()}</text>
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
  // 這裡使用安全的初始化方式，避免 db 未定義時報錯
  const [students, setStudents] = useState(db ? [] : MOCK_STUDENTS);
  const [gradesDB, setGradesDB] = useState(db ? {} : MOCK_GRADES);
  const [teacherProfile, setTeacherProfile] = useState(DEFAULT_TEACHER);
  const [connectionStatus, setConnectionStatus] = useState(db ? "connecting" : "demo"); 
  
  // UI States
  const [teacherExamId, setTeacherExamId] = useState(EXAM_OPTIONS[0].id);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [tempStudentData, setTempStudentData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'seat', direction: 'asc' });
  const [parentExamId, setParentExamId] = useState("7-1-reg-0"); 

  // --- Sync Effects ---
  
  useEffect(() => {
    // 只有當 db 存在 (已輸入 Config 且初始化成功) 才執行監聽
    if (db) {
      setConnectionStatus("connecting");
      try {
        const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
          const studentList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          studentList.sort((a, b) => a.seat - b.seat);
          setStudents(studentList);
          setConnectionStatus("connected");
        }, (err) => {
          console.error("Firebase 連線錯誤:", err);
          setConnectionStatus("error");
        });
        return () => unsub();
      } catch (e) {
        console.warn("Snapshot failed", e);
        setConnectionStatus("error");
      }
    } else {
      setConnectionStatus("demo");
    }
  }, []);

  useEffect(() => {
    if (db) {
      try {
        const unsub = onSnapshot(collection(db, "grades"), (snapshot) => {
          const gradesData = {};
          snapshot.docs.forEach(doc => { gradesData[doc.id] = doc.data(); });
          setGradesDB(gradesData);
        });
        return () => unsub();
      } catch (e) {}
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

  // --- Initial Seeding ---
  const initializeDatabase = async () => {
    if (!db) {
        alert("目前處於單機演示模式，無法寫入資料庫。\n請先在程式碼中填入 Firebase Config");
        return;
    }
    if(!confirm("確定要寫入測試資料嗎？這將會新增範例學生與成績到您的 Firebase。")) return;
    
    try {
      await setDoc(doc(db, "meta", "teacherProfile"), DEFAULT_TEACHER);
      for (const s of MOCK_STUDENTS) {
        await setDoc(doc(db, "students", s.id), s);
      }
      for (const [examId, grades] of Object.entries(MOCK_GRADES)) {
        await setDoc(doc(db, "grades", examId), grades);
      }
      alert("資料庫初始化成功！");
    } catch (error) {
      console.error(error);
      alert("寫入失敗。請檢查您的 Firebase Console 權限設定 (Security Rules) 是否為 Test Mode。");
    }
  };

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

  const handleLogin = (role, account, password) => {
    if (role === 'teacher') {
      // 允許預設帳密 (在單機模式或空資料庫時)
      const isDefaultLogin = (connectionStatus === 'demo' || students.length === 0) && account === DEFAULT_TEACHER.account && password === DEFAULT_TEACHER.password;
      
      if (isDefaultLogin || (account === teacherProfile.account && password === teacherProfile.password)) {
        setUserRole('teacher');
        setCurrentUser(isDefaultLogin ? DEFAULT_TEACHER : teacherProfile);
        setIsLoggedIn(true);
        setActiveTab('dashboard');
      } else {
        alert("教師帳號或密碼錯誤 (預設 t888 / 888)");
      }
    } else {
      const student = students.find(s => s.account === account && s.password === password);
      if (student) {
        setUserRole('parent');
        setCurrentUser(student);
        setIsLoggedIn(true);
        setActiveTab('dashboard');
        const lastExamId = Object.keys(gradesDB).reverse().find(eid => gradesDB[eid] && gradesDB[eid][student.id]);
        if (lastExamId) setParentExamId(lastExamId);
      } else {
        alert("學生帳號或密碼錯誤 (範例 s11204 / 123)");
      }
    }
  };

  // --- Teacher Actions ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProfile = { ...teacherProfile, className: formData.get('className'), name: formData.get('name') };
    if(db) await setDoc(doc(db, "meta", "teacherProfile"), newProfile);
    else setTeacherProfile(newProfile); // Demo mode update
    alert("班級資訊已更新！");
  };

  const handleUpdateStudent = async () => {
    if(db) {
        if (editingStudentId === 'new') {
          const newStudentRef = doc(collection(db, "students")); 
          await setDoc(newStudentRef, { ...tempStudentData, id: newStudentRef.id });
        } else {
          await updateDoc(doc(db, "students", editingStudentId), tempStudentData);
        }
    } else {
        // Demo mode update logic
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
      if(db) await deleteDoc(doc(db, "students", id));
      else setStudents(students.filter(s => s.id !== id));
    }
  };

  const handleGradeChange = async (studentId, subject, value) => {
    const currentCategory = getCurrentExamCategory(teacherExamId);
    let finalValue = value;
    if (currentCategory === 'regular') finalValue = Number(value);
    
    if(db) {
        const examRef = doc(db, "grades", teacherExamId);
        await setDoc(examRef, {
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

  // CSV handlers (simplified)
  const handleDownloadStudentTemplate = () => {
    const BOM = "\uFEFF"; const headers = "座號,姓名,帳號,密碼";
    const csvContent = BOM + headers + "\n6,範例王小明,s11206,123456\n7,範例林小美,s11207,123456";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "學生資料匯入範本.csv"; link.click();
  };
  
  const handleStudentUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const lines = content.split(/\r\n|\n/);
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 4) {
             const seat = parseInt(parts[0].trim());
             const name = parts[1].trim();
             const account = parts[2].trim();
             const password = parts[3].trim(); 
             if (!isNaN(seat) && name && account) {
               if(db) {
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
    const link = document.createElement("a"); link.href = url; link.download = `${currentCategory==='regular'?'段考':'模考'}_成績匯入範本.csv`; link.click();
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
           if(db) await setDoc(doc(db, "grades", teacherExamId), updates, { merge: true });
           else setGradesDB(prev => ({ ...prev, [teacherExamId]: { ...prev[teacherExamId], ...updates } }));
           alert(`成功匯入 ${count} 筆成績！`);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  // --- Data Prep Hooks ---
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
    const subjects = category === 'regular' ? ['chi', 'eng', 'math', 'sci', 'geo', 'his', 'civ'] : ['chi', 'eng', 'math', 'sci', 'soc'];
    const classAvgs = {};
    subjects.forEach(sub => {
       const sum = students.reduce((acc, s) => {
         const score = examGrades[s.id]?.[sub];
         let val = 0;
         if (category === 'cap') { val = CAP_POINTS[score] || 0; } else { val = Number(score) || 0; }
         return acc + val;
       }, 0);
       classAvgs[sub] = (sum / (students.length || 1)).toFixed(1);
    });
    return { myScores: { ...myScores, ...stats }, rank, totalStudents: students.length, avgTotal, classAvgs, category };
  }, [currentUser, parentExamId, gradesDB, students]);

  const trendData = useMemo(() => {
    if (!currentUser || userRole !== 'parent') return [];
    const currentCat = getCurrentExamCategory(parentExamId);
    const availableExams = EXAM_OPTIONS.filter(opt => gradesDB[opt.id] && gradesDB[opt.id][currentUser.id] && opt.category === currentCat);
    return availableExams.map(opt => {
      const scores = gradesDB[opt.id][currentUser.id];
      const { total } = calculateStats(scores, opt.category);
      const val = total;
      return { examLabel: opt.label, score: parseFloat(val) };
    });
  }, [currentUser, gradesDB, parentExamId]);

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
          <div className={`absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded-full flex items-center ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-600' : 
            connectionStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {connectionStatus === 'connected' ? <Database size={12} className="mr-1"/> : <CloudOff size={12} className="mr-1"/>}
            {connectionStatus === 'connected' ? '雲端已連線' : 
             connectionStatus === 'error' ? '連線錯誤 (請檢查Config)' : '演示模式 (單機)'}
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">{teacherProfile.className} 成績查詢系統</h1>
            <p className="text-gray-500">親師互動平台</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button className={`flex-1 py-2 rounded-md transition-all ${userRole === 'parent' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`} onClick={() => setUserRole('parent')}>我是家長</button>
            <button className={`flex-1 py-2 rounded-md transition-all ${userRole === 'teacher' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`} onClick={() => setUserRole('teacher')}>我是老師</button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(userRole, e.target.account.value, e.target.password.value); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">帳號</label>
              <input name="account" className="w-full border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="請輸入您的帳號" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">密碼</label>
              <input name="password" type="password" className="w-full border rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="請輸入您的密碼" />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg">登入</button>
          </form>

          {connectionStatus === 'connected' && students.length === 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-3 text-xs text-orange-700 flex items-start">
                <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0"/>
                <div><p className="font-bold">資料庫目前是空的</p><p>請點擊下方按鈕初始化測試資料。</p></div>
              </div>
              <button onClick={initializeDatabase} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center">
                <Database size={16} className="mr-2"/> 初始化測試資料 (寫入 Firebase)
              </button>
            </div>
          )}
          
          {connectionStatus === 'demo' && (
             <div className="mt-4 text-xs text-gray-400 text-center">
               <p>目前為無資料庫預覽模式，資料重整後會消失。</p>
               <p>若要上線，請在 StackBlitz 執行 <code>npm install firebase</code> 並設定 Config。</p>
             </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main Layout ---
  const currentTeacherExamCategory = getCurrentExamCategory(teacherExamId); // 修正：在 return 之前定義此變數

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-blue-600 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <span className="font-bold text-lg">{teacherProfile.className} 智慧校園</span>
        <button onClick={() => setShowMenu(!showMenu)}><Menu/></button>
      </div>

      <div className={`fixed inset-y-0 left-0 transform ${showMenu ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform w-64 bg-white shadow-lg z-40 flex flex-col print:hidden`}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-blue-600">{teacherProfile.className} 智慧校園</h2>
          <p className="text-sm text-gray-500 mt-1">你好，{currentUser.name} {userRole === 'teacher' ? '老師' : ''}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {userRole === 'teacher' ? (
            <>
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Monitor size={20}/><span>教師控制台</span></button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Settings size={20}/><span>班級設定</span></button>
              <button onClick={() => setActiveTab('students')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'students' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Users size={20}/><span>學生資料管理</span></button>
              <button onClick={() => setActiveTab('grades')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'grades' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><Edit size={20}/><span>成績登錄管理</span></button>
            </>
          ) : (
            <>
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}><TrendingUp size={20}/><span>成績分析總覽</span></button>
            </>
          )}
        </nav>
        <div className="p-4 border-t"><button onClick={() => setIsLoggedIn(false)} className="flex items-center space-x-3 text-red-500 p-2"><LogOut size={20}/><span>登出</span></button></div>
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen print:h-auto print:overflow-visible">
        
        {/* ================= TEACHER: SETTINGS ================= */}
        {userRole === 'teacher' && activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center"><Settings className="mr-2 text-blue-600"/> 班級與導師設定</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">班級名稱</label><input name="className" defaultValue={teacherProfile.className} className="w-full border border-gray-300 rounded-lg p-3" placeholder="例如：二年2班"/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">導師姓名</label><input name="name" defaultValue={teacherProfile.name} className="w-full border border-gray-300 rounded-lg p-3" placeholder="請輸入導師姓名"/></div>
                <div className="pt-4 border-t border-gray-100"><button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center"><Save className="mr-2" size={20}/> 儲存設定</button></div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TEACHER: STUDENT MANAGEMENT ================= */}
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
                      <td className="p-4"><input className="w-16 border rounded p-1" placeholder="座號" value={tempStudentData.seat} onChange={e => setTempStudentData({...tempStudentData, seat: Number(e.target.value)})}/></td>
                      <td className="p-4"><input className="w-32 border rounded p-1" placeholder="姓名" value={tempStudentData.name} onChange={e => setTempStudentData({...tempStudentData, name: e.target.value})}/></td>
                      <td className="p-4"><input className="w-32 border rounded p-1" placeholder="帳號" value={tempStudentData.account} onChange={e => setTempStudentData({...tempStudentData, account: e.target.value})}/></td>
                      <td className="p-4"><input className="w-32 border rounded p-1" placeholder="密碼" value={tempStudentData.password} onChange={e => setTempStudentData({...tempStudentData, password: e.target.value})}/></td>
                      <td className="p-4 text-center"><button onClick={handleUpdateStudent} className="text-green-600 mr-2"><Save size={18}/></button><button onClick={() => setEditingStudentId(null)} className="text-gray-500"><XCircle size={18}/></button></td>
                    </tr>
                  )}
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      {editingStudentId === student.id ? (
                        <>
                          <td className="p-4"><input className="w-16 border rounded p-1" value={tempStudentData.seat} onChange={e => setTempStudentData({...tempStudentData, seat: Number(e.target.value)})}/></td>
                          <td className="p-4"><input className="w-32 border rounded p-1" value={tempStudentData.name} onChange={e => setTempStudentData({...tempStudentData, name: e.target.value})}/></td>
                          <td className="p-4"><input className="w-32 border rounded p-1" value={tempStudentData.account} onChange={e => setTempStudentData({...tempStudentData, account: e.target.value})}/></td>
                          <td className="p-4"><input className="w-32 border rounded p-1" value={tempStudentData.password} onChange={e => setTempStudentData({...tempStudentData, password: e.target.value})}/></td>
                          <td className="p-4 text-center"><button onClick={handleUpdateStudent} className="text-green-600 mr-2"><Save size={18}/></button><button onClick={() => setEditingStudentId(null)} className="text-gray-500"><XCircle size={18}/></button></td>
                        </>
                      ) : (
                        <>
                          <td className="p-4">{student.seat}</td>
                          <td className="p-4 font-bold text-gray-700">{student.name}</td>
                          <td className="p-4 text-gray-500">{student.account}</td>
                          <td className="p-4 font-mono text-gray-400">••••••</td>
                          <td className="p-4 text-center flex justify-center space-x-3"><button onClick={() => { setEditingStudentId(student.id); setTempStudentData(student); }} className="text-blue-500 hover:text-blue-700"><Edit size={18}/></button><button onClick={() => handleDeleteStudent(student.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {userRole === 'teacher' && activeTab === 'grades' && (
          <div className="w-full space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
               <div className="flex items-center space-x-4 w-full md:w-auto">
                 <div className="p-2 bg-blue-100 rounded-lg"><BookOpen className="text-blue-600"/></div>
                 <div className="w-full">
                   <label className="block text-xs text-gray-500 font-bold mb-1">選擇考試場次</label>
                   <select className="w-full md:w-64 border border-gray-300 rounded-lg p-2 font-bold text-gray-700 focus:ring-2 focus:ring-blue-500" value={teacherExamId} onChange={(e) => setTeacherExamId(e.target.value)}>
                     {EXAM_OPTIONS.map(opt => (<option key={opt.id} value={opt.id}>{opt.label} {opt.category === 'cap' ? '(積分制)' : '(百分制)'}</option>))}
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
                 <p className="text-sm text-gray-400">計分方式：{currentTeacherExamCategory === 'regular' ? '百分制 (0-100)' : '會考積分制 (A++ ~ C)'}</p>
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
                          <SortableHeader label="社會均" sortKey="social" className="text-center font-bold text-yellow-800 bg-yellow-100/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="總分" sortKey="total" className="text-center font-bold text-blue-800 bg-blue-50" sortConfig={sortConfig} onSort={handleSort}/>
                        </>
                      ) : (
                        <>
                          <SortableHeader label="社會" sortKey="soc" className="text-center bg-yellow-50/50" sortConfig={sortConfig} onSort={handleSort}/>
                          <SortableHeader label="總積分" sortKey="total" className="text-center font-bold text-blue-800 bg-blue-50" sortConfig={sortConfig} onSort={handleSort}/>
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
                           <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/30">{student.total} <span className="text-xs font-normal text-gray-400">/ 35</span></td>
                        )}
                        <td className="p-3 text-center font-bold text-red-600">#{student.rank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {userRole === 'parent' && activeTab === 'dashboard' && currentExamData && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">成績分析總覽</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                 <Calendar className="text-blue-600"/>
                 <select value={parentExamId} onChange={(e) => setParentExamId(e.target.value)} className="bg-transparent font-bold text-gray-700 focus:outline-none cursor-pointer">
                   {EXAM_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label} {opt.category==='cap'?'(模考)':'(段考)'}</option>)}
                 </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-blue-100 text-sm">{currentExamData.category === 'regular' ? '本次總分 (500滿分)' : '會考總積分 (35滿分)'}</p>
                    <h3 className="text-5xl font-bold mt-2">{currentExamData.myScores.total}</h3>
                    <div className="mt-4 flex items-center space-x-2">
                      <span className="bg-white/20 px-2 py-1 rounded text-xs">班排 #{currentExamData.rank}</span>
                      <span className="text-xs text-blue-100">/ {currentExamData.totalStudents} 人</span>
                    </div>
                  </div>
                  <TrendingUp className="absolute right-0 bottom-0 text-white opacity-10 w-32 h-32 -mb-4 -mr-4" />
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-gray-500 text-sm font-bold mb-2">班級統計比較</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">班級平均{currentExamData.category === 'regular' ? '總分' : '積分'}</span>
                        <span className="font-bold text-gray-800">{currentExamData.avgTotal}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-gray-600 text-sm">我的領先分數</span>
                         <span className={`font-bold ${currentExamData.myScores.total >= currentExamData.avgTotal ? 'text-green-500' : 'text-red-500'}`}>
                           {currentExamData.myScores.total >= currentExamData.avgTotal ? '+' : ''}
                           {(currentExamData.myScores.total - currentExamData.avgTotal).toFixed(1)}
                         </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                     <div className="text-xs text-gray-400 mb-1">分數落點</div>
                     <div className="h-2 bg-gray-100 rounded-full relative">
                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 border-2 border-white shadow" style={{ left: `${Math.min((currentExamData.myScores.total / (currentExamData.category === 'regular' ? 500 : 35)) * 100, 100)}%` }}></div>
                     </div>
                     <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>0</span><span>{currentExamData.category === 'regular' ? 500 : 35}</span></div>
                  </div>
               </div>
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                 <TrendChart data={trendData} title={currentExamData.category==='regular' ? "段考總分走勢" : "模考積分走勢"} />
               </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-blue-600"/> 科目強弱分析 (vs 班平均)</h3>
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
                 </table>
               </div>
            </div>
          </div>
        )}
        {userRole === 'teacher' && activeTab === 'dashboard' && (
          <div className="flex flex-col h-full space-y-6">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
               <div className="relative z-10 flex items-center justify-between">
                 <div>
                   <p className="text-gray-300 mb-1 font-bold tracking-wide text-sm">TEACHER CONSOLE</p>
                   <h1 className="text-3xl font-bold mb-2">{teacherProfile.className} 班級管理</h1>
                   <div className="flex items-center space-x-2 text-gray-200"><User size={18} /><span className="font-medium">導師：{teacherProfile.name} 老師</span></div>
                 </div>
                 <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-center min-w-[120px]">
                    <div className="text-sm text-gray-300 mb-1">班級人數</div>
                    <div className="text-3xl font-bold">{students.length} <span className="text-sm font-normal">人</span></div>
                 </div>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => setActiveTab('students')} className="p-6 bg-white shadow-sm border border-gray-100 rounded-xl hover:shadow-md transition-all text-left">
                 <div className="flex items-center space-x-4 mb-2"><div className="p-3 bg-blue-50 rounded-lg"><Users className="w-8 h-8 text-blue-600"/></div><h3 className="font-bold text-gray-800 text-lg">學生資料管理</h3></div><p className="text-sm text-gray-500">設定學生名單、帳號與密碼，支援批次匯入。</p>
              </button>
              <button onClick={() => setActiveTab('grades')} className="p-6 bg-white shadow-sm border border-gray-100 rounded-xl hover:shadow-md transition-all text-left">
                 <div className="flex items-center space-x-4 mb-2"><div className="p-3 bg-green-50 rounded-lg"><Edit className="w-8 h-8 text-green-600"/></div><h3 className="font-bold text-gray-800 text-lg">成績登錄管理</h3></div><p className="text-sm text-gray-500">支援段考(百分制)與模考(會考積分制)輸入，提供批次匯入功能。</p>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}