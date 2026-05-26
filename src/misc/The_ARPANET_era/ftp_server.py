import os
import socket
import socketserver
import time
from collections import deque
from datetime import datetime, timezone

AUTH_USERNAME = os.getenv("FTP_USERNAME", "Rebecca")
AUTH_PASSWORD = os.getenv("FTP_PASSWORD", "qwertyuiop")

FLAG_CONTENT = os.getenv("FLAG", "gaslightCTF{dev_flag}") + "\n"

CONTROL_BIND_HOST = os.getenv("FTP_BIND_HOST", "0.0.0.0")
CONTROL_PORT = int(os.getenv("FTP_PORT", "2121"))

PASV_ADVERTISED_HOST = os.getenv("PASV_ADVERTISED_HOST", "127.0.0.1")

PASV_PORT_MIN = int(os.getenv("PASV_PORT_MIN", "30000"))
PASV_PORT_MAX = int(os.getenv("PASV_PORT_MAX", "30100"))

SERVER_NAME = os.getenv("FTP_SERVER_NAME", "pyftpd/0.1")


MAX_CMDS_PER_WINDOW = 8
WINDOW_SECONDS = 3
MAX_SESSION_SECONDS = 120
MIN_CMD_INTERVAL = 0.15  # humans ok, bots fail



def _split_host_port(host: str, port: int):
    parts = host.split(".")
    octets = [int(p) for p in parts]
    p1, p2 = port // 256, port % 256
    return octets + [p1, p2]


class FTPSession:
    def __init__(self, handler):
        self.h = handler
        self.logged_in = False
        self.username = None
        self.type = None
        self.pasv_listener = None

        # --- anti-client tracking ---
        self.cmd_times = deque()
        self.last_cmd_time = 0
        self.start_time = time.time()



    def _detect_abuse(self):
        now = time.time()

        # total session lifetime cap
        if now - self.start_time > MAX_SESSION_SECONDS:
            self.send(421, "Session expired.")
            return True

        # inter-command spam detection
        if self.last_cmd_time and (now - self.last_cmd_time < MIN_CMD_INTERVAL):
            self.send(421, "Command rate too high.")
            return True

        self.last_cmd_time = now

        # sliding window burst detection
        self.cmd_times.append(now)

        while self.cmd_times and now - self.cmd_times[0] > WINDOW_SECONDS:
            self.cmd_times.popleft()

        if len(self.cmd_times) > MAX_CMDS_PER_WINDOW:
            self.send(421, "Too many commands. Slow down.")
            return True

        return False



    def send(self, code, msg):
        self.h.wfile.write(f"{code} {msg}\r\n".encode())
        self.h.wfile.flush()

    def send_raw(self, msg):
        self.h.wfile.write(msg.encode())
        self.h.wfile.flush()



    def require_login(self):
        if not self.logged_in:
            self.send(530, "Login required.")
            return False
        return True



    def close_pasv(self):
        if self.pasv_listener:
            try:
                self.pasv_listener.close()
            except:
                pass
        self.pasv_listener = None

    def open_pasv(self):
        self.close_pasv()
        for port in range(PASV_PORT_MIN, PASV_PORT_MAX):
            try:
                s = socket.socket()
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((CONTROL_BIND_HOST, port))
                s.listen(1)
                s.settimeout(10)
                self.pasv_listener = s
                host_bytes = _split_host_port(PASV_ADVERTISED_HOST, port)
                self.send(227, f"Entering Passive Mode ({','.join(map(str, host_bytes))}).")
                return
            except OSError:
                continue
        self.send(425, "No passive ports available.")

    def get_data_conn(self):
        if not self.pasv_listener:
            self.send(425, "Use PASV first.")
            return None
        try:
            conn, _ = self.pasv_listener.accept()
            conn.settimeout(10)
            return conn
        finally:
            self.close_pasv()



    def handle_list(self):
    	if not self.require_login():
        	return

    	self.send(150, "Here comes the directory listing.")

    	c = self.get_data_conn()
    	if not c:
        	return

    	try:
        	now = datetime.now(timezone.utc)

        	# Realistic UNIX-style FTP listing
        	line = (
        	    "-rw-r--r--   1 owner group        {:>8} {:>3} {:>2} {:>5} flag.txt\r\n"
        	    .format(
        	        len(FLAG_CONTENT.encode()),
        	        now.strftime("%b"),
        	        now.strftime("%d"),
        	        now.strftime("%H:%M"),
        	    )
        	)

        	c.sendall(line.encode())

        	self.send(226, "Directory send OK.")

    	finally:
    	    try:
    	        c.close()
    	    except:
        	    pass


    def handle_retr(self, arg):
        if not self.require_login():
            return

        if self.type not in ("A", "I"):
            self.send(503, "TYPE A or I required.")
            return

        if arg.strip() != "flag.txt":
            self.send(550, "Not found.")
            return

        self.send(150, "Opening data connection.")
        c = self.get_data_conn()
        if not c:
            return
        try:
            c.sendall(FLAG_CONTENT.encode())
            self.send(226, "OK")
        finally:
            c.close()


class FTPHandler(socketserver.StreamRequestHandler):

    def setup(self):
        super().setup()
        self.session = FTPSession(self)

    def handle(self):
        self.request.settimeout(300)
        self.session.send(220, f"{SERVER_NAME} ready.")

        while True:
            raw = self.rfile.readline(8192)
            if not raw:
                break

            if self.session._detect_abuse():
                break

            line = raw.decode(errors="ignore").strip()
            if not line:
                continue

            if " " in line:
                cmd, arg = line.split(" ", 1)
            else:
                cmd, arg = line, ""

            cmd = cmd.upper()



            if cmd == "USER":
                self.session.username = arg
                self.session.send(331, "OK")

            elif cmd == "PASS":
                if self.session.username == AUTH_USERNAME and arg == AUTH_PASSWORD:
                    self.session.logged_in = True
                    self.session.send(230, "OK")
                else:
                    self.session.send(530, "FAIL")

            elif cmd == "QUIT":
                self.session.send(221, "BYE")
                break



            elif cmd == "EPSV":
                self.session.send(502, "EPSV disabled.")

            elif cmd == "OPTS":
                self.session.send(502, "Not supported.")

            elif cmd == "UTF8":
                self.session.send(502, "Disabled.")

            elif cmd == "FEAT":
                self.session.send_raw("211-Features:\r\n PASV\r\n211 End\r\n")

            elif cmd == "HELP":
                self.session.send(214, "USER PASS TYPE A/I PASV LIST RETR")



            elif cmd == "TYPE":
                if arg.upper() in ("A", "I"):
                    self.session.type = arg.upper()
                    self.session.send(200, "OK")
                else:
                    self.session.send(504, "Bad TYPE")



            elif cmd == "PASV":
                if self.session.require_login():
                    self.session.open_pasv()



            elif cmd == "LIST":
                self.session.handle_list()

            elif cmd == "RETR":
                self.session.handle_retr(arg)



            elif cmd == "NOOP":
                self.session.send(200, "OK")

            elif cmd == "SYST":
                self.session.send(215, "UNIX")

            else:
                self.session.send(502, "Unknown command")

        self.session.close_pasv()

    def finish(self):
        try:
            self.session.close_pasv()
        finally:
            super().finish()


class ThreadedFTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    with ThreadedFTPServer((CONTROL_BIND_HOST, CONTROL_PORT), FTPHandler) as srv:
        print(f"Running on {CONTROL_PORT}")
        srv.serve_forever()


if __name__ == "__main__":
    main()
