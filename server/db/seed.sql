-- Seed initial settings and defaults

-- 1. Default settings
INSERT INTO settings (key, value) VALUES
('outreach_limits', '{
  "email_daily_limit": 100,
  "linkedin_daily_limit": 10,
  "instagram_daily_limit": 30
}'),
('email_signature', '{
  "signature": "Best regards,\\n\\nMuddassir Ali\\nFounder & CEO | Veloxis Global\\nmuddassir@veloxisglobal.com | +91-88876 20727\\nveloxisglobal.com"
}'),
('sending_schedule', '{
  "allowed_days": [1, 2, 3, 4, 5, 6],
  "start_hour": 9,
  "end_hour": 18,
  "batch_size": 10
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Seed Default Ideal Customer Profile (ICP)
INSERT INTO icps (name, industries, regions, company_sizes, pain_points, decision_makers) VALUES
('Veloxis High-Ticket ICP', 
 ARRAY['Education / Coaching', 'Real Estate', 'E-commerce', 'Gyms / Fitness'],
 ARRAY['India', 'USA', 'UK', 'Australia', 'Singapore'],
 ARRAY['Solo', '1-10', '10-50'],
 ARRAY['No website or terrible website', 'Not showing up on Google', 'Weak/no social media presence', 'Competitors ranking above them'],
 ARRAY['Founder', 'CEO', 'Owner', 'Co-Founder']
);

-- 3. Seed Sample Leads
INSERT INTO leads (name, company, email, phone, website, linkedin, instagram, country, city, industry, rating, status, lead_score, notes) VALUES
('Aravind Sharma', 'Sharma IIT Academy', 'aravind.sharma@sharmaiitacademy.in', '+91-98765-43210', 'https://sharmaiitacademy.in', 'https://linkedin.com/in/aravind-sharma-iit', 'sharma_iit_prep', 'India', 'Delhi', 'Education / Coaching', 4.5, 'New', 'Cold', 'Top test prep center in Delhi. Website takes 6.2s to load and has mobile layout bugs. Perfect target for Speed Optimization and Technical SEO.'),
('Jessica Miller', 'Miller Gyms & Wellness', 'jessica@millerwellness.com', '+1-555-0199', 'https://millerwellness.com', 'https://linkedin.com/in/jessica-miller-fit', 'miller_gyms', 'USA', 'New York', 'Gyms / Fitness', 4.2, 'New', 'Cold', 'Boutique gym in Brooklyn. Running Instagram ads but landing page does not have a pixel installed and SEO rankings are weak. Good target for full funnel optimization.'),
('Liam Chen', 'Chen Premium Teas', 'info@chenteas.com', '+65-6123-4567', 'https://chenteas.sg', 'https://linkedin.com/company/chen-teas', 'chenteas.sg', 'Singapore', 'Singapore', 'E-commerce', 4.8, 'New', 'Cold', 'Artisanal tea brand in Singapore. Beautiful website but DA is 3 and backlinks are 0. Needs SEO retainers and content marketing to drive organic sales.')
ON CONFLICT (email) DO NOTHING;
