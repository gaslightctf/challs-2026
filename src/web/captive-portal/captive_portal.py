import os
import sqlite3

from flask import Flask, g, redirect, render_template_string, request, url_for

DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "portal.db")
FLAG = os.environ.get("FLAG", "sql-1nj3ction-b4e6acb1a1159a1f8d69d766999d3af5")

app = Flask(__name__)

LOGIN_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Captive Portal - Wi-Fi Login</title>
    <style>
        body {
            font-family: -apple-system, Segoe UI, Roboto, sans-serif;
            background: #eef1f5;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            background: #fff;
            padding: 32px 36px;
            border-radius: 10px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.12);
            width: 320px;
        }
        h1 { font-size: 20px; margin: 0 0 4px 0; }
        p.sub { color: #666; margin: 0 0 20px 0; font-size: 13px; }
        label { display: block; font-size: 12px; color: #444; margin-bottom: 4px; }
        input[type=text], input[type=password] {
            width: 100%;
            padding: 8px 10px;
            margin-bottom: 14px;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 10px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
        }
        button:hover { background: #1d4ed8; }
        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 8px 10px;
            border-radius: 6px;
            font-size: 12px;
            margin-bottom: 14px;
            word-break: break-word;
        }
        .hint { margin-top: 18px; font-size: 11px; color: #999; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🛜 Captive Portal</h1>
        <p class="sub">Please sign in to access the guest network.</p>

        {% if error %}
        <div class="error">{{ error }}</div>
        {% endif %}

        <form method="POST" action="/login">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" autocomplete="off">

            <label for="password">Password</label>
            <input type="password" id="password" name="password" autocomplete="off">

            <button type="submit">Sign in</button>
        </form>

        <div class="hint">Guest account: guest / guestpass</div>
    </div>
</body>
</html>
"""

SUCCESS_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Captive Portal - Connected</title>
    <style>
        body {
            font-family: -apple-system, Segoe UI, Roboto, sans-serif;
            background: #eef1f5;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            background: #fff;
            padding: 32px 36px;
            border-radius: 10px;
            box-shadow: 0 4px 18px rgba(0,0,0,0.12);
            width: 380px;
            text-align: center;
        }
        h1 { font-size: 20px; margin-bottom: 6px; }
        p { color: #555; font-size: 14px; }
        .flag {
            margin-top: 18px;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 13px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="card">
        {% if flag %}
            <h1>✅ Connected as admin</h1>
            <p>Welcome back, {{ username }}. Full network access granted.</p>
            <div class="flag">{{ flag }}</div>
        {% else %}
            <h1>✅ Connected</h1>
            <p>Welcome, {{ username }}. You have guest-level access only.</p>
        {% endif %}
    </div>
</body>
</html>
"""


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    # Fresh DB every process start.
    if os.path.exists(DATABASE):
        os.remove(DATABASE)

    db = sqlite3.connect(DATABASE)
    db.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    db.execute(
        "INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)",
        ("guest", "guestpass", 0),
    )
    # Admin password is random/unknown to the player on purpose - the
    # intended solve path is an auth-bypass injection, not guessing or
    # cracking the password.
    db.execute(
        "INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)",
        ("admin", os.urandom(16).hex(), 1),
    )
    db.commit()
    db.close()


@app.route("/", methods=["GET"])
def index():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None

    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")

        query = (
            "SELECT * FROM users WHERE username = '"
            + username
            + "' AND password = '"
            + password
            + "'"
        )
        db = get_db()
        try:
            cursor = db.execute(query)
            user = cursor.fetchone()
        except sqlite3.Error as e:
            return render_template_string(LOGIN_HTML, error=f"SQL error: {e}")

        if user is None:
            error = "Invalid username or password."
        elif user["is_admin"]:
            return render_template_string(
                SUCCESS_HTML, flag=FLAG, username=user["username"]
            )
        else:
            return render_template_string(
                SUCCESS_HTML, flag=None, username=user["username"]
            )

    return render_template_string(LOGIN_HTML, error=error)


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
