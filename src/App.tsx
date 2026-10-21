import { useEffect } from "react";
import { useTankStore } from "./store/tankStore";
import { useAccountStore } from "./store/accountStore";
import { Garage } from "./components/garage/Garage";
import { Battle } from "./components/battle/Battle";
import { AuthScreen } from "./components/ui/AuthScreen";
import "./App.css";

export default function App() {
  const authPhase = useAccountStore((s) => s.authPhase);
  const init = useAccountStore((s) => s.init);
  const phase = useTankStore((s) => s.phase);
  const hydrate = useTankStore((s) => s.hydrateFromAccount);

  useEffect(() => {
    void (async () => {
      await init();
      const phaseNow = useAccountStore.getState().authPhase;
      if (phaseNow === "play") {
        await hydrate();
      }
    })();
  }, [init, hydrate]);

  if (authPhase === "boot") {
    return (
      <div className="app" style={{ display: "grid", placeItems: "center" }}>
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      </div>
    );
  }

  if (authPhase !== "play") {
    return (
      <div className="app">
        <AuthScreen />
      </div>
    );
  }

  return (
    <div className="app">{phase === "garage" ? <Garage /> : <Battle />}</div>
  );
}
