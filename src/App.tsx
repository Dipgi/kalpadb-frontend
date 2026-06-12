import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import HomePage from "./pages/HomePage";
import BrowsePage from "./pages/BrowsePage";
import WorkDetailPage from "./pages/WorkDetailPage";
import PersonDetailPage from "./pages/PersonDetailPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ShelfPage from "./pages/ShelfPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminQueue from "./pages/admin/AdminQueue";
import AdminNews from "./pages/admin/AdminNews";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTagging from "./pages/admin/AdminTagging";
import AdminAdd from "./pages/admin/AdminAdd";
import NewsDetailPage from "./pages/NewsDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min cache
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/works/:id" element={<WorkDetailPage />} />
                <Route path="/persons/:id" element={<PersonDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/shelf" element={<ShelfPage />} />
                <Route path="/news/:slug" element={<NewsDetailPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="queue" element={<AdminQueue />} />
                  <Route path="news" element={<AdminNews />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="tagging" element={<AdminTagging />} />
                  <Route path="add" element={<AdminAdd />} />
                </Route>
              </Routes>
              </ErrorBoundary>
            </main>
            <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
              &copy; 2026 Dip Ghosh. All rights reserved.
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
