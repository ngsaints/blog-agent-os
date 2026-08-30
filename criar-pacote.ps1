# ==============================================================================
# Script para gerar pacote ZIP de distribuição limpa do Blog Agent OS
# Executa de forma 100% segura excluindo chaves privadas (.env) e bancos locais (.db)
# ==============================================================================

param (
    [string]$Version
)

# Se não foi informada a versão por parâmetro, tenta obter do package.json
if (-not $Version) {
    if (Test-Path "package.json") {
        try {
            $packageJson = Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($packageJson.version) {
                $Version = "v" + $packageJson.version
            }
        } catch {
            # Silenciosamente ignora falhas de leitura
        }
    }
}

# Se ainda assim não houver versão (fallback)
if (-not $Version) {
    $Version = "v0.1.0"
}

# Lista branca de arquivos e pastas para o pacote de distribuição
$filesToZip = @(
    "src",
    "docs",
    "tests",
    "main.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.node.json",
    "deno.json",
    "deno.lock",
    "README.md",
    "CLI-API.md",
    ".gitignore",
    ".env.example"
)

# Nome do arquivo ZIP de destino dinâmico com a versão
$zipName = "Blog Agent OS - $Version.zip"

# Resolve os caminhos absolutos apenas dos arquivos/pastas existentes
$paths = $filesToZip | Where-Object { Test-Path $_ } | ForEach-Object { (Resolve-Path $_).Path }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Iniciando empacotamento seguro do Blog Agent OS ($Version)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Verificando proteção de dados..." -ForegroundColor Gray
Write-Host " [OK] Chaves privadas (.env) EXCLUÍDAS" -ForegroundColor Green
Write-Host " [OK] Banco de dados local (data/*.db) EXCLUÍDO" -ForegroundColor Green
Write-Host " [OK] Pasta node_modules EXCLUÍDA" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

# Remove o arquivo ZIP existente se houver
if (Test-Path $zipName) {
    Write-Host "Removendo pacote anterior ($zipName)..." -ForegroundColor Yellow
    Remove-Item $zipName -Force
}

# Comprime os arquivos selecionados
try {
    Compress-Archive -Path $paths -DestinationPath $zipName -Force
    $fileInfo = Get-Item $zipName
    $sizeMb = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "`nSucesso! Pacote '$zipName' ($sizeMb MB) criado com segurança na raiz do projeto." -ForegroundColor Green
    Write-Host "Pronto para compartilhamento e distribuição!" -ForegroundColor Cyan
} catch {
    Write-Host "`nErro ao compactar arquivos: $_" -ForegroundColor Red
}
