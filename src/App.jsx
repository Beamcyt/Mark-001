import { useState, useEffect } from "react";
import { auth, db, signOutUser } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, setDoc as fsSetDoc } from "firebase/firestore";
import LeaveModal from "./LeaveModal.jsx";
import LoginPage from "./LoginPage.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";

const ORANGE = "#F97316";
const PURPLE = "#6B21A8";

const LEAVE_LABEL = { vacation:"ลาพักผ่อน", personal:"ลากิจ", sick:"ลาป่วย", other:"อื่นๆ" };
const STATUS_STYLE = {
  pending:  { bg:"#fef9c3", color:"#854d0e", label:"รออนุมัติ" },
  approved: { bg:"#f0fdf4", color:"#15803d", label:"อนุมัติแล้ว" },
  rejected: { bg:"#fff1f2", color:"#be123c", label:"ไม่อนุมัติ" },
};

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [page, setPage] = useState("home"); // home | admin
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterName, setFilterName] = useState("all");
  const [notifOpen, setNotifOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      setAuthUser(user);
      if (user) {
        const ref = doc(db,"users",user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { name:user.displayName, email:user.email, role:"pending", createdAt:new Date().toISOString() });
        }
        setCurrentUser({ id:user.uid, ...(snap.exists()?snap.data():{ name:user.displayName, email:user.email, role:"pending" }) });
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
  }, []);

  // Load users
  useEffect(() => {
    if (!currentUser) return;
    const u = onSnapshot(collection(db,"users"), snap => {
      setUsers(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return u;
  }, [currentUser]);

  // Load leaves
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db,"leaves"), orderBy("createdAt","desc"));
    const u = onSnapshot(q, snap => {
      setLeaves(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return u;
  }, [currentUser]);

  // Load notifications
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db,"notifications"), where("toUid","==",currentUser.id), where("read","==",false));
    const u = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")));
    });
    return u;
  }, [currentUser]);

  const isAdmin = currentUser?.role === "admin";
  const isPending = currentUser?.role === "pending";
  const myLeaves = isAdmin ? leaves : leaves.filter(r => r.createdBy === currentUser?.id);
  const filtered = myLeaves.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterName !== "all" && r.name !== filterName) return false;
    return true;
  });

  const approvedLeaves = myLeaves.filter(r => r.status === "approved");
  const summary = {};
  approvedLeaves.forEach(r => {
    if (!summary[r.name]) summary[r.name] = { vacation:0, personal:0, sick:0, other:0 };
    summary[r.name][r.leaveType] = (summary[r.name][r.leaveType]||0) + (r.days||0);
  });

  const names = [...new Set(leaves.map(r=>r.name).filter(Boolean))].sort();

  async function saveLeave(data) {
    setSaving(true);
    try {
      await addDoc(collection(db,"leaves"), data);
      setShowModal(false);
    } catch(e) { console.error(e); }
    setSaving(false);
  }

  async function updateStatus(id, status) {
    try {
      const leave = leaves.find(r => r.id === id);
      await updateDoc(doc(db,"leaves",id), { status, approvedBy:currentUser?.name||"", approvedAt:new Date().toISOString() });
      if (leave?.createdBy) {
        const statusText = status==="approved" ? "อนุมัติแล้ว ✅" : "ไม่อนุมัติ ❌";
        const typeLabel = LEAVE_LABEL[leave.leaveType]||leave.leaveType;
        await fsSetDoc(doc(db,"notifications",Date.now().toString()), {
          type:"leave", toUid:leave.createdBy, toName:leave.name||"",
          fromName:currentUser?.name||"",
          message:`ใบลา${typeLabel} ${leave.displayAmount||leave.days} ${leave.leaveUnit==="hour"?"ชม.":"วัน"} — ${statusText}`,
          createdAt:new Date().toISOString(), read:false,
        });
      }
    } catch(e) { console.error(e); }
  }

  async function deleteLeave(id) {
    if (!window.confirm("ลบใบลานี้?")) return;
    await deleteDoc(doc(db,"leaves",id));
  }

  async function markRead(id) {
    await updateDoc(doc(db,"notifications",id), { read:true });
  }

  function printLeave(leave) {
    const logoUrl = "/logo.png";
    const typeLabel = leave.leaveType==="other" ? (leave.otherType||"อื่นๆ") : LEAVE_LABEL[leave.leaveType]||leave.leaveType;
    const prevLeaves = leaves.filter(r => r.id!==leave.id && r.createdBy===leave.createdBy && r.status==="approved");
    const prevSum = { vacation:0, personal:0, sick:0, other:0 };
    prevLeaves.forEach(r => { if(prevSum[r.leaveType]!==undefined) prevSum[r.leaveType]+=(r.days||0); });
    const user = users.find(u => u.id===leave.createdBy||u.name===leave.name);
    const quota = user?.leaveQuota||{};

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ใบลา - ${leave.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;font-size:14px;padding:30px 40px;color:#000}
h1{text-align:center;font-size:20px;font-weight:700;margin-bottom:16px}
.row{display:flex;gap:12px;margin-bottom:10px;align-items:flex-end}
.field{flex:1}
.label{font-size:12px;color:#555;margin-bottom:2px}
.line{border-bottom:1px solid #000;padding:2px 4px;min-height:22px}
.cb-row{display:flex;gap:16px;margin-bottom:10px;flex-wrap:wrap}
.cb{display:flex;align-items:center;gap:4px}
.box{display:inline-block;width:14px;height:14px;border:1px solid #000;text-align:center;line-height:14px;font-size:11px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
th,td{border:1px solid #000;padding:5px 8px;text-align:center}
th{font-weight:700;background:#f0f0f0}
.sig-row{display:flex;gap:20px;margin-top:16px}
.sig{flex:1;text-align:center}
.sig-line{border-bottom:1px solid #000;margin:24px 16px 4px}
@media print{body{padding:15px 20px}@page{margin:10mm;size:A4 landscape}}
</style></head><body>
<div style="text-align:left;margin-bottom:8px"><img src="${logoUrl}" style="max-height:100px;max-width:210px;object-fit:contain"/></div>
<h1>ใบลา</h1>
<div class="row"><div class="label">ประเภทการลา:</div>
<div class="cb-row">
${["vacation","personal","sick","other"].map(t=>`<div class="cb"><span class="box">${leave.leaveType===t?"✓":""}</span> ${LEAVE_LABEL[t]}</div>`).join("")}
${leave.leaveType==="other"?`<span>__ ${leave.otherType||""} __</span>`:""}
</div></div>
<div class="row">
<div class="field"><div class="label">สถานที่ปฏิบัติงาน</div><div class="line">${leave.workLocation||""}</div></div>
<div class="field"><div class="label">โทรศัพท์</div><div class="line">${leave.phone||""}</div></div>
</div>
<div class="row">
<div class="field"><div class="label">เรียน ผู้จัดการแผนก</div><div class="line">${leave.manager||""}</div></div>
<div class="field"><div class="label">สำนัก/ฝ่าย</div><div class="line">${leave.department||""}</div></div>
</div>
<div class="row">
<div class="label">ข้าพเจ้า</div><div class="line" style="flex:2">${leave.name||""}</div>
<div class="label">พนักงานระดับ</div><div class="line" style="flex:1">${leave.empLevel||""}</div>
<div class="label">ตำแหน่ง</div><div class="line" style="flex:2">${leave.position||""}</div>
<div class="label">เลขบัตรพนักงาน</div><div class="line" style="flex:1">${leave.empId||""}</div>
</div>
<div class="row" style="margin-top:8px"><div class="label">วันหยุดประจำสัปดาห์:</div>
<div class="cb-row">
${["จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์","อาทิตย์"].map(d=>`<div class="cb"><span class="box">${(leave.offDays||[]).includes(d)?"✓":""}</span> ${d}</div>`).join("")}
</div></div>
<div class="row">
<div class="label">ลาหยุดเนื่องจาก</div><div class="line" style="flex:3">${leave.reason||""}</div>
<div class="label">มีกำหนด</div><div class="line" style="width:60px">${leave.displayAmount||leave.days||""}</div>
<div class="label">${leave.leaveUnit==="hour"?"ชม.":"วัน"}</div>
</div>
<div class="row">
<div class="label">ตั้งแต่วันที่</div><div class="line" style="flex:2">${leave.dateFrom||""}</div>
<div class="label">ถึงวันที่</div><div class="line" style="flex:2">${leave.dateTo||""}</div>
</div>
<div class="sig-row">
<div class="sig"><div class="sig-line"></div><div>ผู้ขอลา</div></div>
<div class="sig"><div class="sig-line"></div><div>พนักงานที่ควบคุม</div></div>
<div class="sig"><div class="sig-line"></div><div>ผู้อนุมัติ</div></div>
</div>
<table>
<tr><th colspan="7">สำหรับเจ้าหน้าที่ระเบียนวันลาประจำฝ่าย</th></tr>
<tr><th rowspan="2">รายการ</th><th colspan="5">นับเป็นวันลา</th><th rowspan="2">ไม่นับวันลา<br/>ลาพิเศษ 1</th></tr>
<tr><th>ลาพักผ่อน</th><th>ลากิจ</th><th>ลาป่วย</th><th>ลาพิเศษ</th><th>อื่นๆ</th></tr>
<tr><td>ลามาแล้ว</td><td>${prevSum.vacation||""}</td><td>${prevSum.personal||""}</td><td>${prevSum.sick||""}</td><td></td><td>${prevSum.other||""}</td><td></td></tr>
<tr><td>ลาครั้งนี้</td>
<td>${leave.leaveType==="vacation"?(leave.displayAmount||leave.days):""}</td>
<td>${leave.leaveType==="personal"?(leave.displayAmount||leave.days):""}</td>
<td>${leave.leaveType==="sick"?(leave.displayAmount||leave.days):""}</td>
<td></td>
<td>${leave.leaveType==="other"?(leave.displayAmount||leave.days):""}</td>
<td></td></tr>
<tr><td>รวม</td>
<td>${leave.leaveType==="vacation"?(prevSum.vacation+(leave.days||0)).toFixed(1):prevSum.vacation||""}</td>
<td>${leave.leaveType==="personal"?(prevSum.personal+(leave.days||0)).toFixed(1):prevSum.personal||""}</td>
<td>${leave.leaveType==="sick"?(prevSum.sick+(leave.days||0)).toFixed(1):prevSum.sick||""}</td>
<td></td>
<td>${leave.leaveType==="other"?(prevSum.other+(leave.days||0)).toFixed(1):prevSum.other||""}</td>
<td></td></tr>
${quota.vacation!==undefined?`<tr><td style="font-size:11px;color:#555">วันที่ได้รับ/ปี</td><td style="font-size:11px">${quota.vacation||0}</td><td style="font-size:11px">${quota.personal||0}</td><td style="font-size:11px">${quota.sick||0}</td><td></td><td style="font-size:11px">${quota.other||0}</td><td></td></tr>`:""}
</table>
<script>window.onload=()=>window.print();</script>
</body></html>`;
    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
  }

  // Loading
  if (authLoading) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",fontFamily:"'Noto Sans Thai',sans-serif" }}>
      <div style={{ fontSize:14,color:"#94a3b8" }}>กำลังโหลด...</div>
    </div>
  );

  // Login
  if (!authUser) return <LoginPage />;

  // Pending
  if (isPending) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#f8fafc",fontFamily:"'Noto Sans Thai',sans-serif" }}>
      <div style={{ textAlign:"center",padding:32 }}>
        <div style={{ fontSize:48,marginBottom:16 }}>⏳</div>
        <div style={{ fontSize:18,fontWeight:700,color:"#0f172a",marginBottom:8 }}>รอการอนุมัติ</div>
        <div style={{ fontSize:14,color:"#64748b",marginBottom:24 }}>กรุณารอ Admin อนุมัติบัญชีของคุณก่อน</div>
        <button onClick={signOutUser} style={{ background:"#f1f5f9",border:"1px solid #e2e8f0",
          color:"#475569",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit" }}>
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#f8fafc",fontFamily:"'Noto Sans Thai',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"14px 20px",
        display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10 }}>
        <div style={{ width:32,height:32,background:`linear-gradient(135deg,${ORANGE},${PURPLE})`,
          borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>📋</div>
        <div style={{ fontSize:16,fontWeight:800,color:"#0f172a" }}>ระบบใบลา</div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:8 }}>
          {/* Notifications */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>setNotifOpen(v=>!v)}
              style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,position:"relative",padding:"4px" }}>
              🔔
              {notifs.length>0 && (
                <span style={{ position:"absolute",top:0,right:0,background:ORANGE,color:"#fff",
                  borderRadius:"50%",width:16,height:16,fontSize:10,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>{notifs.length}</span>
              )}
            </button>
            {notifOpen && (
              <div style={{ position:"absolute",right:0,top:40,width:300,background:"#fff",
                border:"1px solid #e2e8f0",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:50 }}>
                <div style={{ padding:"12px 16px",borderBottom:"1px solid #f1f5f9",fontSize:13,fontWeight:700 }}>การแจ้งเตือน</div>
                {notifs.length===0 ? (
                  <div style={{ padding:24,textAlign:"center",color:"#94a3b8",fontSize:13 }}>ไม่มีการแจ้งเตือน</div>
                ) : notifs.map(n=>(
                  <div key={n.id} onClick={()=>{ markRead(n.id); setNotifOpen(false); }}
                    style={{ padding:"12px 16px",borderBottom:"1px solid #f8fafc",cursor:"pointer",
                      background:"#eff6ff",fontSize:13 }}>
                    <div style={{ fontWeight:600,color:"#0f172a",marginBottom:2 }}>📋 {n.message}</div>
                    <div style={{ fontSize:11,color:"#94a3b8" }}>
                      {n.createdAt?new Date(n.createdAt).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"}):""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isAdmin && (
            <button onClick={()=>setPage(page==="admin"?"home":"admin")}
              style={{ background:page==="admin"?PURPLE:"#f5f3ff",border:`1px solid ${PURPLE}30`,
                color:page==="admin"?"#fff":PURPLE,borderRadius:8,padding:"6px 12px",
                fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
              {page==="admin"?"← กลับ":"⚙ Admin"}
            </button>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ width:30,height:30,borderRadius:"50%",
              background:`hsl(${currentUser?.name?.charCodeAt(0)*7%360},60%,70%)`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff" }}>
              {currentUser?.name?.charAt(0)||"?"}
            </div>
            <button onClick={() => setShowChangePw(true)} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",
              color:"#64748b",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
              🔑
            </button>
            <button onClick={signOutUser} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",
              color:"#64748b",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>
              ออก
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 20px 48px",maxWidth:900,margin:"0 auto" }}>

        {page==="admin" ? (
          <AdminPage users={users} leaves={leaves} onUpdateRole={async(uid,role)=>{
            await updateDoc(doc(db,"users",uid),{role});
          }} onSaveSettings={async(uid,data)=>{
            await updateDoc(doc(db,"users",uid),data);
          }}/>
        ) : (
          <>
            {/* Summary */}
            {Object.keys(summary).length>0 && (
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px",marginBottom:16 }}>
                <div style={{ fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1 }}>สรุปวันลา (อนุมัติแล้ว)</div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#f8fafc",borderBottom:"1px solid #e2e8f0" }}>
                        {["ชื่อ","ลาพักผ่อน","ลากิจ","ลาป่วย","อื่นๆ"].map(h=>(
                          <th key={h} style={{ padding:"8px 12px",textAlign:"left",fontSize:11,color:"#64748b",fontWeight:700 }}>{h} <span style={{fontWeight:400,color:"#cbd5e1"}}>(วัน/ชม.)</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary).map(([name,s])=>{
                        const u = users.find(x=>x.name===name);
                        const q = u?.leaveQuota||{};
                        return (
                          <tr key={name} style={{ borderBottom:"1px solid #f1f5f9" }}>
                            <td style={{ padding:"8px 12px",fontWeight:600,color:"#0f172a" }}>{name}</td>
                            {["vacation","personal","sick","other"].map(t=>{
                              const days = s[t]||0;
                              const hrs  = Math.round(days*8);
                              const over = q[t]!==undefined&&days>q[t];
                              const color = over?"#ef4444":t==="vacation"?"#2563eb":t==="personal"?"#7c3aed":t==="sick"?"#dc2626":"#475569";
                              return (
                                <td key={t} style={{ padding:"8px 12px" }}>
                                  <span style={{ color,fontWeight:700,fontSize:13 }}>{days.toFixed(1)} วัน</span>
                                  <span style={{ color:"#94a3b8",fontSize:11,marginLeft:4 }}>({hrs} ชม.)</span>
                                  {q[t]!==undefined&&(
                                    <div style={{ fontSize:10,color:over?"#ef4444":"#94a3b8",marginTop:1 }}>
                                      quota: {q[t]} วัน {over&&<span style={{fontWeight:700}}>⚠ เกิน</span>}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Filters + New */}
            <div style={{ background:"#fff",borderRadius:12,padding:"12px 16px",
              border:"1px solid #e2e8f0",marginBottom:16,
              display:"flex",flexWrap:"wrap",gap:10,alignItems:"center" }}>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                style={{ border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 10px",fontSize:12,fontFamily:"inherit",background:"#f8fafc",outline:"none" }}>
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
              </select>
              {isAdmin && (
                <select value={filterName} onChange={e=>setFilterName(e.target.value)}
                  style={{ border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 10px",fontSize:12,fontFamily:"inherit",background:"#f8fafc",outline:"none" }}>
                  <option value="all">ทุกคน</option>
                  {names.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              )}
              <span style={{ fontSize:12,color:"#94a3b8",marginLeft:"auto" }}>{filtered.length} รายการ</span>
              <button onClick={()=>setShowModal(true)}
                style={{ background:ORANGE,border:"none",color:"#fff",borderRadius:8,
                  padding:"7px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                + ยื่นใบลา
              </button>
            </div>

            {/* Leave list */}
            {filtered.length===0 ? (
              <div style={{ textAlign:"center",color:"#cbd5e1",padding:48,fontSize:14 }}>ยังไม่มีใบลา</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {filtered.map(r=>{
                  const st = STATUS_STYLE[r.status]||STATUS_STYLE.pending;
                  const typeLabel = r.leaveType==="other"?(r.otherType||"อื่นๆ"):LEAVE_LABEL[r.leaveType]||r.leaveType;
                  return (
                    <div key={r.id} style={{ background:"#fff",borderRadius:12,border:"1px solid #e2e8f0",padding:"14px 16px",
                      borderLeft:`4px solid ${ORANGE}` }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                        <div>
                          <div style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>{r.name}</div>
                          <div style={{ fontSize:12,color:"#64748b",marginTop:2 }}>
                            {typeLabel} · {r.leaveUnit==="hour"
                              ? <><span style={{fontWeight:700,color:"#7c3aed"}}>{r.displayAmount||Math.round((r.days||0)*8)} ชม.</span><span style={{color:"#94a3b8",marginLeft:4}}>({(r.days||0).toFixed(1)} วัน)</span></>
                              : <><span style={{fontWeight:700,color:"#2563eb"}}>{r.displayAmount||r.days} วัน</span><span style={{color:"#94a3b8",marginLeft:4}}>({Math.round((r.days||0)*8)} ชม.)</span></>
                            } · {r.dateFrom} ถึง {r.dateTo}
                          </div>
                          {r.reason&&<div style={{ fontSize:12,color:"#94a3b8",marginTop:2 }}>เหตุผล: {r.reason}</div>}
                        </div>
                        <span style={{ background:st.bg,color:st.color,borderRadius:20,
                          padding:"3px 10px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",flexShrink:0,marginLeft:8 }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                        <button onClick={()=>printLeave(r)}
                          style={{ background:"#f8fafc",border:"1px solid #e2e8f0",color:"#475569",
                            borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>
                          🖨 Export PDF
                        </button>
                        {isAdmin&&r.status==="pending"&&(<>
                          <button onClick={()=>updateStatus(r.id,"approved")}
                            style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#15803d",
                              borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>
                            ✅ อนุมัติ
                          </button>
                          <button onClick={()=>updateStatus(r.id,"rejected")}
                            style={{ background:"#fff1f2",border:"1px solid #fecdd3",color:"#be123c",
                              borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>
                            ❌ ไม่อนุมัติ
                          </button>
                        </>)}
                        {isAdmin&&(
                          <button onClick={()=>deleteLeave(r.id)}
                            style={{ background:"#fff5f5",border:"1px solid #fecaca",color:"#ef4444",
                              borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>
                            🗑 ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showModal&&(
        <LeaveModal onClose={()=>setShowModal(false)} onSave={saveLeave}
          saving={saving} currentUser={currentUser} users={users} allLeaves={leaves}/>
      )}
      {showChangePw&&(
        <ChangePasswordModal onClose={()=>setShowChangePw(false)} currentUser={currentUser}/>
      )}
    </div>
  );
}

function AdminPage({ users, leaves, onUpdateRole, onSaveSettings }) {
  const [editUser, setEditUser] = useState(null);
  const ROLE_OPTS = [
    { value:"admin",label:"Admin",color:"#7c3aed",bg:"#f5f3ff" },
    { value:"user",label:"User",color:"#2563eb",bg:"#eff6ff" },
    { value:"pending",label:"รออนุมัติ",color:"#f59e0b",bg:"#fef3c7" },
  ];
  const pending = users.filter(u=>u.role==="pending");
  const active  = users.filter(u=>u.role!=="pending");

  return (
    <div>
      <div style={{ fontSize:16,fontWeight:800,color:"#0f172a",marginBottom:16 }}>⚙ จัดการผู้ใช้</div>
      {pending.length>0&&(
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12,color:"#f59e0b",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10 }}>
            รออนุมัติ ({pending.length})
          </div>
          {pending.map(u=>(
            <UserCard key={u.id} user={u} roleOpts={ROLE_OPTS} onRole={onUpdateRole} onEdit={setEditUser} leaves={leaves}/>
          ))}
        </div>
      )}
      <div style={{ fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10 }}>
        ผู้ใช้ทั้งหมด ({active.length})
      </div>
      {active.map(u=>(
        <UserCard key={u.id} user={u} roleOpts={ROLE_OPTS} onRole={onUpdateRole} onEdit={setEditUser} leaves={leaves}/>
      ))}
      {editUser&&(
        <EditUserModal user={editUser} onClose={()=>setEditUser(null)} onSave={async(uid,data)=>{
          await onSaveSettings(uid,data); setEditUser(null);
        }}/>
      )}
    </div>
  );
}

function UserCard({ user, roleOpts, onRole, onEdit, leaves }) {
  const roleOpt = roleOpts.find(r=>r.value===user.role)||roleOpts[2];
  const approved = leaves.filter(r=>r.createdBy===user.id&&r.status==="approved");
  const used = { vacation:0,personal:0,sick:0,other:0 };
  approved.forEach(r=>{ if(used[r.leaveType]!==undefined) used[r.leaveType]+=(r.days||0); });
  const q = user.leaveQuota||{};
  return (
    <div style={{ background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px",marginBottom:10 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ width:40,height:40,borderRadius:"50%",flexShrink:0,
          background:`hsl(${user.name?.charCodeAt(0)*7%360},60%,70%)`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff" }}>
          {user.name?.charAt(0)||"?"}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>{user.name||"ไม่ระบุชื่อ"}</div>
          <div style={{ fontSize:12,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.email}</div>
        </div>
        <select value={user.role} onChange={e=>onRole(user.id,e.target.value)}
          style={{ background:roleOpt.bg,border:`1px solid ${roleOpt.color}30`,color:roleOpt.color,
            borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",outline:"none" }}>
          {roleOpts.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {user.role!=="pending"&&(
          <button onClick={()=>onEdit(user)}
            style={{ background:"#eff6ff",border:"1px solid #bfdbfe",color:"#2563eb",
              borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600 }}>
            ✏️
          </button>
        )}
      </div>
      {user.role!=="pending"&&(q.vacation!==undefined||user.onsiteRate)&&(
        <div style={{ marginTop:8,display:"flex",gap:12,flexWrap:"wrap" }}>
          {user.onsiteRate>0&&<span style={{ fontSize:11,color:"#16a34a" }}>💰 {user.onsiteRate.toLocaleString()} บ./ครั้ง</span>}
          {q.vacation!==undefined&&<span style={{ fontSize:11,color:"#2563eb" }}>🏖 พักผ่อน {used.vacation.toFixed(1)} วัน ({Math.round(used.vacation*8)} ชม.) / {q.vacation} วัน</span>}
          {q.sick!==undefined&&<span style={{ fontSize:11,color:"#dc2626" }}>🤒 ป่วย {used.sick.toFixed(1)} วัน ({Math.round(used.sick*8)} ชม.) / {q.sick} วัน</span>}
        </div>
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }) {
  const [onsiteRate, setOnsiteRate] = useState(user.onsiteRate?.toString()||"");
  const [canEditShift, setCanEditShift] = useState(!!user.canEditShift);
  const q = user.leaveQuota||{};
  const [quota, setQuota] = useState({
    vacation:q.vacation?.toString()||"",
    personal:q.personal?.toString()||"",
    sick:q.sick?.toString()||"",
    other:q.other?.toString()||"",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(user.id, {
      onsiteRate: parseFloat(onsiteRate)||0,
      leaveQuota: {
        vacation:parseFloat(quota.vacation)||0,
        personal:parseFloat(quota.personal)||0,
        sick:parseFloat(quota.sick)||0,
        other:parseFloat(quota.other)||0,
      },
    });
    setSaving(false);
  }

  const IS = { width:"100%",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#f8fafc" };
  const LB = { fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4,display:"block" };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,42,.5)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:440,
        boxShadow:"0 20px 60px rgba(0,0,0,.15)",padding:24 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>{user.name}</div>
            <div style={{ fontSize:12,color:"#94a3b8" }}>{user.email}</div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9",border:"none",color:"#64748b",cursor:"pointer",fontSize:14,width:30,height:30,borderRadius:8 }}>✕</button>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={LB}>💰 ค่าแรง Onsite (บาท/ครั้ง)</label>
          <input type="number" min="0" value={onsiteRate} onChange={e=>setOnsiteRate(e.target.value)} style={IS} placeholder="0"/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={LB}>📋 วันลาที่ได้รับต่อปี</label>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {[{k:"vacation",l:"ลาพักผ่อน"},{k:"personal",l:"ลากิจ"},{k:"sick",l:"ลาป่วย"},{k:"other",l:"อื่นๆ"}].map(t=>(
              <div key={t.k}>
                <div style={{ fontSize:12,color:"#64748b",marginBottom:4 }}>{t.l}</div>
                <input type="number" min="0" value={quota[t.k]}
                  onChange={e=>setQuota(p=>({...p,[t.k]:e.target.value}))}
                  placeholder="0" style={IS}/>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr",gap:8 }}>
          <button onClick={onClose} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",color:"#475569",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background:PURPLE,border:"none",color:"#fff",borderRadius:10,padding:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1 }}>
            {saving?"กำลังบันทึก...":"💾 บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
