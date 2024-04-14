import * as http from 'http';
import * as path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import express from 'express';
import { Server as SocketIO } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const options: string[] = [
    '-i',
    '-',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-r', `${25}`,
    '-g', `${25 * 2}`,
    '-keyint_min', '25',
    '-crf', '25',
    '-pix_fmt', 'yuv420p',
    '-sc_threshold', '0',
    '-profile:v', 'main',
    '-level', '3.1',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', (128000 / 4).toString(),
    '-f', 'flv',
    `rtmp://a.rtmp.youtube.com/live2/dcfx-m7v2-j248-3185-9207`,
];

const ffmpegProcess: ChildProcessWithoutNullStreams = spawn('ffmpeg', options);

ffmpegProcess.stdout.on('data', (data) => {
    console.log(`ffmpeg stdout: ${data}`);
});

ffmpegProcess.stderr.on('data', (data) => {
    console.error(`ffmpeg stderr: ${data}`);
});

ffmpegProcess.on('close', (code) => {
    console.log(`ffmpeg process exited with code ${code}`);
});

app.use(express.static(path.resolve('./public')));

io.on('connection', (socket) => {
    console.log('Socket Connected', socket.id);
    socket.on('binarystream', (stream: Buffer) => {
        console.log('Binary Stream Incoming...');
        ffmpegProcess.stdin.write(stream, (err) => {
            if (err) {
                console.log('Error writing to ffmpeg stdin:', err);
            }
        });
    });
});

server.listen(3000, () => console.log(`HTTP Server is running on PORT 3000`));
    