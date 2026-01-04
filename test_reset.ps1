$payload = @{
    object = "whatsapp_business_account"
    entry  = @(
        @{
            changes = @(
                @{
                    value = @{
                        messages = @(
                            @{
                                from = "5491171483037"
                                text = @{ body = "/reset" }
                                type = "text"
                            }
                        )
                        contacts = @(
                            @{
                                profile = @{ name = "Enzo Test" }
                            }
                        )
                    }
                }
            )
        }
    )
}

$jsonPayload = $payload | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3001/api/webhooks/whatsapp" -Method Post -Body $jsonPayload -ContentType "application/json"
