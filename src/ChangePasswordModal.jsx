import { useState } from "react";
import { changePassword, resetPasswordByEmail } from "./firebase";
import { auth } from "./firebase";

const PURPLE = "#6B21A8";

export default function ChangePasswordModal({ onClose, currentUser }) {
  const [tab, setTab]           = useState("change"); // "change" | "reset"
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]       = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  // ตรวจว่า user login ด้วย Google หรือ Email
  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === "google.com");

  async function handleChange(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!currentPw) { setError("กรุณากรอกรหัสผ่านปัจจุบัน"); return; }
    if (newPw.length < 6) { setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    if (newPw !== confirmPw) { setError("รหัสผ่านใหม่ไม่ตรงกัน"); return; }
    if (newPw === currentPw) { setError("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม"); return; }
    setLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setSuccess("เปลี่ยนรหัสผ่านสำเร็จ!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      const map = {
        "auth/wrong-password":     "รหัสผ่านปัจจุบันไม่ถูกต้อง",
        "auth/invalid-credential": "รหัสผ่านปัจจุบันไม่ถูกต้อง",
        "auth/too-many-requests":  "พยายามหลายครั้งเกินไป กรุณารอสักครู่",
        "auth/weak-password":      "รหัสผ่านใหม่ไม่ปลอดภัยพอ",
      };
      setError(map[err.code] || "เกิดข้อผิดพลาด: " + err.code);
    }
    setLoading(false);
  }

  async function handleReset() {
    setError(""); setSuccess("");
    const email = auth.currentUser?.email;
    if (!email) { setError("ไม่พบ Email ในบัญชีนี้"); return; }
    setLoading(true);
    try {
      await resetPasswordByEmail(email);
      setSuccess(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${email} แล้ว กรุณาตรวจสอบอีเมล`);
    } catch (err) {
      setError("เกิดข้อผิดพลาด: " + err.code);
    }
    setLoading(false);
  }

  const IS = {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: 8,
    padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
    outline: "none", background: "#f8fafc", boxSizing: "border-box",
  };
  const LB = { fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700,
      background: "rgba(15,23,42,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,.15)", padding: 24,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>🔑 จัดการรหัสผ่าน</div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, width: 30, height: 30, borderRadius: 8 }}>✕</button>
        </div>

        {/* แจ้งเตือน Google user */}
        {isGoogleUser && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#1d4ed8" }}>
            <b>บัญชีของคุณเชื่อมกับ Google</b><br/>
            ไม่สามารถเปลี่ยนรหัสผ่านในระบบได้โดยตรง แต่สามารถส่งลิงก์รีเซ็ตไปยังอีเมลได้
          </div>
        )}

        {/* Tabs (เฉพาะ non-Google) */}
        {!isGoogleUser && (
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {[{ v: "change", l: "เปลี่ยนรหัสผ่าน" }, { v: "reset", l: "ส่ง Reset Email" }].map(t => (
              <button key={t.v} onClick={() => { setTab(t.v); setError(""); setSuccess(""); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  background: tab === t.v ? "#fff" : "transparent",
                  color: tab === t.v ? "#0f172a" : "#94a3b8",
                  boxShadow: tab === t.v ? "0 1px 4px rgba(0,0,0,.10)" : "none",
                }}>
                {t.l}
              </button>
            ))}
          </div>
        )}

        {/* เปลี่ยนรหัสผ่าน */}
        {!isGoogleUser && tab === "change" && (
          <form onSubmit={handleChange}>
            <div style={{ marginBottom: 14 }}>
              <label style={LB}>รหัสผ่านปัจจุบัน</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} style={{ ...IS, paddingRight: 40 }}
                  value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError(""); }}
                  placeholder="รหัสผ่านเดิม"/>
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#94a3b8" }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={LB}>รหัสผ่านใหม่</label>
              <input type={showPw ? "text" : "password"} style={IS}
                value={newPw} onChange={e => { setNewPw(e.target.value); setError(""); }}
                placeholder="อย่างน้อย 6 ตัวอักษร"/>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={LB}>ยืนยันรหัสผ่านใหม่</label>
              <input type={showPw ? "text" : "password"} style={IS}
                value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"/>
            </div>

            {error   && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, background: "#fff1f2", borderRadius: 8, padding: "8px 12px" }}>⚠ {error}</div>}
            {success && <div style={{ color: "#15803d", fontSize: 12, marginBottom: 12, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>✅ {success}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <button type="button" onClick={onClose}
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button type="submit" disabled={loading}
                style={{ background: PURPLE, border: "none", color: "#fff", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
                {loading ? "กำลังบันทึก..." : "💾 เปลี่ยนรหัสผ่าน"}
              </button>
            </div>
          </form>
        )}

        {/* Reset Email (tab หรือ Google user) */}
        {(isGoogleUser || tab === "reset") && (
          <div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
              ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปยัง<br/>
              <b style={{ color: "#0f172a" }}>{auth.currentUser?.email}</b>
            </div>
            {error   && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, background: "#fff1f2", borderRadius: 8, padding: "8px 12px" }}>⚠ {error}</div>}
            {success && <div style={{ color: "#15803d", fontSize: 12, marginBottom: 12, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>✅ {success}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <button onClick={onClose}
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button onClick={handleReset} disabled={loading}
                style={{ background: "#2563eb", border: "none", color: "#fff", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
                {loading ? "กำลังส่ง..." : "📧 ส่ง Reset Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
