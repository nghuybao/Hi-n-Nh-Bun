# Hiên Nhà Bun: máy chủ nhỏ chỉ chạy trên máy này (127.0.0.1), không mở ra mạng ngoài.
# Dùng khi cần nhạc YouTube: YouTube chỉ cho phát nhúng khi trang có địa chỉ http.
param([int]$Port = 5173, [string]$Root = (Split-Path -Parent $PSScriptRoot), [switch]$Open)
$url = "http://localhost:$Port/"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch {
  # Cổng đã có người dùng: có thể Hiên Nhà Bun đang chạy sẵn, chỉ cần mở trình duyệt
  if ($Open) { Start-Process $url }
  exit
}
Write-Host "Hien Nha Bun dang chay tai $url  (dong cua so nay de tat)"
if ($Open) { Start-Process $url }
$mime = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon' }
$rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream(); $stream.ReadTimeout = 3000
    $reader = New-Object System.IO.StreamReader($stream)
    $line = $reader.ReadLine()
    while (($h = $reader.ReadLine()) -ne $null -and $h -ne '') { }
    if ($line -match '^GET\s+(\S+)') {
      $path = [System.Uri]::UnescapeDataString(($matches[1] -split '\?')[0])
      if ($path -eq '/') { $path = '/index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull ($path.TrimStart('/') -replace '/', '\')))
      $ok = $full.StartsWith($rootFull) -and (Test-Path -LiteralPath $full -PathType Leaf) -and ($full.IndexOf('\.git\') -lt 0)
      if ($ok) {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $ct = $mime[[System.IO.Path]::GetExtension($full).ToLower()]; if (-not $ct) { $ct = 'application/octet-stream' }
        $head = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
      } else {
        $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
        $head = "HTTP/1.1 404 Not Found`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      }
      $hb = [Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length); $stream.Write($bytes, 0, $bytes.Length); $stream.Flush()
    }
  } catch { Write-Host "Loi: $($_.Exception.Message)" } finally { $client.Close() }
}
