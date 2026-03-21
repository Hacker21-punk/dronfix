import crypto from "crypto";

/**
 * Aadhaar Verification Service Layer
 * 
 * Supports two modes:
 * 1. Mock OTP (default) — generates a fixed OTP for testing
 * 2. External API (future) — plug in Signzy / IDfy / Karza
 * 
 * Switch providers by implementing the AadhaarProvider interface
 * and changing the active provider below.
 */

export interface AadhaarProvider {
  sendOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string; otpHash: string; expiresAt: Date }>;
  verifyOtp(otpHash: string, otp: string): Promise<{ success: boolean; message: string }>;
}

// ─── Mock Provider (default for development) ─────────────────────────────────
class MockAadhaarProvider implements AadhaarProvider {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

  async sendOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string; otpHash: string; expiresAt: Date }> {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Hash the OTP for storage
    const otpHash = crypto.createHash("sha256").update(otp + aadhaarNumber).digest("hex");

    // Store internally for verification
    this.otpStore.set(otpHash, { otp, expiresAt });

    console.log(`[Mock Aadhaar] OTP for ${maskAadhaar(aadhaarNumber)}: ${otp}`);

    return {
      success: true,
      message: `OTP sent successfully (Mock: ${otp})`,
      otpHash,
      expiresAt,
    };
  }

  async verifyOtp(otpHash: string, otp: string): Promise<{ success: boolean; message: string }> {
    const stored = this.otpStore.get(otpHash);

    if (!stored) {
      return { success: false, message: "Invalid or expired OTP session" };
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(otpHash);
      return { success: false, message: "OTP has expired" };
    }

    if (stored.otp !== otp) {
      return { success: false, message: "Incorrect OTP" };
    }

    this.otpStore.delete(otpHash);
    return { success: true, message: "Aadhaar verified successfully" };
  }
}

// ─── Future Provider Template ────────────────────────────────────────────────
// class SignzyProvider implements AadhaarProvider {
//   async sendOtp(aadhaarNumber: string) { /* Call Signzy API */ }
//   async verifyOtp(otpHash: string, otp: string) { /* Verify via Signzy */ }
// }

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function maskAadhaar(aadhaar: string): string {
  const clean = aadhaar.replace(/\D/g, "");
  if (clean.length !== 12) return "XXXX-XXXX-XXXX";
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

export function validateAadhaar(aadhaar: string): boolean {
  const clean = aadhaar.replace(/\D/g, "");
  return clean.length === 12;
}

// ─── Active Provider ─────────────────────────────────────────────────────────
// Change this to switch providers without touching frontend or controllers
const activeProvider: AadhaarProvider = new MockAadhaarProvider();

export const aadhaarService = {
  sendOtp: (aadhaar: string) => activeProvider.sendOtp(aadhaar),
  verifyOtp: (otpHash: string, otp: string) => activeProvider.verifyOtp(otpHash, otp),
  maskAadhaar,
  validateAadhaar,
};
