export function downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = String(row[key] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapePdf(text: string) {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function downloadPdf(filename: string, title: string, lines: string[]) {
  const wrapped: string[] = [title, ""];
  for (const line of lines) {
    const chunks = line.match(/.{1,90}/g) ?? [line];
    wrapped.push(...chunks);
  }
  const pageHeight = 842;
  const pages: string[][] = [];
  let current: string[] = [];
  for (const line of wrapped) {
    if (current.length >= 48) {
      pages.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) pages.push(current);

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${kids}] >> endobj`);
  pages.forEach((pageLines, index) => {
    const pageNum = 3 + index * 2;
    const contentNum = pageNum + 1;
    const content = pageLines
      .map((line, lineIndex) => `BT /F1 10 Tf 40 ${pageHeight - 50 - lineIndex * 14} Td (${escapePdf(line)}) Tj ET`)
      .join("\n");
    objects.push(
      `${pageNum} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentNum} 0 R >> endobj`
    );
    objects.push(`${contentNum} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`);
  });
  const fontNum = 3 + pages.length * 2;
  objects.push(`${fontNum} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let offset = 0;
  const header = "%PDF-1.4\n";
  const offsets = [0];
  let body = header;
  offset = header.length;
  objects.forEach((object) => {
    offsets.push(offset);
    const chunk = object + "\n";
    body += chunk;
    offset += chunk.length;
  });
  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const blob = new Blob([body + xref + trailer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
