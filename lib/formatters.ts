/**
 * Scientific and Telemetry Formatters for Auralis Orbital Intelligence
 *
 * Implements strict format specifications from 10phase_plan.md & INTERFACE_CONTRACT.md:
 * - Collision probability formatted as scientific notation with superscripts: e.g. 2.30 × 10⁻³
 * - Live TCA countdown timers: e.g. T-14h 23m 15s
 * - Distance and velocity formatters
 */

const SUPERSCRIPTS: Record<string, string> = {
  "-": "⁻",
  "+": "⁺",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/**
 * Formats a collision probability number (Pc) into clean scientific notation.
 * e.g. 0.0023 -> "2.30 × 10⁻³"
 * e.g. 4.8e-4 -> "4.80 × 10⁻⁴"
 */
export function formatScientificPc(pc: number): string {
  if (pc === 0 || !Number.isFinite(pc)) return "0.0";
  if (pc >= 0.01) return pc.toFixed(3);

  const expStr = pc.toExponential(2); // "2.30e-3"
  const [mantissa, exponent] = expStr.split("e");
  const expNum = parseInt(exponent, 10);
  const formattedExp = String(expNum)
    .split("")
    .map((char) => SUPERSCRIPTS[char] || char)
    .join("");

  return `${mantissa} × 10${formattedExp}`;
}

/**
 * Formats a TCA (Time of Closest Approach) ISO timestamp into a live countdown string.
 * e.g. Future: "T-11h 54m 32s"
 * e.g. Past: "T+02h 10m [PASSED]"
 */
export function formatCountdown(tcaIso: string, nowMs = Date.now()): string {
  const target = new Date(tcaIso).getTime();
  if (isNaN(target)) return "TCA UNKNOWN";

  const diff = target - nowMs;
  if (diff <= 0) {
    const elapsed = Math.abs(diff);
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    return `T+${hours}h ${minutes}m [PAST]`;
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `T-${hours > 0 ? `${hours}h ` : ""}${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Formats a distance in kilometers or meters.
 * e.g. 0.347 -> "347 m"
 * e.g. 1.25 -> "1.25 km"
 */
export function formatDistance(distKm: number): string {
  if (distKm < 1.0) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(2)} km`;
}

/**
 * Formats velocity in km/s.
 * e.g. 14.8 -> "14.80 km/s"
 */
export function formatVelocity(velKmS: number): string {
  return `${velKmS.toFixed(2)} km/s`;
}
