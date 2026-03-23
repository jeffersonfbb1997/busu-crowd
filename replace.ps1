$filePath = 'index.html'
$content = Get-Content $filePath -Raw

# Replacement for admin-views-container
$placeholder = @'
            <div id="admin-views-container">
                <!-- Admin views will be moved here -->
            </div>
'@

$newContent = Get-Content 'replacement.html' -Raw

$content = $content.Replace($placeholder, $newContent)

# Delete dashboard content lines 1864-1905 (note line numbers may have shifted after previous replacement)
# We'll use regex to find the block
$patternDashboard = '(?s)<div class="row g-2 mb-3">.*?<\/div>\s*<div class="mb-4 text-center">.*?<\/div>\s*<!-- Live Monitor and Health Metrics -->.*?<\/div>\s*<\/div>\s*<\/div>'
$content = $content -replace $patternDashboard, ''

# Delete admin views block (from <!-- CRUD LINHAS --> to the closing div of view-admin-settings)
$patternAdminViews = '(?s)<!-- CRUD LINHAS -->.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>'
$content = $content -replace $patternAdminViews, ''

# Write back
Set-Content $filePath $content -Encoding UTF8
Write-Output 'Replacements done'