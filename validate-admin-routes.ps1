$routes = @(
    "/admin",
    "/admin/investors",
    "/admin/investors/applications",
    "/admin/investor-documents",
    "/admin/messages",
    "/admin/inquiries",
    "/admin/ownership",
    "/admin/ownership/offerings",
    "/admin/ownership/transfers",
    "/admin/ownership/inheritance",
    "/admin/profit-distributions",
    "/admin/financials",
    "/admin/financials/periods",
    "/admin/financials/kpis",
    "/admin/financials/reports",
    "/admin/documents",
    "/admin/documents/verification",
    "/admin/data-room",
    "/admin/portal",
    "/admin/portal/pages",
    "/admin/portal/hero",
    "/admin/portal/navigation",
    "/admin/portal/cta",
    "/admin/portal/faq",
    "/admin/portal/media",
    "/admin/portal/documents",
    "/admin/company-profile",
    "/admin/administrators",
    "/admin/roles",
    "/admin/settings",
    "/admin/audit-logs"
)

Write-Host "`n===== ADMIN ROUTE VALIDATION =====" -ForegroundColor Cyan

$missing = @()

foreach ($route in $routes) {

    $relative = $route.TrimStart("/") -replace "/", "\"

    $page = Join-Path "." "src\app\(admin)\$relative\page.tsx"

    if (Test-Path -LiteralPath $page) {
        Write-Host "PASS  $route" -ForegroundColor Green
    }
    else {
        Write-Host "MISS  $route" -ForegroundColor Red
        $missing += $route
    }
}

Write-Host "`n===== SUMMARY =====" -ForegroundColor Yellow
Write-Host "Total routes : $($routes.Count)"
Write-Host "Missing      : $($missing.Count)"

if ($missing.Count -gt 0) {
    Write-Host "`nMissing routes:" -ForegroundColor Red
    $missing | ForEach-Object {
        Write-Host " - $_" -ForegroundColor Red
    }

    throw "Masih ada route admin yang benar-benar belum memiliki page.tsx."
}

Write-Host "`nPASS: Semua route sidebar memiliki page.tsx" -ForegroundColor Green
