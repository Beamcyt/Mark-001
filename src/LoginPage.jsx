import { signInWithGoogle } from "./firebase";

const ORANGE = "#F97316";
const PURPLE = "#6B21A8";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#fff7ed 0%,#fdf4ff 60%,#eff6ff 100%)",
      fontFamily: "'Noto Sans Thai',sans-serif", padding: 16,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 380,
        boxShadow: "0 8px 40px rgba(0,0,0,.10)", padding: "40px 32px", textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64,
          background: `linear-gradient(135deg,${ORANGE},${PURPLE})`,
          borderRadius: 18, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 30, margin: "0 auto 16px",
          boxShadow: `0 4px 20px ${ORANGE}44`,
        }}>📋</div>

        <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>ระบบใบลา</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 36 }}>Metthier Co., Ltd.</div>

        <button onClick={signInWithGoogle}
          style={{
            width: "100%", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12,
            padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10, color: "#0f172a",
            boxShadow: "0 2px 8px rgba(0,0,0,.07)",
            transition: "box-shadow .15s",
          }}
          onMouseOver={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.12)"}
          onMouseOut={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.07)"}
        >
          <img src="https://www.google.com/favicon.ico" width={20} height={20}/>
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </div>
  );
}
