"""Serve o painel só neste computador e converte o vídeo da urna para MP4."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import shutil
import subprocess
import tempfile
import webbrowser

ROOT = Path(__file__).resolve().parent
LIMIT = 250 * 1024 * 1024

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path.split('?', 1)[0] != '/api/video':
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0') or 0)
        except ValueError:
            self.send_error(400)
            return
        if length <= 0 or length > LIMIT:
            self.send_error(413 if length > LIMIT else 400)
            return
        data = self.rfile.read(length)
        ffmpeg = shutil.which('ffmpeg')
        if not ffmpeg:
            message = 'O ffmpeg não está disponível neste computador.'.encode('utf-8')
            self.send_response(501)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(message)))
            self.end_headers()
            self.wfile.write(message)
            return
        try:
            mp4 = convert(ffmpeg, data)
        except Exception as exc:
            message = str(exc).encode('utf-8', 'replace')
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', str(len(message)))
            self.end_headers()
            self.wfile.write(message)
            return
        self.send_response(200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Content-Length', str(len(mp4)))
        self.end_headers()
        self.wfile.write(mp4)

    def log_message(self, fmt, *args):
        print(fmt % args, flush=True)

def convert(ffmpeg, data):
    with tempfile.TemporaryDirectory() as folder:
        src = Path(folder) / 'urna.webm'
        dst = Path(folder) / 'urna.mp4'
        src.write_bytes(data)
        proc = subprocess.run(
            [ffmpeg, '-y', '-i', str(src), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
             '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '160k',
             '-movflags', '+faststart', str(dst)],
            capture_output=True)
        if proc.returncode != 0 or not dst.exists() or dst.stat().st_size == 0:
            err = proc.stderr.decode('utf-8', 'replace')[-800:]
            raise RuntimeError(err or 'O ffmpeg não gerou o MP4.')
        return dst.read_bytes()

def bind():
    for port in range(8765, 8776):
        try:
            return ThreadingHTTPServer(('127.0.0.1', port), Handler), port
        except OSError:
            continue
    raise SystemExit('Nenhuma porta livre entre 8765 e 8775.')

def main():
    server, port = bind()
    url = f'http://127.0.0.1:{port}/'
    print('Painel em', url, flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    main()
