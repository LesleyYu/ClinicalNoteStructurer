import { Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';

function navLinkClass({ isActive })
{
    if (isActive) return 'text-blue-700 font-medium';
    return 'text-gray-600 hover:text-gray-900';
}

export default function App()
{
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
                    <h1 className="text-base font-semibold">ClinicalNoteStructurer</h1>
                    <nav className="flex gap-4 text-sm">
                        <NavLink to="/" end className={navLinkClass}>New Note</NavLink>
                        <NavLink to="/cases" className={navLinkClass}>Saved Cases</NavLink>
                    </nav>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-6">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/cases" element={<CasesPage />} />
                    <Route path="/cases/:id" element={<CaseDetailPage />} />
                </Routes>
            </main>
        </div>
    );
}
