"use client";

export interface ReceiptData {
  invoiceId: string;
  payee?: string;
  label?: string;
  memo?: string;
  amountZec: string;
  createdAt: number;
  status: string;
  txid: string | null;
  paidAt: string;
  network: string;
  detectedBy: string;
  usd?: string | null;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function receiptHtml(d: ReceiptData) {
  const rows: [string, string][] = [
    ["Receipt", d.invoiceId],
    ...(d.payee ? ([["Paid to", d.payee]] as [string, string][]) : []),
    ...(d.label ? ([["For", d.label]] as [string, string][]) : []),
    ["Amount", `${d.amountZec} ZEC${d.usd ? ` (about ${d.usd})` : ""}`],
    ["Network", `Zcash ${d.network} (shielded)`],
    ["Requested", new Date(d.createdAt).toUTCString()],
    ["Confirmed", new Date(d.paidAt).toUTCString()],
    ["Detected by", d.detectedBy],
    ...(d.txid ? ([["Transaction id", d.txid]] as [string, string][]) : []),
    ...(d.memo ? ([["Memo", d.memo]] as [string, string][]) : []),
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>ZecLink receipt ${esc(d.invoiceId)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#111}
h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;font-size:14px}
td:first-child{color:#666;width:40%}.f{color:#888;font-size:12px;margin-top:24px}</style></head><body>
<h1>⛨ ZecLink payment receipt</h1>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<p class="f">Shielded Zcash payment: sender, recipient and amount are encrypted on-chain. This receipt was generated in the browser and was not stored by ZecLink.</p>
</body></html>`;
}

/** Long ids get a middle ellipsis on screen. The full id is in the tooltip and the downloaded receipt. */
function shortId(id: string) {
  return id.length > 30 ? `${id.slice(0, 13)}…${id.slice(-14)}` : id;
}

export default function Receipt({ data }: { data: ReceiptData }) {
  const download = () => {
    const blob = new Blob([receiptHtml(data)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zeclink-receipt-${data.invoiceId}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="card print-area space-y-4" data-testid="receipt">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zec text-xl text-black">✓</span>
        <div>
          <p className="text-lg font-semibold">Payment confirmed</p>
          <p className="text-xs text-zinc-400">Receipt {data.invoiceId}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        {data.payee && (
          <>
            <dt className="text-zinc-500">Paid to</dt>
            <dd>{data.payee}</dd>
          </>
        )}
        {data.label && (
          <>
            <dt className="text-zinc-500">For</dt>
            <dd>{data.label}</dd>
          </>
        )}
        <dt className="text-zinc-500">Amount</dt>
        <dd className="font-mono">{data.amountZec} ZEC</dd>
        {data.usd && (
          <>
            <dt className="text-zinc-500">In USD</dt>
            <dd>≈ {data.usd}</dd>
          </>
        )}
        {data.memo && (
          <>
            <dt className="text-zinc-500">Memo</dt>
            <dd className="whitespace-pre-wrap break-words">{data.memo}</dd>
          </>
        )}
        <dt className="text-zinc-500">Network</dt>
        <dd>Zcash {data.network} · shielded</dd>
        <dt className="text-zinc-500">Confirmed</dt>
        <dd>{new Date(data.paidAt).toLocaleString()}</dd>
        <dt className="text-zinc-500">Detected by</dt>
        <dd>{data.detectedBy}</dd>
        {data.txid && (
          <>
            <dt className="text-zinc-500">Tx id</dt>
            <dd className="truncate font-mono text-xs" title={data.txid}>
              {shortId(data.txid)}
            </dd>
          </>
        )}
      </dl>
      <div className="no-print grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button className="btn-primary whitespace-nowrap" onClick={download}>
          Download receipt
        </button>
        <button className="btn-ghost whitespace-nowrap px-5" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
