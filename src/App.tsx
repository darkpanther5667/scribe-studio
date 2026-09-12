import { Whiteboard } from "./components/Whiteboard";
import { ToastProvider } from "./components/ToastHub";

export default function App() {
  return (
    <ToastProvider>
      <Whiteboard />
    </ToastProvider>
  );
}
