import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import { Suspense } from "react";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import HomePage from "./pages/HomePage";
import BrowsePage from "./pages/BrowsePage";
// Code-split: keeps the recharts bundle out of the main chunk until /explore is opened.
// lazyWithRetry recovers from stale chunk hashes after a redeploy (one-time reload).
const ExplorePage = lazyWithRetry(() => import("./pages/ExplorePage"));
import WorkDetailPage from "./pages/WorkDetailPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import PersonDetailPage from "./pages/PersonDetailPage";
import PublisherDetailPage from "./pages/PublisherDetailPage";
import BrowsePersonsPage from "./pages/BrowsePersonsPage";
import BrowsePublishersPage from "./pages/BrowsePublishersPage";
import BrowseSeriesPage from "./pages/BrowseSeriesPage";
import BrowseMagazinesPage from "./pages/BrowseMagazinesPage";
import BrowseIssuesPage from "./pages/BrowseIssuesPage";
import SeriesDetailPage from "./pages/SeriesDetailPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ShelfPage from "./pages/ShelfPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminQueue from "./pages/admin/AdminQueue";
import AdminNews from "./pages/admin/AdminNews";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminVolunteerRequests from "./pages/admin/AdminVolunteerRequests";
import AdminTagging from "./pages/admin/AdminTagging";
import AdminTags from "./pages/admin/AdminTags";
import AdminAdd from "./pages/admin/AdminAdd";
import AdminEditBook from "./pages/admin/AdminEditBook";
import AdminEditStory from "./pages/admin/AdminEditStory";
import AdminEditMagazine from "./pages/admin/AdminEditMagazine";
import AdminEditMagazineIssue from "./pages/admin/AdminEditMagazineIssue";
import AdminEditPerson from "./pages/admin/AdminEditPerson";
import AdminEditPublisher from "./pages/admin/AdminEditPublisher";
import AdminEditSeries from "./pages/admin/AdminEditSeries";
import AdminCatalogue from "./pages/admin/AdminCatalogue";
import AdminAudit from "./pages/admin/AdminAudit";
import ContributePage from "./pages/ContributePage";
import MySubmissionsPage from "./pages/MySubmissionsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import LicensePage from "./pages/LicensePage";
import CitePage from "./pages/CitePage";
import HelpPage from "./pages/HelpPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AdminGuide from "./pages/admin/AdminGuide";

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
            <div className="bg-gray-100 text-gray-400 text-[10px] leading-none py-1 px-4 text-right font-mono">
              build {__BUILD_ID__}
            </div>
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route
                  path="/explore"
                  element={
                    <Suspense
                      fallback={
                        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-400">
                          Loading…
                        </div>
                      }
                    >
                      <ExplorePage />
                    </Suspense>
                  }
                />
                <Route path="/works/:id" element={<WorkDetailPage />} />
                <Route path="/magazines" element={<BrowseMagazinesPage />} />
                <Route path="/issues" element={<BrowseIssuesPage />} />
                <Route path="/magazines/:magId/issues/:issueId" element={<IssueDetailPage />} />
                <Route path="/persons" element={<BrowsePersonsPage />} />
                <Route path="/persons/:id" element={<PersonDetailPage />} />
                <Route path="/publishers" element={<BrowsePublishersPage />} />
                <Route path="/publishers/:id" element={<PublisherDetailPage />} />
                <Route path="/series" element={<BrowseSeriesPage />} />
                <Route path="/series/:id" element={<SeriesDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/shelf" element={<ShelfPage />} />
                <Route path="/contribute" element={<ContributePage />} />
                <Route path="/my-submissions" element={<MySubmissionsPage />} />
                <Route
                  path="/works/:id/edit"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditBook />
                    </div>
                  }
                />
                <Route
                  path="/works/:id/edit-story"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditStory />
                    </div>
                  }
                />
                <Route
                  path="/works/:id/edit-magazine"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditMagazine />
                    </div>
                  }
                />
                <Route
                  path="/magazines/:magId/issues/new"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditMagazineIssue />
                    </div>
                  }
                />
                <Route
                  path="/magazines/:magId/issues/:issueId/edit"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditMagazineIssue />
                    </div>
                  }
                />
                <Route
                  path="/persons/:id/edit"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditPerson />
                    </div>
                  }
                />
                <Route
                  path="/publishers/:id/edit"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditPublisher />
                    </div>
                  }
                />
                <Route
                  path="/series/:id/edit"
                  element={
                    <div className="max-w-3xl mx-auto px-4 py-8">
                      <AdminEditSeries />
                    </div>
                  }
                />
                <Route path="/news/:slug" element={<NewsDetailPage />} />
                <Route path="/license" element={<LicensePage />} />
                <Route path="/cite" element={<CitePage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="queue" element={<AdminQueue />} />
                  <Route path="news" element={<AdminNews />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="volunteer-requests" element={<AdminVolunteerRequests />} />
                  <Route path="tagging" element={<AdminTagging />} />
                  <Route path="tags" element={<AdminTags />} />
                  <Route path="add" element={<AdminAdd />} />
                  <Route path="catalogue" element={<AdminCatalogue />} />
                  <Route path="audit" element={<AdminAudit />} />
                  <Route path="guide" element={<AdminGuide />} />
                  <Route path="edit/:id" element={<AdminEditBook />} />
                  <Route path="edit-story/:id" element={<AdminEditStory />} />
                  <Route path="edit-magazine/:id" element={<AdminEditMagazine />} />
                  <Route path="edit-person/:id" element={<AdminEditPerson />} />
                  <Route path="edit-publisher/:id" element={<AdminEditPublisher />} />
                  <Route path="edit-series/:id" element={<AdminEditSeries />} />
                </Route>
              </Routes>
              </ErrorBoundary>
            </main>
            <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-400">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-violet-700"
                >
                  Data under CC BY-SA 4.0
                </a>
                <span aria-hidden>·</span>
                <Link to="/about" className="hover:text-violet-700">About</Link>
                <span aria-hidden>·</span>
                <Link to="/contact" className="hover:text-violet-700">Contact</Link>
                <span aria-hidden>·</span>
                <Link to="/help" className="hover:text-violet-700">Help</Link>
                <span aria-hidden>·</span>
                <Link to="/license" className="hover:text-violet-700">License</Link>
                <span aria-hidden>·</span>
                <Link to="/cite" className="hover:text-violet-700">Cite</Link>
                <span aria-hidden>·</span>
                <span>&copy; 2026 Dip Ghosh · KalpaDB&trade;</span>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
