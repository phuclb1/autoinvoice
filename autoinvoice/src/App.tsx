import { Layout } from './components/layout/Layout';
import { useTauriEvents } from './hooks';

function App() {
  // Initialize Tauri event listeners
  useTauriEvents();

  return <Layout />;
}

export default App;
