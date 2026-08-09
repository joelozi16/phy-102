$dir = 'C:/Users/USER/Documents/study'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$base = [System.IO.File]::ReadAllText((Join-Path $dir 'base.html'), $utf8)
$questions = [System.IO.File]::ReadAllText((Join-Path $dir 'questions.js'), $utf8)
$app = [System.IO.File]::ReadAllText((Join-Path $dir 'app.js'), $utf8)

if(-not $base.Contains('__SCRIPT__')){ Write-Output 'ERROR: placeholder not found'; exit 1 }

$scriptBlock = $questions + "`n" + $app
$combined = $base.Replace('__SCRIPT__', $scriptBlock)

[System.IO.File]::WriteAllText((Join-Path $dir 'index.html'), $combined, $utf8)
Write-Output ('Built. Size: ' + $combined.Length)
