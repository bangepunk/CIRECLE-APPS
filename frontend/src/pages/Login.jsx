import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Sparkles, FlaskConical, MessageCircle, CheckSquare, Users } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { api, errMsg } from "../lib/api";
import { Avatar, Logo } from "../components/common";

const STATUS_MSG = {
  pending: "Your account is waiting for administrator approval. You'll be able to sign in once an admin approves it.",
  inactive: "Your account has been deactivated. Please contact your workspace administrator.",
  not_allowed: "This Google account is not allowed to join this workspace.",
  error: "Sign-in failed. Please try again.",
};

function Floating({ image }) {
  const src = image ? `${process.env.REACT_APP_BACKEND_URL}/api/public/login-image/${image}` : "/login-default.jpg";
  return (
    <div className="relative hidden lg:flex flex-1 overflow-hidden rounded-[32px] bg-[#20283B] p-10 text-white" data-testid="login-hero">
      <img src={src} alt="" onError={(e) => { if (!e.currentTarget.src.endsWith("/login-default.jpg")) e.currentTarget.src = "/login-default.jpg"; }} className="absolute inset-0 h-full w-full object-cover" data-testid="login-hero-image" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#20283B]/90 via-[#20283B]/30 to-transparent" />
      <div className="relative z-10 flex w-full flex-col justify-between">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur"><Sparkles size={14} />Your Team. One Circle.</span>
        <div>
          <h2 className="max-w-md text-5xl font-extrabold leading-[1.05] tracking-tight">Connect people. Move work forward.</h2>
          <p className="mt-4 max-w-md text-white/85">One workspace to connect your people, manage your work, and keep everything moving.</p>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[[MessageCircle, "Chat & calls"], [CheckSquare, "Tasks & projects"], [Users, "People & org"]].map(([I, t], i) => (
              <div key={t} className="animate-float rounded-3xl bg-white/90 p-4 text-[#20283B] shadow-xl" style={{ animationDelay: `${i * 0.8}s` }}>
                <I size={20} className="text-[#FF5364]" /><p className="mt-6 text-sm font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { session, setSession } = useApp();
  const [params] = useSearchParams();
  const [demo, setDemo] = useState({ enabled: false, users: [] });
  const [brand, setBrand] = useState({});
  const [clientId, setClientId] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const onCredential = useRef(null);
  const status = authStatus || params.get("status");
  useEffect(() => {
    api.get("/auth/demo-users").then((r) => setDemo(r.data)).catch(() => {});
    api.get("/public/branding").then((r) => setBrand(r.data)).catch(() => {});
    api.get("/auth/config").then((r) => setClientId(r.data.google_client_id || "")).catch(() => setClientId(""));
  }, []);
  onCredential.current = async ({ credential }) => {
    try {
      const { data } = await api.post("/auth/google", { credential });
      setSession(data);
      navigate("/", { replace: true });
    } catch (e) {
      const d = e?.response?.data?.detail;
      setAuthStatus(["pending", "inactive", "not_allowed"].includes(d) ? d : "error");
    }
  };
  useEffect(() => {
    if (!clientId || session) return undefined;
    const render = () => {
      if (!btnRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential.current(r) });
      const w = Math.max(200, Math.min(400, btnRef.current.offsetWidth || 320));
      window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "left", width: w });
    };
    if (window.google?.accounts?.id) { render(); return undefined; }
    let s = document.getElementById("gsi-client");
    if (!s) {
      s = document.createElement("script");
      s.id = "gsi-client";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", render);
    return () => s.removeEventListener("load", render);
  }, [clientId, session]);
  if (session) return <Navigate to="/" replace />;
  const demoLogin = async (uid) => {
    try {
      const { data } = await api.post("/auth/demo", { user_id: uid });
      setSession(data);
      navigate("/");
    } catch (e) { toast.error(errMsg(e)); }
  };
  const logo = brand.logo_file_id ? { logo_file_id: null } : null;
  return (
    <div className="flex min-h-screen bg-background p-3 sm:p-5">
      <Floating image={brand.login_image_file_id} />
      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:max-w-[560px]">
        <div className="w-full max-w-sm animate-rise">
          <div className="flex items-center gap-3">
            {brand.logo_file_id ? <img src={`${process.env.REACT_APP_BACKEND_URL}/api/public/logo/${brand.logo_file_id}`} alt="logo" className="h-11 w-11 rounded-xl object-cover" /> : <Logo size={44} ws={logo} />}
            <span className="text-2xl font-extrabold tracking-tight" data-testid="login-app-name">{brand.brand_name || "CIRCLE"}</span>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sub" data-testid="login-tagline">{brand.tagline || "Your Team. One Circle."}</p>
          {status && <div className="mt-6 rounded-2xl border bg-soft-yellow p-4 text-sm text-amber-900 dark:text-amber-100" data-testid="login-status-message">{STATUS_MSG[status] || STATUS_MSG.error}</div>}
          <div className="mt-8 flex min-h-[44px] w-full justify-center" data-testid="login-google-button">
            <div ref={btnRef} className="w-full" />
          </div>
          {clientId === "" && <p className="mt-3 text-sm text-red-600" data-testid="login-google-missing">Login Google belum dikonfigurasi (GOOGLE_CLIENT_ID di backend belum diisi).</p>}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-sub"><ShieldCheck size={14} />Only invited or company accounts can join the Internal workspace.</p>
          {demo.enabled && (
            <div className="mt-10 rounded-3xl border border-dashed bg-surface p-4" data-testid="demo-mode-panel">
              <p className="flex items-center gap-2 text-sm font-semibold"><FlaskConical size={16} className="text-amber-500" />Explore Demo Mode</p>
              <p className="mt-1 text-xs text-sub">Sample data only — separate from the real workspace.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {demo.users.map((u) => (
                  <button key={u.user_id} onClick={() => demoLogin(u.user_id)} className="flex items-center gap-2 rounded-2xl bg-surface2 p-2 text-left transition-colors hover:bg-soft-red" data-testid={`demo-login-${u.user_id}`}>
                    <Avatar user={u} size={30} showStatus={false} />
                    <span className="min-w-0"><span className="block truncate text-xs font-semibold">{u.name}</span><span className="block truncate text-[10px] text-sub">{u.job_title}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
