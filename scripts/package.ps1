$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$out = Join-Path $project 'outputs'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$zip = Join-Path $out 'EcoRoute-AI.zip'
$i = 2
while (Test-Path -LiteralPath $zip) { $zip = Join-Path $out "EcoRoute-AI-$i.zip"; $i++ }
$stage = Join-Path $project ('work\package-' + [guid]::NewGuid().ToString('N'))
$top = Join-Path $stage 'EcoRoute-AI'
New-Item -ItemType Directory -Path $top | Out-Null
$excluded = @('\.venv\','\node_modules\','\dist\','\.pytest_cache\','\__pycache__\','\outputs\','\work\','\.git\')
Get-ChildItem -LiteralPath $project -Recurse -File -Force | Where-Object {
  $full = $_.FullName
  ($_.Extension -ne '.db') -and -not ($excluded | Where-Object { $full.Contains($_, [System.StringComparison]::OrdinalIgnoreCase) })
} | ForEach-Object {
  $relative = $_.FullName.Substring($project.Length).TrimStart('\')
  $target = Join-Path $top $relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Copy-Item -LiteralPath $_.FullName -Destination $target
}
Compress-Archive -Path $top -DestinationPath $zip
Get-Item -LiteralPath $zip | Select-Object FullName,Length
Remove-Item -LiteralPath $stage -Force -Recurse
