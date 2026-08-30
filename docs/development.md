# Guia de desenvolvimento e resolução de "mudou mas não mudou"

## O problema

Alterações no código-fonte (`src/`) **não aparecem** no painel porque o servidor mantém o código antigo em memória. Isso **não é cache do navegador**.

| Comando | Recarrega ao salvar? | Quando usar |
|---------|----------------------|-------------|
| `npm run dev` | **Sim** (watch) | Desenvolvimento |
| `npm start` | **Não** | Produção local |

O `npm start` executa `tsx --env-file=.env main.ts` (sem `--watch`): o processo carrega os módulos uma única vez e qualquer edição exige **reinício manual** do servidor.

## Como evitar

Durante o desenvolvimento, use sempre:

```bash
npm run dev
```

O tsx watch reinicia o processo ao salvar `*.ts`, e a próxima atualização da página já traz o código novo.

## Se já estiver rodando com `npm start`

### 1. Descobrir como o servidor foi iniciado

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "tsx|main.ts" } | Select-Object ProcessId, CommandLine
```

A presença de `--watch` na linha de comando indica watch. Sem ele, é necessário reiniciar.

### 2. Reiniciar o servidor

```powershell
# 1) Encerrar o processo (troque o PID pelo encontrado acima)
Stop-Process -Id <PID> -Force

# 2) Subir de novo
npm run dev
```

### 3. Confirmar que o código novo está no ar

Verifique se a mudança está presente no HTML servido (evita "achei que era cache"):

```powershell
$r = Invoke-WebRequest -Uri "http://localhost:8000/admin?tab=database" -UseBasicParsing -MaximumRedirection 5
$r.Content.Contains("table-stack")   # True = código novo; False = servidor antigo
```

## Dica final

O painel é renderizado no servidor (HTML + CSS embutido). Não existe cache de CSS em separado: se o navegador estiver mostrando CSS antigo, a causa é 99% o servidor sem watch. Se ainda assim houver dúvida, force a atualização sem cache com `Ctrl+F5` (Windows) — mas o reinício do servidor vem **antes**.