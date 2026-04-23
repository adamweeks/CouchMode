import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/progressLogic'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      if (tab === 'signin') {
        await signIn(data.email, data.password)
      } else {
        await signUp(data.email, data.password)
      }
      navigate('/', { replace: true })
    } catch (e) {
      setServerError(getErrorMessage(e))
    }
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4 bg-[#0f0f17]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Couchmode</h1>
          <p className="mt-1 text-gray-400 text-sm">Your TV rewatch tracker</p>
        </div>

        <div className="flex rounded-xl bg-gray-800 p-1" role="tablist" aria-label="Authentication options">
          <button
            role="tab"
            aria-selected={tab === 'signin'}
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
              tab === 'signin' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={tab === 'signup'}
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
              tab === 'signup' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              {...register('email')}
              id="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs text-red-300">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              {...register('password')}
              id="password"
              type="password"
              placeholder="Password"
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {errors.password && (
              <p id="password-error" role="alert" className="mt-1 text-xs text-red-300">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-red-300 text-center">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60 active:scale-95 transition-transform min-h-[44px] hover:bg-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f17]"
          >
            {isSubmitting
              ? (tab === 'signin' ? 'Signing In…' : 'Creating Account…')
              : (tab === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="px-3 text-xs text-gray-500" aria-hidden="true">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <button
          onClick={async () => {
            try {
              await signInWithGoogle()
            } catch (e) {
              setServerError(getErrorMessage(e))
            }
          }}
          className="w-full py-3 rounded-xl bg-gray-800 text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform min-h-[44px] hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f17]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
