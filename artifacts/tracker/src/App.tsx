import { useState } from "react";
import LandingPage from "@/pages/LandingPage";
import TrackingResult from "@/pages/TrackingResult";
import AdminPage from "@/pages/AdminPage";

type View = { screen: "landing" } | { screen: "tracking"; code: string } | { screen: "admin" };

function App() {
  const [view, setView] = useState<View>({ screen: "landing" });

  if (view.screen === "tracking") {
    return (
      <TrackingResult
        code={view.code}
        onBack={() => setView({ screen: "landing" })}
        onAdmin={() => setView({ screen: "admin" })}
      />
    );
  }

  if (view.screen === "admin") {
    return (
      <AdminPage
        onBack={() => setView({ screen: "landing" })}
        onTrack={(code) => setView({ screen: "tracking", code })}
      />
    );
  }

  return (
    <LandingPage
      onTrack={(code) => setView({ screen: "tracking", code })}
      onAdmin={() => setView({ screen: "admin" })}
    />
  );
}

export default App;
