# Simulación de Webhook de WhatsApp (Meta)
# Ejecuta este comando en PowerShell para probar sin usar Meta.

# 1. Prueba de Verificación (Handshake) - Debe retornar "12345" y status 200
Write-Host "Probando Verificación..."
Invoke-WebRequest -Uri "http://localhost:3001/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=cge_secret_123&hub.challenge=12345" -Method Get -UseBasicParsing

# 2. Prueba de Mensaje Entrante - Debe crear un Ticket
Write-Host "`nProbando Mensaje Entrante..."
$body = @{
    object = "whatsapp_business_account"
    entry  = @(
        @{
            id      = "215589313241560883"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata          = @{
                            display_phone_number = "15551797781"
                            phone_number_id      = "7794189252778687"
                        }
                        contacts          = @(
                            @{
                                profile = @{ name = "Jessica Laverdetman" }
                                wa_id   = "13557825698"
                            }
                        )
                        messages          = @(
                            @{
                                from      = "5491171483037"
                                id        = "wamid.HBgLMTc4NjM1NTk5NjYVAGHAYWYET688aASGNTI1QzZFQjhEMDk2QQA="
                                timestamp = "1758254144"
                                text      = @{ body = "Como descargo mi recibo de sueldo" }
                                type      = "text"
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "http://localhost:3001/api/webhooks/whatsapp" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
Write-Host "`nSi recibiste un 200 OK, revisa la consola del servidor para ver el ticket creado."
