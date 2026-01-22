import { Navigate, Route, Routes } from "react-router-dom";
import SongPlayerPage from "./pages/SongPlayerPage";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/song/sample" replace />} />
        <Route path="/song/:songId" element={<SongPlayerPage />} />
        <Route path="*" element={<div className="p-6">Not found</div>} />
      </Routes>
    </div>
  );
}
