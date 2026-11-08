// client/src/App.jsx
import { useEffect, useState } from "react";
import { api } from "./lib/api";
import LoginButton from "./components/LoginButton";

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Runs once when the app loads
    useEffect(() => {
        api
            .get("/auth/me")
            .then(({ data }) => setUser(data.user))   // cookie valid: restore session
            .catch(() => setUser(null))                // 401: not logged in
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        await api.post("/auth/logout");
        setUser(null);
    };

    if (loading) return <p>Loading...</p>;

    return user ? (
        <div>
            <p>Welcome, {user.name}!</p>
            <button onClick={logout}>Logout</button>
        </div>
    ) : (
        <LoginButton onLogin={setUser} />
    );
}