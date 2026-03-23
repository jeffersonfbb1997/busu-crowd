$filePath = 'index.html'
$content = Get-Content $filePath -Raw

# 1. Replace admin-views-container placeholder with new content
$placeholder = @'
            <div id="admin-views-container">
                <!-- Admin views will be moved here -->
            </div>
'@

$newContent = Get-Content 'replacement-clean.html' -Raw
$content = $content.Replace($placeholder, $newContent)

# 2. Delete the entire adminModal div (including its content) to avoid duplicate IDs
# Use regex to match from <div class="modal fade" id="adminModal" ...> to the corresponding closing </div>
# We'll use a simple approach: find the opening tag and then count nesting until we find the matching closing tag.
# This is complex; instead we can delete the block between lines 1850 and 2081 (original line numbers may have shifted)
# Since we just inserted content before the modal, line numbers increased but the modal block is still after that.
# We'll use regex that matches from the opening tag to the closing tag of the modal (assuming no other modal with same id).
$modalPattern = '(?s)<div class="modal fade" id="adminModal".*?<\/div>\s*<\/div>\s*<\/div>'
$content = $content -replace $modalPattern, ''

Set-Content $filePath $content -Encoding UTF8
Write-Output 'Admin views moved and modal removed'