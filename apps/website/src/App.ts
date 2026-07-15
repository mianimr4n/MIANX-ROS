import AuthForm from './components/AuthForm';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Telepizza Platform</h1>
      <p>Welcome! Please login or sign up to continue.</p>
      
      {/* Yahan hum ne AuthForm component ko call kiya hai */}
      <AuthForm />
    </div>
  );
}

export default App;