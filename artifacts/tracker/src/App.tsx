import { lazy, Suspense, useEffect, useState } from "react";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const TrackingResult = lazy(() => import("@/pages/TrackingResult"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));

type View = { screen: "landing" } | { screen: "tracking"; code: string } | { screen: "admin" };

function PageLoading() {
  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-white/50">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        Loading TeslaTrack
      </div>
    </div>
  );
}

function App() {
  const initialCode = new URLSearchParams(window.location.search).get("code")?.trim().toUpperCase() ?? "";
  const [view, setView] = useState<View>(
    initialCode ? { screen: "tracking", code: initialCode } : { screen: "landing" }
  );

  useEffect(() => {
    if (view.screen === "tracking") {
      const url = new URL(window.location.href);
      url.searchParams.set("code", view.code);
      window.history.replaceState(null, "", url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState(null, "", url.toString());
    }
  }, [view]);

  if (view.screen === "tracking") {
    return (
      <Suspense fallback={<PageLoading />}>
        <TrackingResult
          code={view.code}
          onBack={() => setView({ screen: "landing" })}
          onAdmin={() => setView({ screen: "admin" })}
        />
      </Suspense>
    );
  }

  if (view.screen === "admin") {
    return (
      <Suspense fallback={<PageLoading />}>
        <AdminPage
          onBack={() => setView({ screen: "landing" })}
          onTrack={(code) => setView({ screen: "tracking", code })}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <LandingPage
        onTrack={(code) => setView({ screen: "tracking", code })}
        onAdmin={() => setView({ screen: "admin" })}
      />
    </Suspense>
  );
}

export default App;
