CREATE TABLE IF NOT EXISTS users (
    name TEXT PRIMARY KEY,
    secret TEXT NOT NULL,

    public TEXT,
    public_expiry TIMESTAMPTZ,

    close_friends TEXT,
    close_friends_expiry TIMESTAMPTZ,

    close_friends_list TEXT[] NOT NULL DEFAULT '{}'
);
