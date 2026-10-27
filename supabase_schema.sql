-- AuraSME PostgreSQL Schema for Supabase
-- Aligned with UAE DHA / DOH healthcare & group quoting compliance

-- 1. SME Companies & Accounts
CREATE TABLE IF NOT EXISTS sme_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  trade_license TEXT NOT NULL UNIQUE,
  jurisdiction TEXT NOT NULL DEFAULT 'Dubai (DHA)', -- 'Dubai (DHA)' | 'Abu Dhabi (DOH)' | 'Northern Emirates (MOHAP)'
  zone_type TEXT NOT NULL DEFAULT 'Freezone',       -- 'Freezone' | 'Mainland'
  industry TEXT NOT NULL DEFAULT 'General Commerce',
  hr_contact_name TEXT,
  hr_contact_email TEXT,
  hr_contact_phone TEXT,
  salesforce_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SME Employee Censuses & Members
CREATE TABLE IF NOT EXISTS census_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES sme_companies(id) ON DELETE CASCADE,
  member_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  emirates_id TEXT,
  date_of_birth DATE,
  gender CHAR(1) CHECK (gender IN ('M', 'F')),
  relationship TEXT CHECK (relationship IN ('Principal', 'Spouse', 'Child')),
  salary_band TEXT CHECK (salary_band IN ('Band A (>AED 20k)', 'Band B (AED 10-20k)', 'Band C (<AED 10k/Basic)')),
  underwriting_status TEXT DEFAULT 'auto-cleared' CHECK (underwriting_status IN ('auto-cleared', 'flagged-review', 'underwriter-desk')),
  risk_category TEXT DEFAULT 'low' CHECK (risk_category IN ('low', 'moderate', 'high')),
  validation_issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Living Quotes & Versions
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL, -- e.g. CIG-UAE-2025-8841
  company_id UUID REFERENCES sme_companies(id) ON DELETE CASCADE,
  active_version_number INT DEFAULT 1,
  current_status TEXT DEFAULT 'ready' CHECK (current_status IN ('draft', 'review', 'ready', 'underwriting', 'bound', 'declined')),
  salesforce_opportunity_id TEXT,
  salesforce_sync_status TEXT DEFAULT 'synced' CHECK (salesforce_sync_status IN ('synced', 'pending', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quote Version Snapshots (Diff history)
CREATE TABLE IF NOT EXISTS quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  version_code TEXT NOT NULL, -- e.g. V1, V2, V3
  network_tier TEXT NOT NULL DEFAULT 'Comprehensive', -- 'Essential' | 'Comprehensive' | 'Premier Global'
  copay_percentage INT NOT NULL DEFAULT 10,
  pharmacy_limit INT NOT NULL DEFAULT 3000,
  include_dental BOOLEAN DEFAULT TRUE,
  include_optical BOOLEAN DEFAULT FALSE,
  include_maternity BOOLEAN DEFAULT TRUE,
  wellness_rider BOOLEAN DEFAULT TRUE,
  total_lives INT NOT NULL,
  principal_count INT NOT NULL,
  dependant_count INT NOT NULL,
  annual_premium_aed NUMERIC(12, 2) NOT NULL,
  monthly_per_life_aed NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_by TEXT DEFAULT 'Tariq Al-Mansoor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security (RLS) Enablement
ALTER TABLE sme_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE census_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_versions ENABLE ROW LEVEL SECURITY;

-- Permissive public read for demo sandbox
CREATE POLICY "Public read sme_companies" ON sme_companies FOR SELECT USING (true);
CREATE POLICY "Public read census_members" ON census_members FOR SELECT USING (true);
CREATE POLICY "Public read quotes" ON quotes FOR SELECT USING (true);
CREATE POLICY "Public read quote_versions" ON quote_versions FOR SELECT USING (true);
