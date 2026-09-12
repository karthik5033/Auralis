// Auralis Orbital Mission Control - Complete Domain Mock Datasets

export interface MockFIR {
  id: string;
  fir_number: string; // Conjunction / Event Identifier e.g. CJ-142
  station_id: string;
  station_name: string; // Orbital Shell e.g. LEO-550 Shell
  district: string; // Orbital Regime e.g. Low Earth Orbit
  district_id?: string;
  crime_type_en: string; // Event Type e.g. Close Approach / Conjunction
  crime_type_kn: string;
  date: string;
  timestamp?: string;
  status_en: string; // Under Assessment, Maneuver Scheduled, Resolved
  status_kn: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  location: {
    lat: number;
    lng: number;
    address: string; // Orbital coordinates: Alt, Inc, RAAN
  };
  description: string;
  suspects_count: number; // Secondary objects count
}

export interface MockCase {
  id: string;
  case_no: string; // e.g. CJ-142
  title: string;
  status: "Active" | "Under Investigation" | "Charge-sheeted" | "Closed" | "Pending Trial";
  firs: string[];
  fir_count: number;
  primary_crime_type: string;
  primary_district: string;
  latest_date: string;
  summary: string;
  lead_investigator: string; // Autonomous Negotiating Agent
  priority: "High" | "Critical" | "Medium" | "Low";
  miss_distance?: string;
  collision_probability?: string;
  tca?: string;
  primary_object?: string;
  secondary_object?: string;
  delta_v?: string;
}

export interface MockPerson {
  id: string;
  full_name: string; // Object Name e.g. Starlink-4821
  name?: string; // alias for full_name
  aliases: string[]; // NORAD ID, COSPAR ID
  gender: "Male" | "Female" | "Other";
  age: number; // Orbital Age (years in orbit)
  primary_crime_category: string; // Object Classification (Payload, Debris)
  primary_crime?: string; // Object Classification alias
  district: string; // Operator / Launch State
  fir_count: number; // Conjunction encounters count
  associated_cases_count: number;
  risk_score: number; // Kessler Collision Threat Score (0-100)
  watchlist: boolean;
  notes: string;
  status?: string;
  active_warrants?: number;
  associates_count?: number;
  last_spotted?: string;
  is_repeat_offender?: boolean;
  norad_id: number;
  apogee_km: number;
  perigee_km: number;
  inclination_deg: number;
  rcs: string;
  maneuverable: boolean;
}

export interface MockAlert {
  id: string;
  title: string;
  district: string; // Orbital Shell
  confidence: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  time_detected: string;
  timestamp?: string; // alias for time_detected
  predicted_escalation_window: string;
  recommended_actions: string[];
  recommended_action?: string; // alias
  suggested_patrol_sector: string;
  category?: string;
  location?: string;
  description?: string;
  status?: string;
  tca?: string;
  miss_distance_m?: number;
  collision_prob?: string;
}

export interface MockAuditLog {
  id: string;
  user_id: string;
  user_role: string;
  role?: string; // alias
  user_name?: string;
  action?: string;
  resource?: string;
  status?: string;
  event_type: "SEARCH" | "EXPORT" | "ROLE_CHANGE" | "REASONING" | "ALERT" | "EVIDENCE_VIEW" | "MANEUVER_NEGOTIATION";
  timestamp: string;
  ip_address: string;
  details: Record<string, any>;
  integrity_hash?: string;
}

export interface MockFinancialTx {
  id: string;
  tx_id?: string; // alias for id
  from_account: string; // Operator / Satellite
  to_account: string; // Propellant Tank / Delta-V Reserve
  sender_name?: string;
  sender_account?: string;
  receiver_name?: string;
  receiver_account?: string;
  amount: number; // Delta-V in m/s (or fuel kg)
  timestamp: string;
  type: "UPI" | "NEFT" | "RTGS" | "CASH" | "DELTA_V_AVOIDANCE" | "STATION_KEEPING";
  flow_pattern?: string;
  risk_level?: string;
  flagged: boolean;
  flag_reason?: string;
  operator?: string;
  satellite?: string;
  fuel_burn_kg?: number;
}

// -------------------------------------------------------------
// Core Datasets
// -------------------------------------------------------------

export const MOCK_DASHBOARD_STATS = {
  activeInvestigations: 37, // Active Conjunctions (PRD: 37)
  personsOfInterest: "8,412", // Tracked Objects (PRD: 8,412)
  highRiskAlerts: 5, // High-Risk Alerts (PRD: 5)
  resolutionRate: "91.3%", // Maneuvers Resolved (PRD: 91.3%)
  propagationAccuracy: "98.1%", // Propagation Accuracy (PRD: 98.1%)
  threatIndex: "ELEVATED" // Cascade Threat Index (Nominal / Elevated / Critical)
};

export const MOCK_FIRS: MockFIR[] = [
  {
    id: "evt-01",
    fir_number: "CJ-142",
    station_id: "SHELL-550",
    station_name: "LEO 550km Starlink Shell",
    district: "Low Earth Orbit (LEO)",
    crime_type_en: "Critical Conjunction",
    crime_type_kn: "ಕಕ್ಷೀಯ ಘರ್ಷಣೆ ಎಚ್ಚರಿಕೆ",
    date: "2026-09-12 18:24 UTC",
    status_en: "Maneuver Agreed",
    status_kn: "ಪರಿಹಾರವಾಗಿದೆ",
    severity: "CRITICAL",
    location: {
      lat: 53.2,
      lng: -12.4,
      address: "Alt: 550.2 km | Rel Vel: 14.82 km/s | Miss: 48 m"
    },
    description: "Starlink-4821 (NORAD 52109) close approach with Cosmos-2251 Debris (NORAD 34120). Probability of collision Pc = 3.8e-4.",
    suspects_count: 2
  },
  {
    id: "evt-02",
    fir_number: "CJ-108",
    station_id: "SHELL-750",
    station_name: "LEO 780km Iridium Shell",
    district: "Sun-Synchronous Orbit (SSO)",
    crime_type_en: "High-Risk Approach",
    crime_type_kn: "ತೀವ್ರ ಸಾಮೀಪ್ಯ",
    date: "2026-09-12 17:15 UTC",
    status_en: "Autonomous Negotiation",
    status_kn: "ಮಧ್ಯಸ್ಥಿಕೆ ಪ್ರಗತಿಯಲ್ಲಿದೆ",
    severity: "HIGH",
    location: {
      lat: 82.1,
      lng: 145.8,
      address: "Alt: 782.4 km | Rel Vel: 13.91 km/s | Miss: 112 m"
    },
    description: "Sentinel-2A (NORAD 40697) crossing path with SL-16 Rocket Body fragment (NORAD 22444). Yield protocol initiated.",
    suspects_count: 2
  },
  {
    id: "evt-03",
    fir_number: "CJ-219",
    station_id: "SHELL-1200",
    station_name: "LEO 1200km OneWeb Shell",
    district: "Polar LEO",
    crime_type_en: "Secondary Debris Cluster",
    crime_type_kn: "ಅವಶೇಷಗಳ ಮೋಡ",
    date: "2026-09-12 15:40 UTC",
    status_en: "Yield Confirmed",
    status_kn: "ದೃಢೀಕರಿಸಲಾಗಿದೆ",
    severity: "MEDIUM",
    location: {
      lat: -45.6,
      lng: 78.2,
      address: "Alt: 1198.0 km | Rel Vel: 11.24 km/s | Miss: 340 m"
    },
    description: "OneWeb-0142 (NORAD 45132) planned prograde impulse (+0.14 m/s Δv) to clear Fengyun-1C track.",
    suspects_count: 1
  },
  {
    id: "evt-04",
    fir_number: "CJ-087",
    station_id: "SHELL-400",
    station_name: "LEO 420km ISS Corridor",
    district: "Equatorial LEO",
    crime_type_en: "Debris Sweep",
    crime_type_kn: "ಅವಶೇಷ ನಿಷ್ಕ್ರಿಯತೆ",
    date: "2026-09-12 14:02 UTC",
    status_en: "Cleared",
    status_kn: "ಮುಕ್ತಾಯಗೊಂಡಿದೆ",
    severity: "LOW",
    location: {
      lat: 12.8,
      lng: -45.1,
      address: "Alt: 418.6 km | Rel Vel: 7.68 km/s | Miss: 1,820 m"
    },
    description: "ISS orbital path safe clearance verified by NASA Flight Dynamics & Auralis SGP4 propagator.",
    suspects_count: 1
  }
];

export const MOCK_CASES: MockCase[] = [
  {
    id: "CJ-142",
    case_no: "CJ-142",
    title: "Starlink-4821 vs Cosmos-2251 Debris",
    status: "Active",
    firs: ["evt-01"],
    fir_count: 1,
    primary_crime_type: "Conjunction (Critical)",
    primary_district: "LEO-550 Shell",
    latest_date: "2026-09-12",
    summary: "Critical close-approach detected across 550 km orbital shell. Space-Track TLE propagation indicates miss distance 48m, Pc = 3.8e-4. Autonomous agent negotiation resulted in Starlink Agent scheduling 0.22 m/s retrograde burn at T-4h.",
    lead_investigator: "Auralis Collision Agent (Operator A)",
    priority: "Critical",
    miss_distance: "48 meters",
    collision_probability: "3.8e-4 (Critical)",
    tca: "2026-09-13T04:18:22Z",
    primary_object: "Starlink-4821 (NORAD 52109)",
    secondary_object: "Cosmos-2251 Debris (NORAD 34120)",
    delta_v: "0.22 m/s"
  },
  {
    id: "CJ-108",
    case_no: "CJ-108",
    title: "Sentinel-2A vs SL-16 Rocket Upper Stage",
    status: "Under Investigation",
    firs: ["evt-02"],
    fir_count: 1,
    primary_crime_type: "Conjunction (High Risk)",
    primary_district: "SSO-780 Shell",
    latest_date: "2026-09-12",
    summary: "ESA Sentinel-2A orbital intersection with defunct Zenit SL-16 spent rocket body. Relative velocity exceeds 13.9 km/s. Secondary object non-maneuverable, requiring Sentinel-2A thruster firing.",
    lead_investigator: "ESA Flight Dynamics Agent",
    priority: "High",
    miss_distance: "112 meters",
    collision_probability: "1.4e-4",
    tca: "2026-09-13T08:45:10Z",
    primary_object: "Sentinel-2A (NORAD 40697)",
    secondary_object: "SL-16 R/B (NORAD 22444)",
    delta_v: "0.18 m/s"
  },
  {
    id: "CJ-219",
    case_no: "CJ-219",
    title: "OneWeb-0142 vs Fengyun-1C Fragment",
    status: "Closed",
    firs: ["evt-03"],
    fir_count: 1,
    primary_crime_type: "Avoidance Resolved",
    primary_district: "Polar LEO-1200",
    latest_date: "2026-09-11",
    summary: "Successful electric propulsion burn executed. OneWeb-0142 altitude adjusted by +180m radial separation, increasing miss distance from 340m to 4.2km. Risk neutralized.",
    lead_investigator: "OneWeb Autonomous Constellation Lead",
    priority: "Medium",
    miss_distance: "4,200 meters (post-burn)",
    collision_probability: "1.2e-7 (Nominal)",
    tca: "2026-09-12T11:20:00Z",
    primary_object: "OneWeb-0142 (NORAD 45132)",
    secondary_object: "Fengyun-1C Debris (NORAD 29841)",
    delta_v: "0.14 m/s"
  },
  {
    id: "CJ-305",
    case_no: "CJ-305",
    title: "NOAA-20 vs Orbital Debris Fragment #8821",
    status: "Active",
    firs: ["evt-04"],
    fir_count: 1,
    primary_crime_type: "Conjunction (Watch)",
    primary_district: "SSO-824 Shell",
    latest_date: "2026-09-12",
    summary: "Small RCS fragment crossing NOAA weather monitoring track. Covariance matrix error ellipsoid is under refinement with additional optical radar tracking from Maui Station.",
    lead_investigator: "NOAA/NASA Joint Flight Ops",
    priority: "High",
    miss_distance: "185 meters",
    collision_probability: "8.9e-5",
    tca: "2026-09-13T14:10:05Z",
    primary_object: "NOAA-20 (NORAD 43013)",
    secondary_object: "Debris Fragment #8821 (NORAD 48821)",
    delta_v: "0.09 m/s"
  }
];

export const MOCK_PERSONS: MockPerson[] = [
  {
    id: "OBJ-52109",
    full_name: "Starlink-4821",
    aliases: ["NORAD 52109", "2022-048A"],
    gender: "Other",
    age: 2,
    primary_crime_category: "Active Satellite (Constellation)",
    district: "SpaceX / USA",
    fir_count: 8,
    associated_cases_count: 3,
    risk_score: 42,
    watchlist: true,
    notes: "Equipped with autonomous Hall-effect krypton thrusters. Capable of automated collision avoidance maneuvers.",
    norad_id: 52109,
    apogee_km: 552.4,
    perigee_km: 548.1,
    inclination_deg: 53.2,
    rcs: "Medium (0.1-1.0m²)",
    maneuverable: true
  },
  {
    id: "OBJ-34120",
    full_name: "Cosmos-2251 Debris (Fragment CL-42)",
    aliases: ["NORAD 34120", "1993-036KW"],
    gender: "Other",
    age: 15,
    primary_crime_category: "Lethal Non-Trackable Debris",
    district: "Russian Space Forces / Inactive",
    fir_count: 14,
    associated_cases_count: 6,
    risk_score: 89,
    watchlist: true,
    notes: "High-velocity hypervelocity kinetic risk fragment generated in the 2009 Iridium-Cosmos collision. Non-maneuverable.",
    norad_id: 34120,
    apogee_km: 790.2,
    perigee_km: 520.8,
    inclination_deg: 74.0,
    rcs: "Small (<0.1m²)",
    maneuverable: false
  },
  {
    id: "OBJ-40697",
    full_name: "Sentinel-2A",
    aliases: ["NORAD 40697", "2015-028A"],
    gender: "Other",
    age: 9,
    primary_crime_category: "Active Earth Observation Payload",
    district: "ESA / European Union",
    fir_count: 6,
    associated_cases_count: 2,
    risk_score: 28,
    watchlist: false,
    notes: "Monopropellant hydrazine thruster propulsion. Managed under Copernicus mission flight operations.",
    norad_id: 40697,
    apogee_km: 786.1,
    perigee_km: 784.8,
    inclination_deg: 98.5,
    rcs: "Large (>1.0m²)",
    maneuverable: true
  },
  {
    id: "OBJ-22444",
    full_name: "Zenit SL-16 Rocket Upper Stage",
    aliases: ["NORAD 22444", "1993-016B"],
    gender: "Other",
    age: 31,
    primary_crime_category: "Massive Rocket Body (Derelict)",
    district: "State Space Agency / Derelict",
    fir_count: 24,
    associated_cases_count: 9,
    risk_score: 96,
    watchlist: true,
    notes: "Mass: ~9,000 kg. High catastrophic break-up potential upon hypervelocity impact. Highest tier Kessler cascade catalyst.",
    norad_id: 22444,
    apogee_km: 842.0,
    perigee_km: 835.5,
    inclination_deg: 71.0,
    rcs: "Large (>1.0m²)",
    maneuverable: false
  },
  {
    id: "OBJ-45132",
    full_name: "OneWeb-0142",
    aliases: ["NORAD 45132", "2020-008B"],
    gender: "Other",
    age: 4,
    primary_crime_category: "Active Satellite (Broadband)",
    district: "OneWeb / UK",
    fir_count: 5,
    associated_cases_count: 2,
    risk_score: 34,
    watchlist: false,
    notes: "Ion plasma propulsion system. Operates in polar orbit at 1,200 km.",
    norad_id: 45132,
    apogee_km: 1201.2,
    perigee_km: 1199.4,
    inclination_deg: 87.4,
    rcs: "Medium (0.1-1.0m²)",
    maneuverable: true
  },
  {
    id: "OBJ-25544",
    full_name: "International Space Station (ISS)",
    aliases: ["NORAD 25544", "1998-067A"],
    gender: "Other",
    age: 26,
    primary_crime_category: "Crewed Space Habitat",
    district: "International Partnership (NASA/ESA/JAXA/CSA)",
    fir_count: 18,
    associated_cases_count: 4,
    risk_score: 15,
    watchlist: true,
    notes: "Mass: ~450,000 kg. Pressurized habitable volume. Predefined Debris Avoidance Maneuver (DAM) yellow/red threshold protocol.",
    norad_id: 25544,
    apogee_km: 421.5,
    perigee_km: 416.8,
    inclination_deg: 51.6,
    rcs: "Large (>1.0m²)",
    maneuverable: true
  }
];

export const MOCK_ALERTS: MockAlert[] = [
  {
    id: "alt-01",
    title: "Critical Conjunction: Starlink-4821 vs Cosmos-2251",
    district: "LEO-550 Shell",
    confidence: 96.8,
    severity: "CRITICAL",
    time_detected: "12 mins ago",
    predicted_escalation_window: "TCA in T-11h 54m",
    recommended_actions: [
      "Confirm retrograde burn plan with SpaceX Flight Dynamics.",
      "Broadcast Conjunction Data Message (CDM) to 550km shell operators.",
      "Recalculate secondary conjunction risks along evasive trajectory."
    ],
    suggested_patrol_sector: "Shell LEO-550 (RAAN 142.4°)",
    tca: "2026-09-13 04:18:22 UTC",
    miss_distance_m: 48,
    collision_prob: "3.8e-4"
  },
  {
    id: "alt-02",
    title: "Kessler Cascade Density Spike",
    district: "LEO-780 Shell",
    confidence: 91.4,
    severity: "HIGH",
    time_detected: "45 mins ago",
    predicted_escalation_window: "Next 48 Hours",
    recommended_actions: [
      "Track SL-16 rocket body close approaches (5 near-misses detected).",
      "Run epidemiological SIR cascade propagation model.",
      "Coordinate precautionary altitude phasing for Sentinel-2A."
    ],
    suggested_patrol_sector: "Sun-Synchronous 780-800km Band",
    tca: "Continuous Monitoring",
    miss_distance_m: 112,
    collision_prob: "1.4e-4"
  },
  {
    id: "alt-03",
    title: "Uncoordinated Orbit Shift Detected: Sat-7",
    district: "LEO-600 Shell",
    confidence: 88.2,
    severity: "MEDIUM",
    time_detected: "2 hours ago",
    predicted_escalation_window: "T-24h",
    recommended_actions: [
      "Query operator telemetry for unscheduled delta-v burn.",
      "Re-fit TLE orbit propagation state vectors.",
      "Verify cross-track spacing with adjacent constellation nodes."
    ],
    suggested_patrol_sector: "LEO-600 Sector 4",
    tca: "2026-09-13 18:00:00 UTC",
    miss_distance_m: 320,
    collision_prob: "4.2e-5"
  }
];

export const MOCK_AUDIT_LOGS: MockAuditLog[] = [
  {
    id: "aud-001",
    user_id: "AGENT-SPACEX-04",
    user_role: "AUTONOMOUS_OPERATOR_AGENT",
    event_type: "MANEUVER_NEGOTIATION",
    timestamp: "2026-09-12 18:14:02 UTC",
    ip_address: "198.51.100.42 (Secure Enclave)",
    details: {
      action: "OFFER_YIELD_AGREEMENT",
      conjunction_id: "CJ-142",
      primary: "Starlink-4821",
      secondary: "Cosmos-2251 Debris",
      agreed_delta_v: "0.22 m/s",
      direction: "Retrograde",
      tca_target_clearance: "4.8 km"
    },
    integrity_hash: "0x7a8f9c1e4d3b2a5f6e8d0c1b3a5f7e9d"
  },
  {
    id: "aud-002",
    user_id: "AGENT-ESA-FLIGHT",
    user_role: "AUTONOMOUS_OPERATOR_AGENT",
    event_type: "MANEUVER_NEGOTIATION",
    timestamp: "2026-09-12 17:30:15 UTC",
    ip_address: "192.0.2.88 (ESA ESOC Gateway)",
    details: {
      action: "VERIFY_COLLISION_PROBABILITY",
      conjunction_id: "CJ-108",
      primary: "Sentinel-2A",
      bivariate_covariance_pc: "1.4e-4",
      action_taken: "Maneuver window scheduled for T-6h"
    },
    integrity_hash: "0x4b6d8e0a2c4e6f8a0b2d4f6e8a0c2e4b"
  },
  {
    id: "aud-003",
    user_id: "OP-4482",
    user_role: "OPERATOR",
    event_type: "SEARCH",
    timestamp: "2026-09-12 16:50:22 UTC",
    ip_address: "10.14.0.12",
    details: {
      action: "QUERY_CASCADE_MODEL",
      query: "Which shells are trending toward cascade?",
      returned_shells: ["LEO-750", "LEO-550"]
    },
    integrity_hash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
  }
];

export const MOCK_FINANCIAL_TX: MockFinancialTx[] = [
  {
    id: "FL-901",
    from_account: "Starlink Fleet (SpaceX)",
    to_account: "CJ-142 Evasive Burn",
    amount: 0.22, // Delta-V in m/s
    fuel_burn_kg: 0.18,
    operator: "SpaceX",
    satellite: "Starlink-4821",
    timestamp: "2026-09-12 18:14 UTC",
    type: "DELTA_V_AVOIDANCE",
    flagged: false,
    flag_reason: "Automated avoidance maneuver yield"
  },
  {
    id: "FL-902",
    from_account: "Copernicus Fleet (ESA)",
    to_account: "CJ-108 Collision Avoidance",
    amount: 0.18,
    fuel_burn_kg: 0.35,
    operator: "ESA",
    satellite: "Sentinel-2A",
    timestamp: "2026-09-12 17:30 UTC",
    type: "DELTA_V_AVOIDANCE",
    flagged: false,
    flag_reason: "Hydrazine thruster orbital phasing"
  },
  {
    id: "FL-903",
    from_account: "OneWeb Network",
    to_account: "CJ-219 Fengyun Debris Avoidance",
    amount: 0.14,
    fuel_burn_kg: 0.08,
    operator: "OneWeb",
    satellite: "OneWeb-0142",
    timestamp: "2026-09-12 15:40 UTC",
    type: "DELTA_V_AVOIDANCE",
    flagged: false,
    flag_reason: "Xenon ion pulse avoidance"
  },
  {
    id: "FL-904",
    from_account: "Unknown Operator",
    to_account: "Unscheduled Orbital Shift",
    amount: 1.45,
    fuel_burn_kg: 2.10,
    operator: "Commercial SAT-7",
    satellite: "Sat-7",
    timestamp: "2026-09-12 14:02 UTC",
    type: "DELTA_V_AVOIDANCE",
    flagged: true,
    flag_reason: "Uncoordinated high delta-v burn in populated shell"
  }
];

export const MOCK_NETWORK_GRAPH = {
  nodes: [
    { id: "SAT-52109", name: "Starlink-4821", label: "Starlink-4821", role: "Active Constellation Satellite", type: "ACTIVE_SATELLITE", degree: 5, risk: "MEDIUM" },
    { id: "DEB-34120", name: "Cosmos-2251 Debris", label: "Cosmos-2251 Debris", role: "Hypervelocity Kinetic Fragment", type: "LETHAL_DEBRIS", degree: 8, risk: "CRITICAL" },
    { id: "SAT-40697", name: "Sentinel-2A", label: "Sentinel-2A", role: "Earth Observation Payload", type: "ACTIVE_SATELLITE", degree: 4, risk: "LOW" },
    { id: "DEB-22444", name: "Zenit SL-16 Rocket Body", label: "Zenit SL-16 Rocket Body", role: "Derelict Upper Stage", type: "ROCKET_BODY", degree: 12, risk: "CRITICAL" },
    { id: "SAT-45132", name: "OneWeb-0142", label: "OneWeb-0142", role: "Polar Orbit Constellation", type: "ACTIVE_SATELLITE", degree: 3, risk: "LOW" },
    { id: "SHELL-550", name: "LEO-550 Shell", label: "LEO-550 Shell", role: "Mega-Constellation Altitude Band", type: "ORBITAL_SHELL", degree: 15, risk: "HIGH" },
    { id: "SHELL-780", name: "SSO-780 Shell", label: "SSO-780 Shell", role: "Congested Polar Altitude Band", type: "ORBITAL_SHELL", degree: 22, risk: "CRITICAL" }
  ],
  links: [
    { source: "SAT-52109", target: "DEB-34120", relationship: "Conjunction Pairing", type: "conjunction_pairing", weight: 0.95, strength: 0.95 },
    { source: "SAT-52109", target: "SHELL-550", relationship: "Shell Resident", type: "shell_resident", weight: 0.8, strength: 0.8 },
    { source: "SAT-40697", target: "DEB-22444", relationship: "Conjunction Pairing", type: "conjunction_pairing", weight: 0.88, strength: 0.88 },
    { source: "SAT-40697", target: "SHELL-780", relationship: "Shell Resident", type: "shell_resident", weight: 0.85, strength: 0.85 },
    { source: "DEB-22444", target: "SHELL-780", relationship: "Shell Resident", type: "shell_resident", weight: 0.95, strength: 0.95 }
  ]
};
