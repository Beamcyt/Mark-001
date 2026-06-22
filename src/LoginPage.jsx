import { useState } from "react";
import { signInWithGoogle, loginWithEmail, registerWithEmail, resetPasswordByEmail } from "./firebase";

const ORANGE = "#F97316";
const PURPLE = "#6B21A8";

// mode: "login" | "register" | "reset"
export default function LoginPage() {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [showPw, setShowPw]   = useState(false);

  function reset() { setError(""); setSuccess(""); setEmail(""); setPassword(""); setConfirm(""); setName(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim()) { setError("กรุณากรอก Email"); return; }

    if (mode === "reset") {
      setLoading(true);
      try {
        await resetPasswordByEmail(email.trim());
        setSuccess("ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง " + email + " แล้ว กรุณาตรวจสอบอีเมล");
        setEmail("");
      } catch (err) {
        setError(friendlyError(err.code));
      }
      setLoading(false);
      return;
    }

    if (!password) { setError("กรุณากรอกรหัสผ่าน"); return; }

    if (mode === "register") {
      if (!name.trim()) { setError("กรุณากรอกชื่อ"); return; }
      if (password.length < 6) { setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
      if (password !== confirm) { setError("รหัสผ่านไม่ตรงกัน"); return; }
      setLoading(true);
      try {
        const cred = await registerWithEmail(email.trim(), password);
        // Store name in Firestore is handled by App.jsx via onAuthStateChanged
        // We attach displayName via updateProfile
        const { updateProfile } = await import("firebase/auth");
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch (err) {
        setError(friendlyError(err.code));
      }
      setLoading(false);
      return;
    }

    // login
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  }

  const IS = {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, fontFamily: "inherit",
    outline: "none", background: "#f8fafc", boxSizing: "border-box",
    color: "#0f172a",
  };
  const LB = { fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block" };

  const titles = { login: "เข้าสู่ระบบ", register: "สร้างบัญชีใหม่", reset: "รีเซ็ตรหัสผ่าน" };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#fff7ed 0%,#fdf4ff 60%,#eff6ff 100%)",
      fontFamily: "'Noto Sans Thai',sans-serif", padding: 16,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420,
        boxShadow: "0 8px 40px rgba(0,0,0,.10)", padding: "36px 32px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56,
            background: `linear-gradient(135deg,${ORANGE},${PURPLE})`,
            borderRadius: 16, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, margin: "0 auto 12px",
            boxShadow: `0 4px 16px ${ORANGE}44`,
          }}>📋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>ระบบใบลา</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>Metthier Co., Ltd.</div>
        </div>

        {/* Tab */}
        {mode !== "reset" && (
          <div style={{
            display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 24,
          }}>
            {[{ v: "login", l: "เข้าสู่ระบบ" }, { v: "register", l: "สมัครสมาชิก" }].map(t => (
              <button key={t.v} onClick={() => { setMode(t.v); reset(); }}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                  background: mode === t.v ? "#fff" : "transparent",
                  color: mode === t.v ? "#0f172a" : "#94a3b8",
                  boxShadow: mode === t.v ? "0 1px 4px rgba(0,0,0,.10)" : "none",
                  transition: "all .15s",
                }}>
                {t.l}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name (register only) */}
          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={LB}>ชื่อ-นามสกุล *</label>
              <input style={IS} value={name} onChange={e => { setName(e.target.value); setError(""); }}
                placeholder="กรอกชื่อ-นามสกุล" autoFocus/>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={LB}>Email *</label>
            <input type="email" style={IS} value={email}
              onChange={e => { setEmail(e.target.value); setError(""); setSuccess(""); }}
              placeholder="your@email.com" autoFocus={mode !== "register"}/>
          </div>

          {/* Password */}
          {mode !== "reset" && (
            <div style={{ marginBottom: 14 }}>
              <label style={LB}>รหัสผ่าน *</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} style={{ ...IS, paddingRight: 42 }}
                  value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder={mode === "register" ? "อย่างน้อย 6 ตัวอักษร" : "รหัสผ่าน"}/>
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8",
                  }}>{showPw ? "🙈" : "👁"}</button>
              </div>
            </div>
          )}

          {/* Confirm Password (register) */}
          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={LB}>ยืนยันรหัสผ่าน *</label>
              <input type={showPw ? "text" : "password"} style={IS} value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                placeholder="กรอกรหัสผ่านอีกครั้ง"/>
            </div>
          )}

          {/* Error / Success */}
          {error   && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, fontWeight: 500, background: "#fff1f2", borderRadius: 8, padding: "8px 12px" }}>⚠ {error}</div>}
          {success && <div style={{ color: "#15803d", fontSize: 13, marginBottom: 12, fontWeight: 500, background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>✅ {success}</div>}

          {/* Forgot password link */}
          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: 16, marginTop: -6 }}>
              <button type="button" onClick={() => { setMode("reset"); reset(); }}
                style={{ background: "none", border: "none", color: ORANGE, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>
                ลืมรหัสผ่าน?
              </button>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${ORANGE},${PURPLE})`,
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", opacity: loading ? 0.7 : 1,
              boxShadow: `0 4px 16px ${ORANGE}44`,
            }}>
            {loading ? "กำลังดำเนินการ..." : titles[mode]}
          </button>
        </form>

        {/* Back from reset */}
        {mode === "reset" && (
          <button onClick={() => { setMode("login"); reset(); }}
            style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            ← กลับไปหน้าเข้าสู่ระบบ
          </button>
        )}

        {/* Divider */}
        {mode !== "reset" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}/>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>หรือ</span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }}/>
            </div>
            <button onClick={signInWithGoogle}
              style={{
                width: "100%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 10, color: "#0f172a",
                boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              }}>
              <img src="https://www.google.com/favicon.ico" width={18} height={18}/>
              เข้าสู่ระบบด้วย Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "ไม่พบบัญชีนี้ในระบบ",
    "auth/wrong-password":        "รหัสผ่านไม่ถูกต้อง",
    "auth/invalid-credential":    "Email หรือรหัสผ่านไม่ถูกต้อง",
    "auth/email-already-in-use":  "Email นี้ถูกใช้งานแล้ว",
    "auth/weak-password":         "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
    "auth/invalid-email":         "รูปแบบ Email ไม่ถูกต้อง",
    "auth/too-many-requests":     "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่",
    "auth/network-request-failed":"เกิดข้อผิดพลาดด้านเครือข่าย กรุณาลองใหม่",
  };
  return map[code] || "เกิดข้อผิดพลาด: " + code;
}
