[CmdletBinding()]
param (
    [string]$CsvPath = "usuarios_credenciales_envio.csv",
    [string]$TemplatePath = "scripts/plantilla_correo.html",
    [switch]$DryRun,
    [switch]$Force,
    [string]$TestEmail = "",
    [string]$WitnessEmail = "dieguezfrancisco@gmail.com",
    [string]$SmtpHost = "smtp.gmail.com",
    [int]$SmtpPort = 587,
    [string]$SmtpUser = "",
    [string]$SmtpPass = ""
)

if (-not (Test-Path $CsvPath)) {
    Write-Error "No se encontro el archivo CSV en: $CsvPath"
    exit 1
}

if (-not (Test-Path $TemplatePath)) {
    Write-Error "No se encontro la plantilla HTML en: $TemplatePath"
    exit 1
}

# Cargar automáticamente credenciales desde smtp_credentials.env si no se pasaron por parámetro
if (Test-Path "smtp_credentials.env") {
    Get-Content "smtp_credentials.env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            if ($key -eq "SMTP_USER" -and -not $SmtpUser) { $SmtpUser = $val }
            if ($key -eq "SMTP_PASS" -and -not $SmtpPass) { $SmtpPass = $val }
            if ($key -eq "SMTP_HOST" -and $SmtpHost -eq "smtp.gmail.com") { $SmtpHost = $val }
            if ($key -eq "SMTP_PORT" -and $SmtpPort -eq 587) { $SmtpPort = [int]$val }
        }
    }
}

$rawTemplate = Get-Content -Path $TemplatePath -Raw -Encoding utf8
$usuarios = Import-Csv -Path $CsvPath -Encoding utf8
Write-Host "Se cargaron $($usuarios.Count) usuarios desde '$CsvPath'." -ForegroundColor Cyan

function Render-Html {
    param ($Usuario)
    $html = $rawTemplate
    $html = $html.Replace("{{NOMBRE}}", [string]$Usuario.nombre)
    $html = $html.Replace("{{EMAIL}}", [string]$Usuario.email)
    $html = $html.Replace("{{PASSWORD}}", [string]$Usuario.password)
    $html = $html.Replace("{{ROL}}", [string]$Usuario.rol)
    $html = $html.Replace("{{ZONA}}", [string]$Usuario.zona)
    $html = $html.Replace("{{URL}}", [string]$Usuario.url)
    return $html
}

if ($DryRun) {
    Write-Host "`n--- MODO SIMULACION (DRY-RUN) ACTIVADO ---" -ForegroundColor Yellow
    foreach ($u in $usuarios) {
        Write-Host "Destinatario: $($u.nombre) <$($u.email)> | Rol: $($u.rol) | Clave: $($u.password)"
    }
    Write-Host "`nTotal simulado: $($usuarios.Count) correos preparados exitosamente." -ForegroundColor Green
    Write-Host "Para enviar correos reales, ejecuta sin -DryRun especificando -SmtpUser y -SmtpPass."
    return
}

if (-not $SmtpUser -or -not $SmtpPass) {
    Write-Error "Para realizar envios debes indicar -SmtpUser y -SmtpPass.`nEjemplo: .\scripts\Enviar-Credenciales.ps1 -SmtpUser 'emisor@gmail.com' -SmtpPass 'xxxx xxxx xxxx xxxx'"
    exit 1
}

function Send-SmtpMessageInternal {
    param ($ToEmail, $Subject, $HtmlContent)

    $smtpClient = New-Object System.Net.Mail.SmtpClient($SmtpHost, $SmtpPort)
    $smtpClient.EnableSsl = $true
    $smtpClient.Credentials = New-Object System.Net.NetworkCredential($SmtpUser, $SmtpPass)

    $mailMsg = New-Object System.Net.Mail.MailMessage
    $mailMsg.From = New-Object System.Net.Mail.MailAddress($SmtpUser, "Sistema SGP")
    $mailMsg.To.Add($ToEmail)
    $mailMsg.Subject = $Subject
    $mailMsg.Body = $HtmlContent
    $mailMsg.IsBodyHtml = $true

    $smtpClient.Send($mailMsg)
    $mailMsg.Dispose()
    $smtpClient.Dispose()
}

if ($TestEmail) {
    Write-Host "`nEnviando correo de prueba a: $TestEmail..." -ForegroundColor Cyan
    $testUser = [PSCustomObject]@{
        nombre = "Ing. Francisco Dieguez"
        email = $TestEmail
        password = "Demo_SGP_9kM2#"
        rol = "ADMINISTRADOR / SUPERVISOR GENERAL"
        zona = "SUPERVISION TOTAL"
        url = "https://solicitudes.ultrasoft.website"
    }
    $htmlTest = Render-Html -Usuario $testUser
    try {
        Send-SmtpMessageInternal -ToEmail $TestEmail -Subject "Acceso Oficial al Sistema de Gestion Politica (SGP) [PRUEBA]" -HtmlContent $htmlTest
        Write-Host "Correo de prueba enviado con exito a $TestEmail." -ForegroundColor Green
    } catch {
        Write-Error "Fallo el envio de prueba: $_"
    }
    return
}

if (-not $Force) {
    $confirm = Read-Host "Deseas enviar $($usuarios.Count) correos reales ahora? (s/n)"
    if ($confirm.ToLower() -ne "s") {
        Write-Host "Operacion cancelada." -ForegroundColor Yellow
        return
    }
}

$enviados = 0
$fallidos = 0
$i = 1
$logFile = "scripts/registro_envios_credenciales.log"
"=== REGISTRO DE DESPACHO OFICIAL DE CREDENCIALES SGP - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -FilePath $logFile -Encoding utf8

foreach ($u in $usuarios) {
    Write-Host "[$i/$($usuarios.Count)] Enviando a $($u.nombre) ($($u.email))... " -NoNewline
    $htmlBody = Render-Html -Usuario $u
    try {
        Send-SmtpMessageInternal -ToEmail $u.email -Subject "Acceso Oficial al Sistema de Gestion Politica (SGP)" -HtmlContent $htmlBody
        Write-Host "OK" -ForegroundColor Green
        "[$([DateTime]::Now.ToString('HH:mm:ss'))] OK: $($u.nombre) <$($u.email)> | Rol: $($u.rol)" | Out-File -FilePath $logFile -Append -Encoding utf8
        $enviados++
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        "[$([DateTime]::Now.ToString('HH:mm:ss'))] ERROR: $($u.nombre) <$($u.email)> | Error: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
        $fallidos++
    }

    # Despachar caso testigo para Francisco Dieguez cuando se procese a Juan Manuel Dieguez
    if ($u.email.ToLower() -eq "juanm.dieguez@gmail.com" -and $WitnessEmail) {
        Write-Host "    -> Enviando copia testigo de $($u.nombre) a $WitnessEmail... " -NoNewline
        try {
            Send-SmtpMessageInternal -ToEmail $WitnessEmail -Subject "Acceso Oficial al Sistema de Gestion Politica (SGP) [CASO TESTIGO: $($u.nombre)]" -HtmlContent $htmlBody
            Write-Host "OK (Testigo enviado)" -ForegroundColor Green
            "[$([DateTime]::Now.ToString('HH:mm:ss'))] TESTIGO ENVIADO: $($u.nombre) a $WitnessEmail" | Out-File -FilePath $logFile -Append -Encoding utf8
        } catch {
            Write-Host "ERROR EN TESTIGO: $_" -ForegroundColor Yellow
            "[$([DateTime]::Now.ToString('HH:mm:ss'))] TESTIGO ERROR: $WitnessEmail | Error: $_" | Out-File -FilePath $logFile -Append -Encoding utf8
        }
    }

    $i++
    Start-Sleep -Seconds 1
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "Proceso finalizado. Total enviados: $enviados | Fallidos: $fallidos" -ForegroundColor Cyan
Write-Host "Registro detallado guardado en: $logFile" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
