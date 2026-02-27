
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { QuizPage } from './pages/QuizPage';
import { ResultsPage } from './pages/ResultsPage';
import { PDFReportTemplate } from './components/PDFReportTemplate';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<QuizPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/pdfreport" element={<PDFReportTemplate />} />

      </Routes>
      <Analytics />
      <SpeedInsights />
    </Router>
  );
};

export default App;