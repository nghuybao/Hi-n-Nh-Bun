@echo off
rem Mo Hien Nha Bun qua may chu nho tren chinh may nay (can cho nhac YouTube).
start "Hien Nha Bun" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port 5173 -Open
