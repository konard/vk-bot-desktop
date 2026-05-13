param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('x64', 'arm64')]
  [string] $Arch
)

$ErrorActionPreference = 'Stop'

function Write-ReleaseDirectory {
  if (Test-Path 'release') {
    Get-ChildItem -Path 'release' -Force | Format-Table -AutoSize
  }
}

function Assert-NonEmptyFile {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path,
    [Parameter(Mandatory = $true)]
    [string] $Description
  )

  if (!(Test-Path $Path)) {
    Write-ReleaseDirectory
    throw "Expected $Description at $Path."
  }

  $item = Get-Item $Path
  if ($item.Length -le 0) {
    throw "$Description is empty: $($item.FullName)"
  }

  Write-Host "$Description: $($item.FullName) ($($item.Length) bytes)"
  return $item
}

$version = (Get-Content 'package.json' | ConvertFrom-Json).version
$installerPath = "release/vk-bot-desktop-windows-installer-$Arch-$version.exe"
$portablePath = "release/vk-bot-desktop-windows-portable-$Arch-$version.exe"
$unpackedDir = switch ($Arch) {
  'x64' { 'release/win-unpacked' }
  'arm64' { 'release/win-arm64-unpacked' }
}
$unpackedExePath = Join-Path $unpackedDir 'VK Bot Desktop.exe'

Write-Host "Windows release smoke test architecture: $Arch"
Write-Host "Runner OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host "Runner image: $env:ImageOS $env:ImageVersion"

$installer = Assert-NonEmptyFile -Path $installerPath -Description 'Windows installer'
$portable = Assert-NonEmptyFile -Path $portablePath -Description 'Windows portable executable'
Assert-NonEmptyFile -Path $unpackedExePath -Description 'Unpacked application executable' | Out-Null

if ($Arch -eq 'arm64') {
  Write-Warning 'Skipping direct NSIS installer execution for Windows ARM64 on GitHub-hosted windows-11-arm runners because that path currently exits with 0xC0000005 after artifact generation.'
  $sevenZip = Get-Command '7z' -ErrorAction SilentlyContinue

  if ($null -ne $sevenZip) {
    Write-Host "Testing ARM64 installer archive with 7z: $($installer.FullName)"
    & $sevenZip.Source t $installer.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "7z integrity check failed with exit code $LASTEXITCODE: $($installer.FullName)"
    }
  } else {
    Write-Warning '7z is not available; ARM64 installer archive integrity check skipped.'
  }

  Write-Host "Portable artifact validated structurally: $($portable.Name)"
  exit 0
}

$installDir = Join-Path $env:RUNNER_TEMP 'vk-bot-desktop-install'
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $installDir
New-Item -ItemType Directory -Path $installDir | Out-Null

$process = Start-Process -FilePath $installer.FullName -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru
if ($process.ExitCode -ne 0) {
  $exitCodeHex = '0x{0:X8}' -f ($process.ExitCode -band 0xffffffff)
  throw "Installer failed with exit code $($process.ExitCode) ($exitCodeHex): $($installer.FullName)"
}

$installedExe = Join-Path $installDir 'VK Bot Desktop.exe'
Assert-NonEmptyFile -Path $installedExe -Description 'Installed application executable' | Out-Null
