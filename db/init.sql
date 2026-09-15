-- RAMGuard Database Initialization Script
-- Automatically executed when the PostgreSQL container is first initialized.

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Seed initial records
INSERT INTO items (name, description, category) VALUES
('Microservice Worker A', 'Background payment processor daemon', 'Services'),
('Redis Cache Cluster', 'In-memory cache for session management', 'Infrastructure'),
('Kafka Event Bus', 'High-throughput stream processing topic', 'Messaging'),
('Elasticsearch Ingest', 'Log pipeline ingestion worker', 'Logging'),
('Image Transcoder Pod', 'CPU & RAM intensive asset processor', 'Compute')
ON CONFLICT DO NOTHING;
