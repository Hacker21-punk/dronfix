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
  /**
   * @param aadhaarNumber - The raw 12-digit aadhaar
   * @param consent - Strict compliance consent given in UI
   * @returns providerTransactionId and expiry instead of raw OTPs (handled by provider)
   */
  sendOtp(aadhaarNumber: string, consent: boolean): Promise<{ success: boolean; message: string; providerTransactionId: string; expiresAt: Date }>;
  verifyOtp(providerTransactionId: string, otp: string): Promise<{ success: boolean; message: string }>;
}

// ─── Real Provider Implementation (Karza / Production) ───────────────────────
class KarzaAadhaarProvider implements AadhaarProvider {
  private KARZA_URL = "https://testapi.karza.in/v3/aadhaar-consent";
  
  async sendOtp(aadhaarNumber: string, consent: boolean): Promise<{ success: boolean; message: string; providerTransactionId: string; expiresAt: Date }> {
    if (!consent) {
      throw new Error("User consent is strictly required for Aadhaar verification");
    }

    const apiKey = process.env.KARZA_API_KEY;
    
    // Strict fallback rule: Do NOT bypass verification if provider API fails (Missing KEY).
    if (!apiKey) {
      console.error("[CRITICAL] Karza API Key is absolutely missing! Rejecting Aadhaar send OTP request.");
      throw new Error("Provider API Configuration Failed: Please contact system administrator.");
    }

    try {
      // Production API signature for Karza Send OTP
      const response = await fetch(`${this.KARZA_URL}/otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-karza-key": apiKey
        },
        body: JSON.stringify({
          aadhaarNo: aadhaarNumber,
          consent: "Y"
        })
      });

      if (!response.ok) {
        throw new Error(`Provider API Failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== 101) {
        throw new Error(data.statusMessage || "Failed to trigger OTP from provider");
      }

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Usually Karza OTPs are valid for 10 mins

      console.log(`[Karza Aadhaar] OTP sent successfully for ${maskAadhaar(aadhaarNumber)}. Transaction ID: ${data.clientData.caseFormNo}`);

      return {
        success: true,
        message: "OTP sent successfully via Karza API",
        providerTransactionId: data.clientData.caseFormNo, // Return the explicit provider ID
        expiresAt,
      };
    } catch (error: any) {
      console.error("[Aadhaar Provider Error] Send OTP Failed:", error.message);
      throw new Error("Aadhaar Provider API Failed: " + error.message);
    }
  }

  async verifyOtp(providerTransactionId: string, otp: string): Promise<{ success: boolean; message: string }> {
    const apiKey = process.env.KARZA_API_KEY;
    
    if (!apiKey) {
      console.error("[CRITICAL] Karza API Key is absolutely missing! Rejecting Aadhaar verify request.");
      throw new Error("Provider API Configuration Failed: Please contact system administrator.");
    }

    try {
      // Production API signature for Karza Verify OTP
      const response = await fetch(`${this.KARZA_URL}/submit-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-karza-key": apiKey
        },
        body: JSON.stringify({
          otp: otp,
          accessKey: providerTransactionId, // Karza usually takes the accessKey back
          consent: "Y"
        })
      });

      if (!response.ok) {
        throw new Error(`Provider API Failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.statusCode !== 101) {
        return { success: false, message: data.statusMessage || "Incorrect OTP or Server Error" };
      }

      return { success: true, message: "Aadhaar verified successfully via Karza API" };
    } catch (error: any) {
      console.error("[Aadhaar Provider Error] Verify OTP Failed:", error.message);
      return { success: false, message: "Aadhaar Provider API Failed: " + error.message };
    }
  }
}

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
// Bound explicitly to the PRODUCTION provider (Karza) to prevent mock bypass.
const activeProvider: AadhaarProvider = new KarzaAadhaarProvider();

export const aadhaarService = {
  sendOtp: (aadhaar: string, consent: boolean) => activeProvider.sendOtp(aadhaar, consent),
  verifyOtp: (providerTransactionId: string, otp: string) => activeProvider.verifyOtp(providerTransactionId, otp),
  maskAadhaar,
  validateAadhaar,
};
