$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "docs\assets\hero-evidence-field.jpg"))) {
  $root = Get-Location
}
$assets = Join-Path $root "docs\assets"
$work = Join-Path $root "tmp\readme-video"
New-Item -ItemType Directory -Force -Path $work | Out-Null

function Make-Shot {
  param($src, $out, $zExpr, $xExpr, $yExpr)
  & ffmpeg -y -hide_banner -loglevel error -loop 1 -i $src `
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z=$zExpr`:x=$xExpr`:y=$yExpr`:d=180:s=1280x720:fps=30,format=yuv420p" `
    -t 6 -r 30 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart $out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg shot failed: $out" }
}

Make-Shot (Join-Path $assets "hero-evidence-field.jpg") (Join-Path $work "shot1.mp4") `
  "'min(1.0+0.0012*on,1.12)'" "'iw/2-(iw/zoom/2)'" "'ih/2-(ih/zoom/2)'"
Make-Shot (Join-Path $assets "instrument-gate.jpg") (Join-Path $work "shot2.mp4") `
  "'min(1.0+0.0014*on,1.14)'" "'iw/2-(iw/zoom/2)'" "'ih/2-(ih/zoom/2)-20'"
Make-Shot (Join-Path $assets "instrument-claw.jpg") (Join-Path $work "shot3.mp4") `
  "'min(1.04+0.0008*on,1.12)'" "'(iw-iw/zoom)*on/180'" "'ih/2-(ih/zoom/2)'"

@"
file 'shot1.mp4'
file 'shot2.mp4'
file 'shot3.mp4'
"@ | Set-Content -Encoding ascii (Join-Path $work "concat.txt")

$demoMp4 = Join-Path $assets "demo.mp4"
& ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i (Join-Path $work "concat.txt") -c copy $demoMp4
if ($LASTEXITCODE -ne 0) { throw "concat failed" }

$demoGif = Join-Path $assets "demo.gif"
& ffmpeg -y -hide_banner -loglevel error -i $demoMp4 `
  -vf "fps=8,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=40:stats_mode=single[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" `
  $demoGif
if ($LASTEXITCODE -ne 0) { throw "gif failed" }

$fontBold = "C\:/Windows/Fonts/segoeuib.ttf"
$fontReg = "C\:/Windows/Fonts/segoeui.ttf"
$vf = "scale=1280:640,drawtext=fontfile='$fontBold':text='TradeClaw':fontcolor=white:fontsize=64:x=72:y=236,drawtext=fontfile='$fontReg':text='Open-source trading research':fontcolor=0x34d399:fontsize=26:x=72:y=318"
& ffmpeg -y -hide_banner -loglevel error -i (Join-Path $assets "social-preview-base.jpg") -vf $vf -frames:v 1 (Join-Path $assets "social-preview.png")
if ($LASTEXITCODE -ne 0) { throw "social preview failed" }

Get-ChildItem $assets | Select-Object Name, Length | Format-Table -AutoSize
