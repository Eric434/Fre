import { useState } from "react";
import LandingPage from "@/pages/LandingPage";
import TrackingResult from "@/pages/TrackingResult";

function App() {
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  if (trackingCode) {
    return <TrackingResult code={trackingCode} onBack={() => setTrackingCode(null)} />;
  }
  return <LandingPage onTrack={setTrackingCode} />;
}

export default App;
