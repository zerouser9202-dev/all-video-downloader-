#!/usr/bin/env bash

curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp
chmod +x yt-dlp

curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o ffmpeg.tar.xz
tar -xf ffmpeg.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg ./ffmpeg
chmod +x ffmpeg
