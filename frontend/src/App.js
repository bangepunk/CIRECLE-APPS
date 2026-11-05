import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AppProvider, useApp } from "./context/AppContext";
import Shell from "./components/Shell";
import { Spinner } from "./components/common";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Messages from "./pages/Messages";
import Groups from "./pages/Groups";
import Directory from "./pages/Directory";
import Profile from "./pages/Profile";
import Org from "./pages/Org";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import { NotificationList } from "./components/NotificationPanel";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import Beranda from "./pages/Beranda";

function Protected({ children }) {
  const { session } = useApp();
  if (session === undefined) return <Spinner label="Loading CIRCLE" />;
  if (!session) return <Navigate to="/login" replace />;
  if (session.user?.needs_onboarding) return <Onboarding />;
  return children;
}

function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Shell /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/beranda" element={<Beranda />} />
        <Route path="/beranda/:pid" element={<Beranda />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:cid" element={<Messages />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/people" element={<Directory />} />
        <Route path="/people/:uid" element={<Profile />} />
        <Route path="/org" element={<Org />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:pid" element={<Projects />} />
        <Route path="/notifications" element={<div className="h-[calc(100dvh-7.5rem)] bg-surface md:h-screen"><NotificationList /></div>} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </AppProvider>
  );
}
