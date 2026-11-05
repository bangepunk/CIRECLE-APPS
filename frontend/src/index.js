import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { BACKEND_MISSING } from "@/lib/api";

class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err && !BACKEND_MISSING) return this.props.children;
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "10vh auto" }}>
        <h2>{BACKEND_MISSING ? "Backend belum dikonfigurasi" : "Terjadi error pada aplikasi"}</h2>
        <p>{BACKEND_MISSING ? "Variabel REACT_APP_BACKEND_URL belum diisi saat build di Vercel. Isi dengan alamat backend (tanpa / dan tanpa /api), lalu Redeploy." : String(this.state.err?.message || this.state.err)}</p>
      </div>
    );
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
