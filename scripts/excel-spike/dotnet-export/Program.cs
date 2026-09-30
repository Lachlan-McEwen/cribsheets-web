using System.Drawing;
using System.Text.Json;
using OfficeOpenXml;
using OfficeOpenXml.Drawing;

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage: DotNetExport <cells.json> <output.xlsm> <base.xlsm> [signature.png]");
    return 1;
}

var cellsPath = Path.GetFullPath(args[0]);
var outputPath = Path.GetFullPath(args[1]);
var basePath = Path.GetFullPath(args[2]);
string? signaturePath = args.Length >= 4 ? Path.GetFullPath(args[3]) : null;

if (!File.Exists(cellsPath))
{
    Console.Error.WriteLine($"Fixture not found: {cellsPath}");
    return 1;
}

if (!File.Exists(basePath))
{
    Console.Error.WriteLine($"Base workbook not found: {basePath}");
    return 1;
}

if (signaturePath != null && !File.Exists(signaturePath))
{
    Console.Error.WriteLine($"Signature PNG not found: {signaturePath}");
    return 1;
}

var json = await File.ReadAllTextAsync(cellsPath);
var cells = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)
    ?? new Dictionary<string, JsonElement>();

Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
var workPath = Path.Combine(Path.GetDirectoryName(outputPath)!, $".{Path.GetFileName(outputPath)}.work.xlsm");
File.Copy(basePath, workPath, true);

ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

using (var package = new ExcelPackage(new FileInfo(workPath)))
{
    // Permanent staff data sheet — legacy Worksheets[0] (casual would be [1]).
    var sheet = package.Workbook.Worksheets[0];
    if (sheet == null)
    {
        Console.Error.WriteLine("Worksheet index 0 not found.");
        return 1;
    }

    foreach (var (address, element) in cells)
    {
        sheet.Cells[address].Value = JsonElementToObject(element);
    }

    if (cells.TryGetValue("AA8", out var aa8))
    {
        package.Workbook.Worksheets.First().Cells["AA8"].Value = JsonElementToObject(aa8);
        sheet.Cells["AA8"].Value = JsonElementToObject(aa8);
    }

    if (signaturePath != null)
    {
        AddSignatureImage(sheet, signaturePath);
    }

    package.Save();
}

try
{
    File.Move(workPath, outputPath, true);
}
catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
{
    Console.Error.WriteLine($"Could not replace {outputPath} (close it in Excel). Saved to: {workPath}");
    Console.Error.WriteLine(ex.Message);
    return 2;
}

Console.WriteLine($"Wrote {outputPath}");
return 0;

static void AddSignatureImage(ExcelWorksheet sheet, string imagePath)
{
    AddImage(sheet, 36, 1, imagePath);
}

// SpreadSheetUpdater.cs — same indices and sizing.
static void AddImage(ExcelWorksheet oSheet, int rowIndex, int colIndex, string imagePath)
{
    int height;
    int width;

    using (var image = new Bitmap(imagePath))
    {
        if (image == null) return;
        height = image.Height;
        width = image.Width;
    }

    using ExcelPicture excelImage = oSheet.Drawings.AddPicture("Signature", new FileInfo(imagePath));
    excelImage.From.Column = colIndex;
    excelImage.From.Row = rowIndex;
    excelImage.SetSize((int)(width * (82d / height)), 82);
    excelImage.From.ColumnOff = Pixel2Mtu(2);
    excelImage.From.RowOff = Pixel2Mtu(2);
}

static int Pixel2Mtu(int pixels) => pixels * 9525;

static object? JsonElementToObject(JsonElement element)
{
    return element.ValueKind switch
    {
        JsonValueKind.String => element.GetString(),
        JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => null,
        _ => element.ToString(),
    };
}
