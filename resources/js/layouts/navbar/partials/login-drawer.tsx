import { Form, usePage } from '@inertiajs/react';
import { ArrowRight, Mail, LockKeyhole } from 'lucide-react';
import { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import AppLogo from '@/components/app-logo';
import InputError from '@/components/input-error';
import LoadingButton from '@/components/loading-button';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetTitle,
   SheetTrigger,
} from '@/components/ui/sheet';
import { store as recover } from '@/routes/forgot-password';
import { store as login } from '@/routes/login';
import { store as register } from '@/routes/register';

interface LoginOptions {
   google: boolean;
   recaptcha: { status: boolean; siteKey: string };
}
type Mode = 'login' | 'register' | 'recover';

export default function LoginDrawer() {
   const { props } = usePage<
      SharedData & { loginOptions?: LoginOptions; authStatus?: string }
   >();
   const options = props.loginOptions;
   const [open, setOpen] = useState(false);
   const [mode, setMode] = useState<Mode>('login');
   const [captchaToken, setCaptchaToken] = useState('');
   const captcha = useRef<ReCAPTCHA | null>(null);
   const title =
      mode === 'login'
         ? 'Welcome back'
         : mode === 'register'
           ? 'Create account'
           : 'Reset password';
   const switchMode = (next: Mode) => {
      setMode(next);
      setCaptchaToken('');
   };
   const captchaActive = mode !== 'recover' && !!options?.recaptcha.status;

   return (
      <Sheet
         open={open}
         onOpenChange={(next) => {
            setOpen(next);

            if (!next) {
               switchMode('login');
            }
         }}
      >
         <SheetTrigger asChild>
            <Button className="ubi-get-started">
               Get started <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
         </SheetTrigger>
         <SheetContent
            side="right"
            className="ubi-login-drawer"
            overlayClassName="bg-black/35 backdrop-blur-sm motion-reduce:animate-none"
         >
            <div className="ubi-login-brand">
               <AppLogo theme="dark" />
            </div>
            <div className="ubi-login-body">
               <div
                  className="ubi-login-intro ubi-login-reveal"
                  style={{ animationDelay: '100ms' }}
               >
                  <SheetTitle className="ubi-login-title">{title}</SheetTitle>
                  <SheetDescription
                     className={
                        mode === 'recover' ? 'ubi-login-description' : 'sr-only'
                     }
                  >
                     {mode === 'recover'
                        ? 'Enter your email to receive a reset link.'
                        : title + ' to Ubi Learn.'}
                  </SheetDescription>
               </div>
               <Form
                  key={mode}
                  {...(mode === 'login'
                     ? login.form()
                     : mode === 'register'
                       ? register.form()
                       : recover.form())}
                  resetOnSuccess={['password', 'password_confirmation']}
                  onError={() => {
                     captcha.current?.reset();
                     setCaptchaToken('');
                  }}
                  transform={(data) =>
                     mode === 'recover'
                        ? data
                        : {
                             ...data,
                             recaptcha: captchaToken,
                             recaptcha_status: captchaActive,
                          }
                  }
                  className="ubi-login-form ubi-login-reveal"
                  style={{ animationDelay: '180ms' }}
               >
                  {({ processing, errors }) => (
                     <>
                        {mode === 'register' && (
                           <div className="ubi-login-field">
                              <Label htmlFor="drawer-name">Full name</Label>
                              <Input
                                 id="drawer-name"
                                 name="name"
                                 required
                                 autoComplete="name"
                                 placeholder="Your name"
                                 className="ubi-login-input"
                              />
                              <InputError message={errors.name} />
                           </div>
                        )}
                        <div className="ubi-login-field">
                           <Label htmlFor="drawer-email">Email address</Label>
                           <div className="ubi-input-icon">
                              <Mail size={18} aria-hidden="true" />
                              <Input
                                 id="drawer-email"
                                 name="email"
                                 type="email"
                                 required
                                 autoComplete="email"
                                 placeholder="you@example.com"
                                 className="ubi-login-input"
                              />
                           </div>
                           <InputError message={errors.email} />
                        </div>
                        {mode !== 'recover' && (
                           <div className="ubi-login-field">
                              <Label htmlFor="drawer-password">Password</Label>
                              <div className="ubi-input-icon">
                                 <LockKeyhole size={18} aria-hidden="true" />
                                 <PasswordInput
                                    id="drawer-password"
                                    name="password"
                                    required
                                    minLength={
                                       mode === 'register' ? 8 : undefined
                                    }
                                    autoComplete={
                                       mode === 'register'
                                          ? 'new-password'
                                          : 'current-password'
                                    }
                                    placeholder="Enter your password"
                                    className="ubi-login-input"
                                 />
                              </div>
                              <InputError message={errors.password} />
                           </div>
                        )}
                        {mode === 'register' && (
                           <div className="ubi-login-field">
                              <Label htmlFor="drawer-password-confirmation">
                                 Confirm password
                              </Label>
                              <PasswordInput
                                 id="drawer-password-confirmation"
                                 name="password_confirmation"
                                 required
                                 autoComplete="new-password"
                                 placeholder="Repeat your password"
                                 className="ubi-login-input"
                              />
                              <InputError
                                 message={errors.password_confirmation}
                              />
                           </div>
                        )}
                        {mode === 'login' && (
                           <div className="ubi-login-options">
                              <label className="ubi-login-remember">
                                 <input
                                    type="checkbox"
                                    name="remember"
                                    value="1"
                                 />
                                 Remember me
                              </label>
                              <button
                                 type="button"
                                 className="ubi-drawer-link"
                                 onClick={() => switchMode('recover')}
                              >
                                 Forgot password?
                              </button>
                           </div>
                        )}
                        {captchaActive && options && (
                           <div>
                              <ReCAPTCHA
                                 ref={captcha}
                                 sitekey={options.recaptcha.siteKey}
                                 onChange={(token) =>
                                    setCaptchaToken(token ?? '')
                                 }
                              />
                              <InputError message={errors.recaptcha} />
                           </div>
                        )}
                        {mode === 'recover' && props.authStatus && (
                           <p role="status" className="ubi-auth-status">
                              {props.authStatus}
                           </p>
                        )}
                        {props.flash?.error && (
                           <p role="alert" className="ubi-auth-error">
                              {props.flash.error}
                           </p>
                        )}
                        <LoadingButton
                           brandAnimation={mode !== 'recover'}
                           loading={processing}
                           className="ubi-login-submit"
                        >
                           {mode === 'login'
                              ? 'Log in'
                              : mode === 'register'
                                ? 'Create account'
                                : 'Send reset link'}{' '}
                           <ArrowRight size={17} aria-hidden="true" />
                        </LoadingButton>
                     </>
                  )}
               </Form>
               <div className="ubi-login-signup">
                  <button
                     type="button"
                     className="ubi-drawer-link"
                     onClick={() =>
                        switchMode(mode === 'login' ? 'register' : 'login')
                     }
                  >
                     {mode === 'login' ? 'Create account' : 'Back to log in'}
                  </button>
               </div>
               {mode !== 'recover' && (
                  <div
                     className="ubi-login-reveal"
                     style={{ animationDelay: '260ms' }}
                  >
                     <div className="ubi-login-divider">
                        <span />
                        or
                        <span />
                     </div>
                     {options?.google ? (
                        <a href="/auth/google" className="ubi-google-button">
                           <GoogleIcon />
                           Log in with Google
                        </a>
                     ) : (
                        <button
                           type="button"
                           disabled
                           className="ubi-google-button"
                           title="Google login is not configured"
                        >
                           <GoogleIcon />
                           Log in with Google
                        </button>
                     )}
                  </div>
               )}
            </div>
         </SheetContent>
      </Sheet>
   );
}

function GoogleIcon() {
   return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
         <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
         />
         <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
         />
         <path
            fill="#FBBC05"
            d="M6.41 13.93a6 6 0 0 1 0-3.86V7.48H3.07a10 10 0 0 0 0 9.04l3.34-2.59Z"
         />
         <path
            fill="#EA4335"
            d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.58 9.58 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59A5.99 5.99 0 0 1 12 5.95Z"
         />
      </svg>
   );
}
