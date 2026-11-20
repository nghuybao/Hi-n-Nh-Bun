# Hiên Nhà Bun: máy chủ nhỏ chỉ chạy trên máy này (127.0.0.1), không mở ra mạng ngoài.
# Dùng khi cần nhạc YouTube: YouTube chỉ cho phát nhúng khi trang có địa chỉ http.
# /api/config: đọc config.local.json (nếu có) để thử đăng nhập trên máy; không có thì chỉ dùng chế độ khách.
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
$mime = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.mp3' = 'audio/mpeg' }
$rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
$localCfg = Join-Path $rootFull 'config.local.json'
# Kho dữ liệu của backend giả lập (chỉ dùng khi config.local.json có "mock": true, để kiểm thử trên máy)
$mockDb = Join-Path ([System.IO.Path]::GetTempPath()) 'hien-nha-bun-mockdb.json'
function Get-Mock { if (Test-Path -LiteralPath $localCfg) { try { return [bool]((Get-Content -LiteralPath $localCfg -Raw -Encoding UTF8 | ConvertFrom-Json).mock) } catch { } } return $false }
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream(); $stream.ReadTimeout = 3000
    $reader = New-Object System.IO.StreamReader($stream)
    $line = $reader.ReadLine()
    $len = 0
    while (($h = $reader.ReadLine()) -ne $null -and $h -ne '') { if ($h -match '^Content-Length:\s*(\d+)') { $len = [int]$matches[1] } }
    $status = '200 OK'; $ct = 'application/json; charset=utf-8'; $bytes = $null
    if ($line -match '^(GET|PUT)\s+(\S+)') {
      $verb = $matches[1]
      $path = [System.Uri]::UnescapeDataString(($matches[2] -split '\?')[0])
      if ($path -eq '/') { $path = '/index.html' }
      if ($path -eq '/api/config') {
        $body = '{"enabled":false}'
        if (Test-Path -LiteralPath $localCfg) { $body = Get-Content -LiteralPath $localCfg -Raw -Encoding UTF8 }
        $bytes = [Text.Encoding]::UTF8.GetBytes($body)
      } elseif ($path -eq '/__mock/db' -and (Get-Mock)) {
        # Thân yêu cầu được máy khách mã hóa chỉ gồm ký tự ASCII, nên số ký tự bằng số byte
        if ($verb -eq 'PUT') {
          $buf = New-Object char[] $len; $got = 0
          while ($got -lt $len) { $n = $reader.Read($buf, $got, $len - $got); if ($n -le 0) { break }; $got += $n }
          [System.IO.File]::WriteAllText($mockDb, (New-Object string($buf, 0, $got)))
          $bytes = [Text.Encoding]::UTF8.GetBytes('{"ok":true}')
        } else {
          $body = '{}'; if (Test-Path -LiteralPath $mockDb) { $body = [System.IO.File]::ReadAllText($mockDb) }
          $bytes = [Text.Encoding]::UTF8.GetBytes($body)
        }
      } elseif ($verb -eq 'GET') {
        $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull ($path.TrimStart('/') -replace '/', '\')))
        $ok = $full.StartsWith($rootFull) -and (Test-Path -LiteralPath $full -PathType Leaf) -and ($full.IndexOf('\.git\') -lt 0)
        if ($ok) {
          $bytes = [System.IO.File]::ReadAllBytes($full)
          $ct = $mime[[System.IO.Path]::GetExtension($full).ToLower()]; if (-not $ct) { $ct = 'application/octet-stream' }
        }
      }
      if ($bytes -eq $null) { $status = '404 Not Found'; $ct = 'text/plain'; $bytes = [Text.Encoding]::UTF8.GetBytes('Not found') }
      $head = "HTTP/1.1 $status`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
      $hb = [Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($hb, 0, $hb.Length); $stream.Write($bytes, 0, $bytes.Length); $stream.Flush()
    }
  } catch { Write-Host "Loi: $($_.Exception.Message)" } finally { $client.Close() }
}
