import { useAtom } from "jotai";
import { screenAtom } from "./store/screens";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import {
  IntroLoading,
  Outage,
  OutOfMinutes,
  Intro,
  Instructions,
  Conversation,
  FinalScreen,
  Settings,
  TeamsSimulator,
} from "./screens";

function App() {
  const [{ currentScreen }] = useAtom(screenAtom);

  const renderScreen = () => {
    switch (currentScreen) {
      case "introLoading":
        return <IntroLoading />;
      case "outage":
        return <Outage />;
      case "outOfMinutes":
        return <OutOfMinutes />;
      case "intro":
        return <Intro />;
      case "settings":
        return <Settings />;
      case "instructions":
        return <Instructions />;
      case "conversation":
        return <Conversation />;
      case "finalScreen":
        return <FinalScreen />;
      case "teamsSimulator":
        return <TeamsSimulator />;
      default:
        return <IntroLoading />;
    }
  };

  const showHeaderFooter = currentScreen !== "introLoading" && currentScreen !== "teamsSimulator";

  return (
    <main className="flex h-svh flex-col items-center justify-between gap-3 p-5 sm:gap-4 lg:p-8 bg-black">
      {showHeaderFooter && <Header />}
      {renderScreen()}
      {showHeaderFooter && <Footer />}
    </main>
  );
}

export default App;