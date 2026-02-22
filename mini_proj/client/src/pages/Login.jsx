import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Textbox } from "../components";
import { useLoginMutation, useRegisterMutation } from "../redux/slices/api/authApiSlice";
import { setCredentials } from "../redux/slices/authSlice";

const Login = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // ── Forms Setup ──────────────────────────────────────────────────────────
    const {
        register: registerLogin,
        handleSubmit: handleSubmitLogin,
        formState: { errors: loginErrors },
        watch: watchLogin,
    } = useForm();

    const {
        register: registerSignup,
        handleSubmit: handleSubmitSignup,
        reset: resetSignup,
        formState: { errors: signupErrors },
    } = useForm();

    // ── State & API ──────────────────────────────────────────────────────────
    const [isFlipped, setIsFlipped] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const [login, { isLoading: isLoginLoading }] = useLoginMutation();
    const [registerUser, { isLoading: isRegisterLoading }] = useRegisterMutation();

    useEffect(() => {
        if (user) navigate("/dashboard");
    }, [user, navigate]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleLogin = async (data) => {
        try {
            const res = await login(data).unwrap();
            dispatch(setCredentials(res));
            navigate("/");
            toast.success("Login successful!");
        } catch (err) {
            toast.error(err?.data?.message || err.error || "Login failed");
        }
    };

    const handleRegister = async (data) => {
        try {
            await registerUser(data).unwrap();
            toast.success("Account created successfully! Please log in.");
            resetSignup();
            setIsFlipped(false); // Flip back to login side
        } catch (err) {
            toast.error(err?.data?.message || err.error || "Registration failed");
        }
    };

    return (
        <div className='w-full min-h-screen flex items-center justify-center flex-col lg:flex-row bg-[#f3f4f6] dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#302943] via-slate-900 to-black overflow-hidden'>
            <div className='w-full max-w-7xl mx-auto flex gap-10 md:gap-20 flex-col lg:flex-row items-center justify-center p-6'>
                {/* ── Left Side: Brand Context ────────────────────────────── */}
                <div className='w-full lg:w-1/2 flex flex-col items-center lg:items-start justify-center text-center lg:text-left z-10'>
                    <div className='flex flex-col items-center lg:items-start justify-center gap-6'>
                        <span className='flex gap-1 py-1.5 px-4 border rounded-full text-sm font-semibold tracking-wide dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 border-gray-300 bg-white/50 text-gray-600 shadow-sm backdrop-blur-sm'>
                            Manage all your tasks in one place!
                        </span>
                        <h1 className='flex flex-col gap-2 text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-700 to-indigo-900 dark:from-indigo-400 dark:via-blue-300 dark:to-white drop-shadow-sm'>
                            <span>Cloud-based</span>
                            <span>Task Manager</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl font-medium max-w-md">
                            The ultimate governance platform to organize, track, and elevate your team's productivity.
                        </p>

                        {/* Decorative Element */}
                        <div className='hidden lg:flex cell mt-8 ml-4'>
                            <div className='circle rotate-in-up-left'></div>
                        </div>
                    </div>
                </div>

                {/* ── Right Side: 3D Flip Card Container ──────────────────── */}
                <div className='w-full lg:w-1/2 flex justify-center items-center perspective-[2000px] z-20'>

                    {/* Perspective Wrapper */}
                    <div
                        className={`relative w-full max-w-[440px] transition-transform duration-700 transform-style-3d`}
                        style={{
                            transformStyle: "preserve-3d",
                            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                            minHeight: isFlipped ? "680px" : "520px" // Dynamic height matching roughly the form heights
                        }}
                    >

                        {/* ── Front Face: LOGIN FORM ────────────────────────── */}
                        <div
                            className="absolute inset-0 w-full h-fit bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 dark:border-slate-700/50 p-10 flex flex-col overflow-hidden"
                            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                        >
                            <form onSubmit={handleSubmitLogin(handleLogin)} className="flex flex-col gap-y-6 h-full justify-between">
                                <div>
                                    <h2 className='text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 text-center mb-2'>
                                        Welcome Back
                                    </h2>
                                    <p className='text-center text-sm font-medium text-gray-500 dark:text-gray-400'>
                                        Sign in to continue your journey
                                    </p>
                                </div>

                                <div className='flex flex-col gap-y-5 flex-1 mt-4'>
                                    <Textbox
                                        placeholder='you@example.com'
                                        type='email'
                                        name='email'
                                        label='Email Address'
                                        className='w-full rounded-full dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50 transition-shadow'
                                        register={registerLogin("email", { required: "Email Address is required!" })}
                                        error={loginErrors.email ? loginErrors.email.message : ""}
                                    />
                                    <Textbox
                                        placeholder='••••••••'
                                        type='password'
                                        name='password'
                                        label='Password'
                                        className='w-full rounded-full dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50 transition-shadow'
                                        register={registerLogin("password", { required: "Password is required!" })}
                                        error={loginErrors.password ? loginErrors.password?.message : ""}
                                    />
                                    <div className="flex justify-end w-full cursor-not-allowed">
                                        <span className='text-xs font-semibold text-gray-400 dark:text-gray-600 transition-colors'>
                                            Forgot Password?
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    {isLoginLoading ? (
                                        <div className="flex justify-center"><Loading /></div>
                                    ) : (
                                        <Button
                                            type='submit'
                                            label='Log In'
                                            className='w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full font-bold shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5'
                                        />
                                    )}
                                </div>

                                <div className="mt-6 text-center border-t border-gray-200 dark:border-slate-800 pt-6">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Don't have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setIsFlipped(true)}
                                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-800 transition-colors"
                                        >
                                            Sign Up
                                        </button>
                                    </p>
                                </div>
                            </form>
                        </div>

                        {/* ── Back Face: REGISTER FORM ──────────────────────── */}
                        <div
                            className="absolute inset-0 w-full h-fit bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 dark:border-slate-700/50 p-8 sm:p-10 flex flex-col overflow-hidden"
                            style={{
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                                transform: "rotateY(180deg)"
                            }}
                        >
                            <form onSubmit={handleSubmitSignup(handleRegister)} className="flex flex-col gap-y-5 h-full justify-between">
                                <div>
                                    <h2 className='text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 text-center mb-1'>
                                        Create Account
                                    </h2>
                                    <p className='text-center text-sm font-medium text-gray-500 dark:text-gray-400'>
                                        Join us and start managing tasks
                                    </p>
                                </div>

                                <div className='flex flex-col gap-y-4 flex-1 mt-2'>
                                    <Textbox
                                        placeholder='John Doe'
                                        type='text'
                                        name='name'
                                        label='Full Name'
                                        className='w-full rounded-2xl dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50 transition-shadow'
                                        register={registerSignup("name", { required: "Full name is required!" })}
                                        error={signupErrors.name ? signupErrors.name.message : ""}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Textbox
                                            placeholder='Software Engineer'
                                            type='text'
                                            name='title'
                                            label='Job Title'
                                            className='w-full rounded-2xl dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50'
                                            register={registerSignup("title", { required: "Title is required!" })}
                                            error={signupErrors.title ? signupErrors.title.message : ""}
                                        />
                                        <Textbox
                                            placeholder='Role'
                                            type='text'
                                            name='role'
                                            label='Role'
                                            className='w-full rounded-2xl dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50'
                                            register={registerSignup("role", { required: "Role is required!" })}
                                            error={signupErrors.role ? signupErrors.role.message : ""}
                                        />
                                    </div>

                                    <Textbox
                                        placeholder='you@example.com'
                                        type='email'
                                        name='email'
                                        label='Email Address'
                                        className='w-full rounded-2xl dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50 transition-shadow'
                                        register={registerSignup("email", { required: "Email Address is required!" })}
                                        error={signupErrors.email ? signupErrors.email.message : ""}
                                    />
                                    <Textbox
                                        placeholder='••••••••'
                                        type='password'
                                        name='password'
                                        label='Password'
                                        className='w-full rounded-2xl dark:bg-slate-800/80 focus:ring-2 focus:ring-indigo-500/50 transition-shadow'
                                        register={registerSignup("password", { required: "Password is required!", minLength: { value: 6, message: "Must be at least 6 characters" } })}
                                        error={signupErrors.password ? signupErrors.password?.message : ""}
                                    />

                                    {/* Elevated Admin Toggle */}
                                    <div className="flex items-center justify-between p-3 mt-1 rounded-2xl bg-indigo-500/5 dark:bg-indigo-900/10 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Register as Administrator</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Grants full workspace edit privileges</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" {...registerSignup("isAdmin")} />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    {isRegisterLoading ? (
                                        <div className="flex justify-center"><Loading /></div>
                                    ) : (
                                        <Button
                                            type='submit'
                                            label='Sign Up'
                                            className='w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-[1.25rem] font-bold shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5'
                                        />
                                    )}
                                </div>

                                <div className="mt-4 text-center border-t border-gray-200 dark:border-slate-800 pt-5">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setIsFlipped(false)}
                                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-800 transition-colors"
                                        >
                                            Log In
                                        </button>
                                    </p>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;