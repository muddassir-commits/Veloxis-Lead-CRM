-- Veloxis Global Command Center Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist
DROP TABLE IF EXISTS email_tracking CASCADE;
DROP TABLE IF EXISTS sequence_history CASCADE;
DROP TABLE IF EXISTS sequences CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS icps CASCADE;

-- 1. Leads CRM Table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    website VARCHAR(555),
    linkedin VARCHAR(555),
    instagram VARCHAR(255),
    country VARCHAR(100) DEFAULT 'India',
    city VARCHAR(100),
    industry VARCHAR(100),
    rating NUMERIC(3,2),
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Researched', 'Contacted', 'Followed Up', 'Replied', 'Meeting', 'Proposal', 'Won', 'Lost')),
    lead_score VARCHAR(50) DEFAULT 'Cold' CHECK (lead_score IN ('Hot', 'Warm', 'Cold')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for quick search
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_score ON leads(lead_score);

-- 2. Outreach Templates
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Email', 'LinkedIn', 'Instagram')),
    subject VARCHAR(255), -- NULL for LinkedIn/Instagram
    body TEXT NOT NULL,
    variables TEXT[], -- e.g., ['name', 'company', 'industry']
    principle VARCHAR(255), -- e.g., 'Dream Outcome', 'Risk Reversal'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Active Sequences
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'Running' CHECK (status IN ('Running', 'Paused', 'Stopped', 'Completed', 'Replied')),
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_lead_sequence UNIQUE (lead_id)
);

-- 4. Sequence Send History
CREATE TABLE sequence_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    step INTEGER NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Sent',
    email_id UUID DEFAULT uuid_generate_v4() -- Unique tracker ID
);

CREATE INDEX idx_seq_history_email_id ON sequence_history(email_id);

-- 5. Email Open / Click Tracking
CREATE TABLE email_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    email_id UUID NOT NULL, -- references sequence_history(email_id)
    opens INTEGER DEFAULT 0,
    last_opened_at TIMESTAMP WITH TIME ZONE,
    ip_addresses VARCHAR(50)[],
    user_agents TEXT[],
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracking_email_id ON email_tracking(email_id);

-- 6. Settings Key-Value Store
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ICP (Ideal Customer Profile) Models
CREATE TABLE icps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industries TEXT[],
    regions TEXT[],
    company_sizes TEXT[],
    pain_points TEXT[],
    decision_makers TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
