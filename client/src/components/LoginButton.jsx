// client/src/components/LoginButton.jsx
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../lib/api";

export default function LoginButton({ onLogin }) {
    return (
        <GoogleLogin
            onSuccess={async ({ credential }) => {
                try {
                    const { data } = await api.post("/auth/google", { credential });
                    if (data?.token) {
                        localStorage.setItem("sg_auth_token", data.token);
                    }
                    if (data?.user) {
                        onLogin(data.user);
                    }
                } catch (err) {
                    const msg = err?.response?.data?.error || err?.message || "Login request failed";
                    console.error("Backend Google sign-in failed:", msg, err);
                    alert("Google Login Error: " + msg);
                }
            }}
            onError={() => {
                console.error("Google OAuth dialog failed");
                alert("Google sign-in dialog failed. Check authorized origins in Google Cloud Console.");
            }}
        />
    );
}
