// client/src/components/LoginButton.jsx
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../lib/api";

export default function LoginButton({ onLogin }) {
    return (
        <GoogleLogin
            onSuccess={async ({ credential }) => {
                const { data } = await api.post("/auth/google", { credential });
                onLogin(data.user);
            }}
            onError={() => console.error("Google login failed")}
        />
    );
}