// client/src/components/Header.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/useAuth";
import { useGame } from "../store/useGame";
import LoginButton from "./LoginButton";

export default function Header() {
    const { user, setUser, logout } = useAuth();
    const resetGame = useGame((s) => s.reset);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
                setOpen(false);
            }
        }
        function handleKeyDown(e) {
            if (e.key === "Escape" && open) {
                setOpen(false);
                buttonRef.current?.focus();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const handleLogout = async () => {
        setOpen(false);
        await logout();
        resetGame();
        navigate("/");
    };

    return (
        <header className="mb-6 flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <Link
                to="/"
                className="flex items-center gap-2 text-xl font-bold tracking-tight text-zinc-100 hover:text-white"
            >
                <span role="img" aria-label="headphones">🎧</span> Guess the Song
            </Link>

            <div className="relative">
                {user ? (
                    <div>
                        <button
                            ref={buttonRef}
                            onClick={() => setOpen((prev) => !prev)}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            aria-label="User menu"
                            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 transition hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <span className="text-sm font-semibold text-zinc-200">
                                    {(user.name?.[0] || "U").toUpperCase()}
                                </span>
                            )}
                        </button>

                        {open && (
                            <div
                                ref={menuRef}
                                role="menu"
                                aria-orientation="vertical"
                                className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl shadow-black/50"
                            >
                                <div className="px-3 py-2">
                                    <p className="truncate text-sm font-medium text-zinc-100">{user.name}</p>
                                    {user.email && (
                                        <p className="truncate text-xs text-zinc-400">{user.email}</p>
                                    )}
                                </div>

                                <div className="my-1 border-t border-zinc-800" />

                                <Link
                                    to="/profile"
                                    role="menuitem"
                                    onClick={() => setOpen(false)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:outline-none"
                                >
                                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Profile
                                </Link>

                                <div className="my-1 border-t border-zinc-800" />

                                <button
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:outline-none"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <LoginButton onLogin={setUser} />
                )}
            </div>
        </header>
    );
}

