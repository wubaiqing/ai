
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import News from './pages/News';
import ArticleDetail from './pages/ArticleDetail';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white text-gray-900">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />
            <Route path="/article/:slug" element={<ArticleDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
