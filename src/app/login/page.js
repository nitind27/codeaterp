'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

// Office Location Configuration (Surat, Gujarat)
const OFFICE_LOCATION = {
  latitude: 21.137,
  longitude: 72.844,
  radiusInKm: 0.5 // 500 meters radius
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error, denied

  useEffect(() => {
    setMounted(true);
    
    // Check if redirected due to session expiry
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('sessionExpired') === 'true') {
        setError('You have logged in from another device. Your previous session has been logged out.');
        toast.error('🔐 You have been logged out here because of login from another device.', { duration: 6000 });
        // Clean up the URL
        window.history.replaceState({}, document.title, '/login');
      }
    }
  }, []);

  // Get user's current location
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          resolve(location);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied. Please enable location to login.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information unavailable. Please try again.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out. Please try again.'));
              break;
            default:
              reject(new Error('Unable to get your location. Please try again.'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };

  // Check if user is within office radius
  const isWithinOfficeRadius = (userLat, userLon) => {
    const distance = calculateDistance(
      userLat,
      userLon,
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );
    return {
      isWithin: distance <= OFFICE_LOCATION.radiusInKm,
      distance: distance.toFixed(2)
    };
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    
    if (value && !validateEmail(value)) {
      setErrors({ ...errors, email: 'Please enter a valid email address' });
    } else {
      setErrors({ ...errors, email: '' });
    }
    setError('');
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, password: value });
    
    if (value && !validatePassword(value)) {
      setErrors({ ...errors, password: 'Password must be at least 6 characters' });
    } else {
      setErrors({ ...errors, password: '' });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    let hasErrors = false;
    const newErrors = { email: '', password: '' };

    if (!formData.email) {
      newErrors.email = 'Email is required';
      hasErrors = true;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      hasErrors = true;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      hasErrors = true;
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
      hasErrors = true;
    }

    setErrors(newErrors);
    if (hasErrors) return;

    setLoading(true);
    setLocationStatus('loading');

    try {
      // First, get user's location
      let location = null;
      try {
        location = await getUserLocation();
        setUserLocation(location);
        setLocationStatus('success');
      } catch (locationError) {
        // Location might fail, but we'll let the server decide if it's required
        console.log('Location error:', locationError.message);
        setLocationStatus('error');
      }

      // Prepare login data with location
      const loginData = {
        ...formData,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude
        } : null
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (data.success) {
        // Store token and session token
        localStorage.setItem('token', data.token);
        localStorage.setItem('sessionToken', data.sessionToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Check if user was logged out from another device
        if (data.previousSessionLoggedOut) {
          toast.success('Logged in! Previous session has been logged out.', { duration: 4000 });
        } else {
          toast.success('Login successful!');
        }
        
        router.push('/dashboard');
      } else {
        const errorMsg = data.error || 'Invalid email or password. Please check your credentials.';
        setError(errorMsg);
        toast.error(errorMsg);
        
        // If location error, show additional guidance
        if (data.locationRequired) {
          setLocationStatus('denied');
        }
      }
    } catch (err) {
      const errorMsg = 'Network error. Please check your connection and try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A656D] via-[#0A2A2D] to-[#030a0b]">
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]"></div>
        
        {/* Floating Orbs */}
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        
        {/* Glowing Lines */}
        <div className="glow-line glow-line-1"></div>
        <div className="glow-line glow-line-2"></div>
        
        {/* Particle Effect */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className={`hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          <div className="max-w-md text-center">
            {/* Logo */}
            <div className="mb-8 logo-float">
              <div className="inline-block p-6 rounded-3xl bg-gradient-to-br from-[#1A656D]/30 to-transparent backdrop-blur-sm border border-[#31747c]/30 shadow-2xl shadow-[#1A656D]/20">
                <Image
                  src="/H_LOGO-01.png"
                  alt="Codeat Infotech Logo"
                  width={220}
                  height={66}
                  className="h-auto"
                  priority
                />
              </div>
            </div>
            
            {/* Tagline */}
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-[#F6FBFB] via-[#e8f0f0] to-[#bad1d3] bg-clip-text text-transparent">
                Enterprise Resource
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#1A656D] to-[#31747c] bg-clip-text text-transparent">
                Planning System
              </span>
            </h1>
            
            <p className="text-[#8db2b6] text-lg mb-10 leading-relaxed">
              Streamline your business operations with our comprehensive ERP solution designed for modern enterprises.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {['Real-time Analytics', 'Team Management', 'Project Tracking', 'HR Solutions'].map((feature, idx) => (
                <div 
                  key={feature}
                  className="feature-pill px-4 py-2 rounded-full text-sm font-medium text-[#e8f0f0]/90 bg-[#0d3337]/50 border border-[#12474c]/60 backdrop-blur-sm"
                  style={{ animationDelay: `${0.8 + idx * 0.1}s` }}
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className={`w-full max-w-md transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Login Card */}
            <div className="login-card relative">
              {/* Card Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#1A656D]/60 via-[#31747c]/60 to-[#1A656D]/60 rounded-3xl blur-xl opacity-40 animate-pulse-slow"></div>
              
              <div className="relative bg-[#0A2A2D]/95 backdrop-blur-xl rounded-2xl border border-[#12474c]/60 p-8 lg:p-10 shadow-2xl">
                {/* Mobile Logo */}
                <div className="lg:hidden text-center mb-8">
                  <div className="inline-block p-4 rounded-2xl bg-[#081e21]/60 border border-[#12474c]/40 mb-4">
                    <Image
                      src="/H_LOGO-01.png"
                      alt="Codeat Infotech Logo"
                      width={160}
                      height={48}
                      className="h-auto"
                      priority
                    />
                  </div>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A656D] to-[#175b62] mb-4 shadow-lg shadow-[#1A656D]/40">
                    <svg className="w-8 h-8 text-[#F6FBFB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-[#F6FBFB] mb-2">Welcome Back</h2>
                  <p className="text-[#8db2b6] text-sm">Sign in to continue to your dashboard</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-shake">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-red-300 text-sm font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Location Status for Employee/Intern */}
                {locationStatus === 'denied' && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-amber-300 text-sm font-medium">Location Access Required</p>
                        <p className="text-amber-400/70 text-xs mt-1">Employees and Interns must be at office location to login. Please enable location access.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div className="form-group">
                    <label className="block text-[#e8f0f0] text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <div className={`input-wrapper relative rounded-xl transition-all duration-300 ${focusedField === 'email' ? 'ring-2 ring-[#1A656D]/60 shadow-lg shadow-[#1A656D]/30' : ''}`}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-[#31747c]' : 'text-[#5f9399]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={handleEmailChange}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-12 pr-4 py-3.5 bg-[#081e21]/80 border rounded-xl text-[#F6FBFB] placeholder-[#5f9399]/70 focus:outline-none transition-all duration-300 ${
                          errors.email || error
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-[#12474c]/60 hover:border-[#175b62] focus:border-[#1A656D]'
                        }`}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-2 text-xs text-red-400 flex items-center animate-slideDown">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="form-group">
                    <label className="block text-[#e8f0f0] text-sm font-medium mb-2">
                      Password
                    </label>
                    <div className={`input-wrapper relative rounded-xl transition-all duration-300 ${focusedField === 'password' ? 'ring-2 ring-[#1A656D]/60 shadow-lg shadow-[#1A656D]/30' : ''}`}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-[#31747c]' : 'text-[#5f9399]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handlePasswordChange}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-12 pr-12 py-3.5 bg-[#081e21]/80 border rounded-xl text-[#F6FBFB] placeholder-[#5f9399]/70 focus:outline-none transition-all duration-300 ${
                          errors.password || error
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-[#12474c]/60 hover:border-[#175b62] focus:border-[#1A656D]'
                        }`}
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#5f9399] hover:text-[#31747c] transition-colors duration-300 z-10"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-xs text-red-400 flex items-center animate-slideDown">
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="login-btn relative w-full py-4 rounded-xl font-semibold text-[#F6FBFB] overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Button Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1A656D] via-[#175b62] to-[#1A656D] bg-[length:200%_100%] animate-gradient-x"></div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-[#F6FBFB]/0 group-hover:bg-[#F6FBFB]/10 transition-all duration-300"></div>
                    
                    {/* Button Shine Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-[#F6FBFB]/20 to-transparent"></div>
                    </div>
                    
                    {/* Button Content */}
                    <span className="relative flex items-center justify-center">
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#F6FBFB]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {locationStatus === 'loading' ? 'Getting Location...' : 'Signing in...'}
                        </>
                      ) : (
                        <>
                          Sign In
                          <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                  <p className="text-[#5f9399]/70 text-xs">
                    © 2024 Codeat Infotech. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
