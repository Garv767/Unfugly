@echo off
title Unfugly - Academia Session Inspector (HAR & JSONL)
cd /d "%~dp0\unfugly-backend"
echo =======================================================================
echo          UNFUGLY ACADEMIA SESSION & TRAFFIC INSPECTOR
echo =======================================================================
echo  - Launches Microsoft Edge with full traffic recording enabled
echo  - Saves full HAR to: academia.srmist.edu.in.har
echo  - Streams network entries to: scratch\network_traffic.jsonl
echo.
echo  Instructions:
echo   1. Log into SRM Academia when Edge opens.
echo   2. Test the concurrent sessions (preloader warning / termination gate).
echo   3. When done, simply CLOSE the Edge browser window.
echo =======================================================================
echo.
node scratch/interactive_inspector.js academia
echo.
echo Inspector has stopped.
pause
