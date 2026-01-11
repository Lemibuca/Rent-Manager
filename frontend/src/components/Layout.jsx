//src/components/Layout.jsx
import Nav from "./Nav.jsx";

export default function Layout({ children }) {
  return (
    <div className="app">
      <Nav />
      <main className="main">
        {children}
      </main>
    </div>
  );
}
