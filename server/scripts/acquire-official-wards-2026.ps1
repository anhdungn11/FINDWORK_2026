# Read-only acquisition from the Statistics Office SOAP catalog. Writes a source artifact, never a database.
$ErrorActionPreference = 'Stop'
$uri = 'https://danhmuchanhchinh.nso.gov.vn/DMDVHC.asmx'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$provinceFile = Join-Path $root 'prisma\seed-data\vietnam-administrative-2026-10-16.json'
$outputFile = Join-Path $root 'prisma\seed-data\vietnam-wards-2026-10-24.json'
$provinces = (Get-Content -LiteralPath $provinceFile -Raw -Encoding UTF8 | ConvertFrom-Json).provinces
$provinceByCode = @{}
foreach ($province in $provinces) { $provinceByCode[$province.code] = $province }

function Get-OfficialRows([string]$date) {
  $body = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><DanhMucPhuongXa xmlns="http://tempuri.org/"><DenNgay>' + $date + '</DenNgay><Tinh></Tinh><TenTinh></TenTinh><QuanHuyen></QuanHuyen><TenQuanHuyen></TenQuanHuyen></DanhMucPhuongXa></soap:Body></soap:Envelope>'
  $response = Invoke-WebRequest -Uri $uri -Method Post -ContentType 'text/xml; charset=utf-8' -Headers @{ SOAPAction = '"http://tempuri.org/DanhMucPhuongXa"' } -Body $body -UseBasicParsing -TimeoutSec 90
  if ($response.StatusCode -ne 200) { throw "Official SOAP returned HTTP $($response.StatusCode)" }
  $stream = [IO.MemoryStream]::new()
  $response.RawContentStream.Position = 0
  $response.RawContentStream.CopyTo($stream)
  $bytes = $stream.ToArray()
  $hash = [Security.Cryptography.SHA256]::Create()
  $sourceHash = ([BitConverter]::ToString($hash.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  [xml]$xml = [Text.Encoding]::UTF8.GetString($bytes)
  $nodes = $xml.SelectNodes('//*[local-name()="DanhMucPhuongXaResult"]//*[local-name()="TABLE"]')
  $rows = [System.Collections.Generic.List[object]]::new()
  foreach ($node in $nodes) {
    $code = $node.SelectSingleNode('MaPhuongXa').InnerText
    $name = $node.SelectSingleNode('TenPhuongXa').InnerText
    $type = $node.SelectSingleNode('LoaiHinh').InnerText
    $provinceCode = $node.SelectSingleNode('MaTinh').InnerText
    $provinceName = $node.SelectSingleNode('TenTinh').InnerText
    $rows.Add([ordered]@{ code = $code; name = $name; divisionType = $type; provinceCode = $provinceCode; provinceName = $provinceName })
  }
  return @{ rows = $rows.ToArray(); sha256 = $sourceHash; byteSize = $bytes.Length; date = $date }
}

$old = Get-OfficialRows '01/07/2025'
$current = Get-OfficialRows '24/10/2026'
if ($old.rows.Count -ne 3321 -or $current.rows.Count -ne 3321) { throw 'Official ward coverage is not 3,321 rows at both dates' }
$oldByCode = @{}
foreach ($row in $old.rows) {
  if ($oldByCode.ContainsKey($row.code)) { throw "Duplicate 2025 code $($row.code)" }
  $oldByCode[$row.code] = $row
}
$currentByCode = @{}
$changed = [System.Collections.Generic.List[string]]::new()
$nameNormalized = [System.Collections.Generic.List[string]]::new()
$seenNames = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($row in $current.rows) {
  if ($currentByCode.ContainsKey($row.code)) { throw "Duplicate 2026 code $($row.code)" }
  $currentByCode[$row.code] = $row
  if ($row.code -notmatch '^\d{5}$' -or -not $provinceByCode.ContainsKey($row.provinceCode)) { throw "Invalid code or parent $($row.code)" }
  if ($row.provinceName -cne $provinceByCode[$row.provinceCode].name) { throw "Province name mismatch $($row.code)" }
  $prefix = $row.divisionType + ' '
  $normalizedRawName = $row.name.Normalize([Text.NormalizationForm]::FormC).Trim()
  if ($row.divisionType -notin @('Phường', 'Xã', 'Đặc khu') -or -not $normalizedRawName.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Invalid unit type/name $($row.code)" }
  if ($row.name -cne $normalizedRawName -or -not $normalizedRawName.StartsWith($prefix, [StringComparison]::Ordinal)) { $nameNormalized.Add($row.code) }
  $nameKey = $row.provinceCode + ':' + $normalizedRawName.ToLowerInvariant()
  if (-not $seenNames.Add($nameKey)) { throw "Duplicate ward name within province $($row.code)" }
  if (-not $oldByCode.ContainsKey($row.code)) { throw "New code not present at 2025 baseline $($row.code)" }
  $previous = $oldByCode[$row.code]
  if ($previous.provinceCode -ne $row.provinceCode -or $previous.name -cne $row.name -or $previous.divisionType -cne $row.divisionType) {
    $changed.Add($row.code)
  }
}
if ($oldByCode.Count -ne $currentByCode.Count) { throw 'Code coverage changed between snapshots' }
$dongNai = @('25270','25357','25363','26116','26170','26248','26326','26368','26425','26485')
$bacNinh = @('07294','07375','07399','07444','07840','09193','09292','09313','09319','09454','09475','09496')
$expectedChanges = @($dongNai + $bacNinh | Sort-Object)
$actualChanges = @($changed | Sort-Object)
if (($actualChanges -join ',') -cne ($expectedChanges -join ',')) { throw "Unexpected 2026 changes: $($actualChanges -join ',')" }

$wards = @($current.rows | Sort-Object { $_['code'] } | ForEach-Object {
  $source = if ($dongNai -contains $_.code) { 'resolution-237-2026' } elseif ($bacNinh -contains $_.code) { 'resolution-388-2026' } else { 'decision-19-2025' }
  $date = if ($source -eq 'resolution-237-2026') { '2026-04-30' } elseif ($source -eq 'resolution-388-2026') { '2026-09-20' } else { '2025-07-01' }
  $officialPrefix = $_.divisionType + ' '
  [ordered]@{
    code = $_.code
    name = ($officialPrefix + $_.name.Normalize([Text.NormalizationForm]::FormC).Trim().Substring($officialPrefix.Length))
    divisionType = @{ 'Phường' = 'ward'; 'Xã' = 'commune'; 'Đặc khu' = 'special-zone' }[$_.divisionType]
    provinceCode = $_.provinceCode
    effectiveDate = $date
    legalSourceId = $source
  }
})
$counts = [ordered]@{}
$expectedCounts = @{
  '01'=126; '04'=56; '08'=124; '11'=45; '12'=38; '14'=75; '15'=99; '19'=92; '20'=65
  '22'=54; '24'=99; '25'=148; '31'=114; '33'=104; '37'=129; '38'=166; '40'=130; '42'=69
  '44'=78; '46'=40; '48'=94; '51'=96; '52'=135; '56'=65; '66'=102; '68'=124; '75'=95
  '79'=168; '80'=96; '82'=102; '86'=124; '91'=102; '92'=103; '96'=64
}
foreach ($group in ($wards | Group-Object { $_['provinceCode'] } | Sort-Object Name)) {
  if (-not $expectedCounts.ContainsKey($group.Name) -or $expectedCounts[$group.Name] -ne $group.Count) {
    throw "Official 2026 province count mismatch for $($group.Name): $($group.Count)"
  }
  $counts[$group.Name] = $group.Count
}
if ($counts.Count -ne 34) { throw "Ward parent coverage is $($counts.Count), expected 34" }
$artifact = [ordered]@{
  version = 'vn-admin-wards-2026-10-24'
  asOf = '2026-10-24'
  provinceVersion = 'vn-admin-2026-10-16'
  expectedCount = 3321
  source = [ordered]@{
    authority = 'Cục Thống kê'
    endpoint = $uri
    operation = 'DanhMucPhuongXa'
    currentDateParameter = $current.date
    baselineDateParameter = $old.date
    currentXmlSha256 = $current.sha256
    baselineXmlSha256 = $old.sha256
    currentXmlBytes = $current.byteSize
    baselineXmlBytes = $old.byteSize
    registerUrl = 'https://danhmuchanhchinh.nso.gov.vn/Lich_Su_Moi.aspx'
    countsUrl = 'https://danhmuchanhchinh.nso.gov.vn/Tinh_tk_new.aspx'
  }
  sources = [ordered]@{
    'decision-19-2025' = [ordered]@{ url = 'https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160'; effectiveDate = '2025-07-01' }
    'resolution-237-2026' = [ordered]@{ url = 'https://vanban.chinhphu.vn/?classid=2&docid=217876&pageid=27160'; effectiveDate = '2026-04-30' }
    'resolution-388-2026' = [ordered]@{ url = 'https://congbao.chinhphu.vn/van-ban/nghi-quyet-so-388-nq-ubtvqh16-470313/67975.htm'; effectiveDate = '2026-09-20' }
  }
  countsByProvince = $counts
  changesSinceBaseline = [ordered]@{ changed = $actualChanges.Count; dongNai = $dongNai.Count; bacNinh = $bacNinh.Count; added = 0; removed = 0 }
  sourceNameNormalizationCodes = @($nameNormalized | Sort-Object)
  wards = $wards
}
$json = ConvertTo-Json -InputObject $artifact -Depth 12
[IO.File]::WriteAllText($outputFile, $json + "`n", [Text.UTF8Encoding]::new($false))
Write-Output ("Official ward source captured: 34 provinces, $($wards.Count) wards, $($actualChanges.Count) 2026 type changes; current SOAP SHA-256 $($current.sha256); artifact $outputFile")
